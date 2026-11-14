import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getAuthoritativeServerTime } from '../lib/chatTimestamp';
import {
  BlockedUserRecord,
  CookiePreferences,
  CopyrightClaim,
  LegalAcceptanceRecord,
  ModerationAppeal,
  ModerationAuditLog,
  ModerationReport,
  PolicyVersionMetadata,
  PrivacyRequest,
  UserProfile,
} from '../types';

const COOKIE_PREF_KEY = 'dellychow_cookie_preferences';

export function getSavedCookiePreferences(): CookiePreferences {
  try {
    const raw = localStorage.getItem(COOKIE_PREF_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        essential: true,
        functionalStorage: Boolean(parsed.functionalStorage ?? true),
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    }
  } catch {
    // ignore
  }
  return {
    essential: true,
    functionalStorage: true,
    updatedAt: new Date().toISOString(),
  };
}

export function saveLocalCookiePreferences(functionalStorage: boolean): CookiePreferences {
  const prefs: CookiePreferences = {
    essential: true,
    functionalStorage,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(COOKIE_PREF_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
  return prefs;
}

export const LegalService = {
  // Immutable backend record of legal consent acceptance / decline
  async createLegalAcceptanceRecord(
    record: Omit<LegalAcceptanceRecord, 'id'>
  ): Promise<{ id: string; persistedToAuditCollection: boolean }> {
    const ref = doc(collection(db, 'legal_acceptances'));
    const utcNow = await getAuthoritativeServerTime()
      .then((r) => r.utcIso)
      .catch(() => new Date().toISOString());

    const payload = {
      ...record,
      id: ref.id,
      acceptedAt: record.acceptedAt || utcNow,
      serverTimestamp: serverTimestamp(),
    };

    try {
      await setDoc(ref, payload);
      return { id: ref.id, persistedToAuditCollection: true };
    } catch (err: any) {
      console.warn(
        'legal_acceptances collection write skipped or blocked by rules (profile record still synced):',
        err?.code || err?.message
      );
      return { id: ref.id, persistedToAuditCollection: false };
    }
  },

  // Copyright & Creator Protection Claims
  async submitCopyrightClaim(
    claim: Omit<CopyrightClaim, 'id' | 'status' | 'createdAt'>
  ): Promise<{ id: string; syncedToCloud: boolean }> {
    const ref = doc(collection(db, 'copyright_claims'));
    const utcNow = await getAuthoritativeServerTime()
      .then((r) => r.utcIso)
      .catch(() => new Date().toISOString());

    const payload: CopyrightClaim = {
      ...claim,
      id: ref.id,
      status: 'submitted',
      createdAt: utcNow,
      updatedAt: utcNow,
    };

    try {
      await setDoc(ref, payload);
      return { id: ref.id, syncedToCloud: true };
    } catch (err: any) {
      console.warn('Copyright claim notice:', err?.code || err?.message);
      throw new Error(
        err?.message?.includes('permission') || err?.code === 'permission-denied'
          ? 'Firestore security rules update required for copyright_claims collection.'
          : err?.message || 'Failed to submit copyright claim.'
      );
    }
  },

  async submitCopyrightCounterNotice(
    claimId: string,
    counterNoticeText: string
  ): Promise<void> {
    const utcNow = await getAuthoritativeServerTime()
      .then((r) => r.utcIso)
      .catch(() => new Date().toISOString());
    await updateDoc(doc(db, 'copyright_claims', claimId), {
      counterNoticeText: counterNoticeText.trim(),
      counterNoticeAt: utcNow,
      status: 'counter_notice_submitted',
      updatedAt: utcNow,
    });
  },

  listenToMyCopyrightClaims(
    userId: string,
    callback: (claims: CopyrightClaim[]) => void
  ) {
    const q = query(
      collection(db, 'copyright_claims'),
      where('claimantUserId', '==', userId)
    );
    return onSnapshot(
      q,
      (snap) => {
        const items: CopyrightClaim[] = [];
        snap.forEach((d) => items.push({ ...(d.data() as CopyrightClaim), id: d.id }));
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(items);
      },
      (err) => {
        console.warn('listenToMyCopyrightClaims notice:', err?.code || err?.message);
        callback([]);
      }
    );
  },

  listenToAllCopyrightClaims(callback: (claims: CopyrightClaim[]) => void) {
    return onSnapshot(
      collection(db, 'copyright_claims'),
      (snap) => {
        const items: CopyrightClaim[] = [];
        snap.forEach((d) => items.push({ ...(d.data() as CopyrightClaim), id: d.id }));
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(items);
      },
      (err) => {
        console.warn('listenToAllCopyrightClaims notice:', err?.code || err?.message);
        callback([]);
      }
    );
  },

  // Unified Safety & Content Reporting
  async submitModerationReport(
    report: Omit<ModerationReport, 'id' | 'status' | 'createdAt'>
  ): Promise<{ id: string }> {
    const ref = doc(collection(db, 'moderation_reports'));
    const utcNow = await getAuthoritativeServerTime()
      .then((r) => r.utcIso)
      .catch(() => new Date().toISOString());

    const payload: ModerationReport = {
      ...report,
      id: ref.id,
      status: 'pending',
      createdAt: utcNow,
      updatedAt: utcNow,
    };

    try {
      await setDoc(ref, payload);
      return { id: ref.id };
    } catch (err: any) {
      // Fallback for community chat/safety reports if new rules are pending deploy
      if (err?.code === 'permission-denied') {
        const fallbackRef = doc(collection(db, 'community_reports'));
        await setDoc(fallbackRef, {
          id: fallbackRef.id,
          chefId: report.targetAuthorId || 'platform',
          messageId: report.targetId,
          messageText: `[${report.targetType}] ${report.targetTitle || report.targetId}: ${report.details}`,
          reportedBy: report.reporterId,
          reportedByUserId: report.reporterId,
          reportedByUserName: report.reporterName || 'User',
          reason: report.reason,
          status: 'pending',
          createdAt: utcNow,
        });
        return { id: fallbackRef.id };
      }
      throw err;
    }
  },

  listenToMyModerationReports(
    userId: string,
    callback: (reports: ModerationReport[]) => void
  ) {
    const q = query(
      collection(db, 'moderation_reports'),
      where('reporterId', '==', userId)
    );
    return onSnapshot(
      q,
      (snap) => {
        const items: ModerationReport[] = [];
        snap.forEach((d) => items.push({ ...(d.data() as ModerationReport), id: d.id }));
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(items);
      },
      (err) => {
        console.warn('listenToMyModerationReports notice:', err?.code || err?.message);
        callback([]);
      }
    );
  },

  listenToAllModerationReports(callback: (reports: ModerationReport[]) => void) {
    return onSnapshot(
      collection(db, 'moderation_reports'),
      (snap) => {
        const items: ModerationReport[] = [];
        snap.forEach((d) => items.push({ ...(d.data() as ModerationReport), id: d.id }));
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(items);
      },
      (err) => {
        console.warn('listenToAllModerationReports notice:', err?.code || err?.message);
        callback([]);
      }
    );
  },

  // Moderation Appeals
  async submitModerationAppeal(
    appeal: Omit<ModerationAppeal, 'id' | 'status' | 'createdAt'>
  ): Promise<string> {
    const ref = doc(collection(db, 'moderation_appeals'));
    const utcNow = await getAuthoritativeServerTime()
      .then((r) => r.utcIso)
      .catch(() => new Date().toISOString());

    await setDoc(ref, {
      ...appeal,
      id: ref.id,
      status: 'pending',
      createdAt: utcNow,
      updatedAt: utcNow,
    });
    return ref.id;
  },

  listenToMyAppeals(userId: string, callback: (appeals: ModerationAppeal[]) => void) {
    const q = query(collection(db, 'moderation_appeals'), where('userId', '==', userId));
    return onSnapshot(
      q,
      (snap) => {
        const items: ModerationAppeal[] = [];
        snap.forEach((d) => items.push({ ...(d.data() as ModerationAppeal), id: d.id }));
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(items);
      },
      () => callback([])
    );
  },

  listenToAllAppeals(callback: (appeals: ModerationAppeal[]) => void) {
    return onSnapshot(
      collection(db, 'moderation_appeals'),
      (snap) => {
        const items: ModerationAppeal[] = [];
        snap.forEach((d) => items.push({ ...(d.data() as ModerationAppeal), id: d.id }));
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(items);
      },
      () => callback([])
    );
  },

  // User Blocking Controls
  async blockUser(
    blockerId: string,
    blockedUserId: string,
    blockedUserName?: string,
    reason?: string
  ): Promise<BlockedUserRecord> {
    const docId = `${blockerId}_${blockedUserId}`.slice(0, 120);
    const utcNow = await getAuthoritativeServerTime()
      .then((r) => r.utcIso)
      .catch(() => new Date().toISOString());
    const record: BlockedUserRecord = {
      id: docId,
      blockerId,
      blockedUserId,
      blockedUserName: blockedUserName || 'User',
      reason: reason || 'User safety block',
      createdAt: utcNow,
    };

    try {
      await setDoc(doc(db, 'blocked_users', docId), record);
    } catch (err: any) {
      console.warn('blocked_users Firestore fallback:', err?.code || err?.message);
    }

    try {
      const cacheKey = `dellychow_blocked_${blockerId}`;
      const existing: BlockedUserRecord[] = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      const next = [record, ...existing.filter((b) => b.blockedUserId !== blockedUserId)];
      localStorage.setItem(cacheKey, JSON.stringify(next));
    } catch {}

    return record;
  },

  async unblockUser(blockerId: string, blockedUserId: string): Promise<void> {
    const docId = `${blockerId}_${blockedUserId}`.slice(0, 120);
    try {
      await deleteDoc(doc(db, 'blocked_users', docId));
    } catch (err: any) {
      console.warn('unblockUser Firestore notice:', err?.code || err?.message);
    }

    try {
      const cacheKey = `dellychow_blocked_${blockerId}`;
      const existing: BlockedUserRecord[] = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      localStorage.setItem(
        cacheKey,
        JSON.stringify(existing.filter((b) => b.blockedUserId !== blockedUserId))
      );
    } catch {}
  },

  listenToBlockedUsers(
    blockerId: string,
    callback: (records: BlockedUserRecord[]) => void
  ) {
    const cacheKey = `dellychow_blocked_${blockerId}`;
    try {
      const cached: BlockedUserRecord[] = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      if (cached.length > 0) callback(cached);
    } catch {}

    const q = query(collection(db, 'blocked_users'), where('blockerId', '==', blockerId));
    return onSnapshot(
      q,
      (snap) => {
        const items: BlockedUserRecord[] = [];
        snap.forEach((d) => items.push({ ...(d.data() as BlockedUserRecord), id: d.id }));
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        try {
          localStorage.setItem(cacheKey, JSON.stringify(items));
        } catch {}
        callback(items);
      },
      () => {
        // Retain cached blocked list if offline or rules pending
      }
    );
  },

  // Privacy & Account Deletion Requests (NDPA 2023 Rights)
  async submitPrivacyRequest(
    req: Omit<PrivacyRequest, 'id' | 'status' | 'createdAt'>
  ): Promise<{ id: string; syncedToCloud: boolean }> {
    const ref = doc(collection(db, 'privacy_requests'));
    const utcNow = await getAuthoritativeServerTime()
      .then((r) => r.utcIso)
      .catch(() => new Date().toISOString());

    const payload: PrivacyRequest = {
      ...req,
      id: ref.id,
      status: 'pending',
      createdAt: utcNow,
      updatedAt: utcNow,
    };

    try {
      await setDoc(ref, payload);
      if (req.requestType === 'account_deletion') {
        await updateDoc(doc(db, 'users', req.userId), {
          accountStatus: 'pending_deletion',
          updatedAt: utcNow,
        }).catch(() => {});
      }
      return { id: ref.id, syncedToCloud: true };
    } catch (err: any) {
      // Also create a support ticket fallback which is already open in existing rules so deletion requests are never lost!
      try {
        const ticketRef = doc(collection(db, 'support_tickets'));
        await setDoc(ticketRef, {
          id: ticketRef.id,
          userId: req.userId,
          name: req.userName,
          email: req.userEmail,
          topic: req.requestType,
          category: 'account',
          priority: req.requestType === 'account_deletion' ? 'high' : 'medium',
          subject: `[Privacy / ${req.requestType.toUpperCase()}] Request by ${req.userName}`,
          message: req.details,
          status: 'open',
          createdAt: utcNow,
          updatedAt: utcNow,
        });
        if (req.requestType === 'account_deletion') {
          await updateDoc(doc(db, 'users', req.userId), {
            accountStatus: 'pending_deletion',
            updatedAt: utcNow,
          }).catch(() => {});
        }
        return { id: ticketRef.id, syncedToCloud: true };
      } catch {
        throw err;
      }
    }
  },

  async cancelDeletionRequest(requestId: string, userId: string): Promise<void> {
    const utcNow = await getAuthoritativeServerTime()
      .then((r) => r.utcIso)
      .catch(() => new Date().toISOString());
    await updateDoc(doc(db, 'privacy_requests', requestId), {
      status: 'cancelled',
      updatedAt: utcNow,
    }).catch(() => {});
    await updateDoc(doc(db, 'users', userId), {
      accountStatus: 'active',
      updatedAt: utcNow,
    }).catch(() => {});
  },

  listenToMyPrivacyRequests(
    userId: string,
    callback: (requests: PrivacyRequest[]) => void
  ) {
    const q = query(collection(db, 'privacy_requests'), where('userId', '==', userId));
    return onSnapshot(
      q,
      (snap) => {
        const items: PrivacyRequest[] = [];
        snap.forEach((d) => items.push({ ...(d.data() as PrivacyRequest), id: d.id }));
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(items);
      },
      () => callback([])
    );
  },

  listenToAllPrivacyRequests(callback: (requests: PrivacyRequest[]) => void) {
    return onSnapshot(
      collection(db, 'privacy_requests'),
      (snap) => {
        const items: PrivacyRequest[] = [];
        snap.forEach((d) => items.push({ ...(d.data() as PrivacyRequest), id: d.id }));
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(items);
      },
      () => callback([])
    );
  },

  // Admin Governance Operations & Audit Logs
  async logAdminAuditAction(
    adminId: string,
    adminEmail: string,
    action: string,
    targetType: string,
    targetId: string,
    details: string
  ): Promise<void> {
    try {
      const ref = doc(collection(db, 'moderation_audit_logs'));
      const utcNow = await getAuthoritativeServerTime()
        .then((r) => r.utcIso)
        .catch(() => new Date().toISOString());
      await setDoc(ref, {
        id: ref.id,
        adminId,
        adminEmail,
        action,
        targetType,
        targetId,
        details,
        timestamp: utcNow,
      });
    } catch (err) {
      console.warn('Admin audit log notice:', err);
    }
  },

  listenToAdminAuditLogs(callback: (logs: ModerationAuditLog[]) => void) {
    return onSnapshot(
      collection(db, 'moderation_audit_logs'),
      (snap) => {
        const items: ModerationAuditLog[] = [];
        snap.forEach((d) => items.push({ ...(d.data() as ModerationAuditLog), id: d.id }));
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        callback(items);
      },
      () => callback([])
    );
  },

  listenToPolicyMetadata(callback: (items: PolicyVersionMetadata[]) => void) {
    return onSnapshot(
      collection(db, 'policy_metadata'),
      (snap) => {
        const items: PolicyVersionMetadata[] = [];
        snap.forEach((d) => items.push({ ...(d.data() as PolicyVersionMetadata), id: d.id }));
        callback(items);
      },
      () => callback([])
    );
  },

  async savePolicyMetadata(
    meta: PolicyVersionMetadata,
    adminId: string,
    adminEmail: string
  ): Promise<void> {
    await setDoc(doc(db, 'policy_metadata', meta.policyKey), meta, { merge: true });
    await LegalService.logAdminAuditAction(
      adminId,
      adminEmail,
      'update_policy_version',
      'policy_metadata',
      meta.policyKey,
      `Updated ${meta.title} to v${meta.version} (${meta.lastUpdated})`
    );
  },

  async adminResolveReport(
    reportId: string,
    status: ModerationReport['status'],
    resolutionAction: ModerationReport['resolutionAction'],
    adminNotes: string,
    adminId: string,
    adminEmail: string,
    targetType?: string,
    targetId?: string,
    targetAuthorId?: string
  ): Promise<void> {
    const utcNow = await getAuthoritativeServerTime()
      .then((r) => r.utcIso)
      .catch(() => new Date().toISOString());

    await updateDoc(doc(db, 'moderation_reports', reportId), {
      status,
      resolutionAction: resolutionAction || 'none',
      adminNotes,
      updatedAt: utcNow,
    });

    if (resolutionAction === 'content_removed' && targetId) {
      if (targetType === 'video') {
        await deleteDoc(doc(db, 'videos', targetId)).catch(() => {});
      } else if (targetType === 'recipe') {
        await deleteDoc(doc(db, 'recipes', targetId)).catch(() => {});
      }
    } else if (
      (resolutionAction === 'user_restricted' || resolutionAction === 'user_suspended') &&
      targetAuthorId
    ) {
      await updateDoc(doc(db, 'users', targetAuthorId), {
        accountStatus: resolutionAction === 'user_suspended' ? 'suspended' : 'restricted',
        restrictionReason: adminNotes || 'Community guideline enforcement',
        updatedAt: utcNow,
      }).catch(() => {});
    }

    await LegalService.logAdminAuditAction(
      adminId,
      adminEmail,
      `report_${status}_${resolutionAction || 'none'}`,
      targetType || 'moderation_report',
      targetId || reportId,
      adminNotes || `Report ${reportId} marked ${status}`
    );
  },

  async adminResolveCopyrightClaim(
    claimId: string,
    status: CopyrightClaim['status'],
    adminDecisionNotes: string,
    removeReportedContent: boolean,
    adminId: string,
    adminEmail: string,
    reportedTargetType?: string,
    reportedTargetId?: string
  ): Promise<void> {
    const utcNow = await getAuthoritativeServerTime()
      .then((r) => r.utcIso)
      .catch(() => new Date().toISOString());

    await updateDoc(doc(db, 'copyright_claims', claimId), {
      status,
      adminDecisionNotes,
      updatedAt: utcNow,
    });

    if (removeReportedContent && status === 'action_taken' && reportedTargetId) {
      if (reportedTargetType === 'video') {
        await deleteDoc(doc(db, 'videos', reportedTargetId)).catch(() => {});
      } else if (reportedTargetType === 'recipe') {
        await deleteDoc(doc(db, 'recipes', reportedTargetId)).catch(() => {});
      }
    }

    await LegalService.logAdminAuditAction(
      adminId,
      adminEmail,
      `copyright_${status}`,
      reportedTargetType || 'copyright_claim',
      reportedTargetId || claimId,
      adminDecisionNotes || `Copyright claim ${claimId} -> ${status}`
    );
  },

  async adminResolveAppeal(
    appealId: string,
    status: ModerationAppeal['status'],
    adminResponse: string,
    adminId: string,
    adminEmail: string,
    userIdToRestore?: string
  ): Promise<void> {
    const utcNow = await getAuthoritativeServerTime()
      .then((r) => r.utcIso)
      .catch(() => new Date().toISOString());

    await updateDoc(doc(db, 'moderation_appeals', appealId), {
      status,
      adminResponse,
      updatedAt: utcNow,
    });

    if (status === 'approved' && userIdToRestore) {
      await updateDoc(doc(db, 'users', userIdToRestore), {
        accountStatus: 'active',
        restrictionReason: '',
        updatedAt: utcNow,
      }).catch(() => {});
    }

    await LegalService.logAdminAuditAction(
      adminId,
      adminEmail,
      `appeal_${status}`,
      'moderation_appeal',
      appealId,
      adminResponse
    );
  },

  async adminResolvePrivacyRequest(
    requestId: string,
    status: PrivacyRequest['status'],
    adminNotes: string,
    adminId: string,
    adminEmail: string
  ): Promise<void> {
    const utcNow = await getAuthoritativeServerTime()
      .then((r) => r.utcIso)
      .catch(() => new Date().toISOString());

    await updateDoc(doc(db, 'privacy_requests', requestId), {
      status,
      adminNotes,
      updatedAt: utcNow,
    });

    await LegalService.logAdminAuditAction(
      adminId,
      adminEmail,
      `privacy_request_${status}`,
      'privacy_request',
      requestId,
      adminNotes || `Privacy request ${requestId} marked ${status}`
    );
  },

  // Export User Personal Data (JSON Portability under NDPA 2023)
  async downloadPersonalDataExport(userId: string, profile: UserProfile | null): Promise<void> {
    const [favSnap, vidFavSnap, reportsSnap] = await Promise.all([
      getDocs(collection(db, 'users', userId, 'favourites')).catch(() => null),
      getDocs(collection(db, 'users', userId, 'video_favourites')).catch(() => null),
      getDocs(query(collection(db, 'moderation_reports'), where('reporterId', '==', userId))).catch(
        () => null
      ),
    ]);

    const exportBundle = {
      exportedAtUtc: new Date().toISOString(),
      platform: 'DellyChow',
      profile,
      savedRecipeFavourites: favSnap ? favSnap.docs.map((d) => ({ id: d.id, ...d.data() })) : [],
      savedVideoFavourites: vidFavSnap
        ? vidFavSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        : [],
      myModerationReportsCount: reportsSnap ? reportsSnap.size : 0,
      cookiePreferences: getSavedCookiePreferences(),
    };

    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dellychow-personal-data-${userId.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
