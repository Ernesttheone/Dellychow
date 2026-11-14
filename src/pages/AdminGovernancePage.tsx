import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Flag,
  Copyright,
  Scale,
  UserX,
  FileText,
  History,
  CheckCircle2,
  XCircle,
  Trash2,
  ArrowLeft,
  Save,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LegalService } from '../services/legalService';
import {
  CopyrightClaim,
  LegalPolicyKey,
  ModerationAppeal,
  ModerationAuditLog,
  ModerationReport,
  PolicyVersionMetadata,
  PrivacyRequest,
} from '../types';
import { LEGAL_POLICY_DIRECTORY } from '../data/legalDocuments';

interface AdminGovernancePageProps {
  onBack: () => void;
  onNavigate: (view: string, params?: any) => void;
}

type AdminTab = 'reports' | 'copyright' | 'appeals' | 'privacy' | 'policies' | 'audit';

export const AdminGovernancePage: React.FC<AdminGovernancePageProps> = ({
  onBack,
  onNavigate,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('reports');

  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [claims, setClaims] = useState<CopyrightClaim[]>([]);
  const [appeals, setAppeals] = useState<ModerationAppeal[]>([]);
  const [privacyRequests, setPrivacyRequests] = useState<PrivacyRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<ModerationAuditLog[]>([]);
  const [policyMetas, setPolicyMetas] = useState<PolicyVersionMetadata[]>([]);

  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [policyForm, setPolicyForm] = useState<{
    policyKey: LegalPolicyKey;
    version: string;
    lastUpdated: string;
    summaryOfChanges: string;
  }>({
    policyKey: 'terms',
    version: '1.0.0',
    lastUpdated: new Date().toISOString().slice(0, 10),
    summaryOfChanges: '',
  });

  useEffect(() => {
    if (!currentUser || !isAdmin) return;

    const u1 = LegalService.listenToAllModerationReports(setReports);
    const u2 = LegalService.listenToAllCopyrightClaims(setClaims);
    const u3 = LegalService.listenToAllAppeals(setAppeals);
    const u4 = LegalService.listenToAllPrivacyRequests(setPrivacyRequests);
    const u5 = LegalService.listenToAdminAuditLogs(setAuditLogs);
    const u6 = LegalService.listenToPolicyMetadata(setPolicyMetas);

    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
      u6();
    };
  }, [currentUser, isAdmin]);

  if (!currentUser || !isAdmin) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="font-serif-display text-2xl font-bold text-stone-900 dark:text-stone-100">
          Administrator Access Restricted
        </h1>
        <p className="text-xs text-stone-500 leading-relaxed">
          This Governance &amp; Moderation Dashboard is reserved strictly for authorized DellyChow compliance administrators.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-semibold cursor-pointer"
        >
          Return to DellyChow
        </button>
      </div>
    );
  }

  const adminEmail = currentUser.email || 'admin@dellychow';

  const notify = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleSavePolicyMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    const dir =
      policyForm.policyKey !== 'legal'
        ? LEGAL_POLICY_DIRECTORY[policyForm.policyKey]
        : null;
    await LegalService.savePolicyMetadata(
      {
        id: policyForm.policyKey,
        policyKey: policyForm.policyKey,
        title: dir?.title || 'DellyChow Legal Policy',
        version: policyForm.version.trim(),
        lastUpdated: policyForm.lastUpdated.trim(),
        updatedByEmail: adminEmail,
        summaryOfChanges: policyForm.summaryOfChanges.trim(),
      },
      currentUser.uid,
      adminEmail
    );
    notify(`Saved policy metadata for ${policyForm.policyKey} v${policyForm.version}.`);
    setPolicyForm((prev) => ({ ...prev, summaryOfChanges: '' }));
  };

  const pendingReports = reports.filter((r) => r.status === 'pending' || r.status === 'under_review').length;
  const pendingClaims = claims.filter((c) => c.status === 'submitted' || c.status === 'under_review' || c.status === 'counter_notice_submitted').length;
  const pendingAppeals = appeals.filter((a) => a.status === 'pending' || a.status === 'under_review').length;
  const pendingPrivacy = privacyRequests.filter((p) => p.status === 'pending' || p.status === 'processing').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-amber-700 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Account</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('legal')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold cursor-pointer"
        >
          <Scale className="w-3.5 h-3.5" />
          <span>View Public Legal Centre</span>
        </button>
      </div>

      {/* Header */}
      <div className="rounded-3xl bg-stone-900 text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-600/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Admin Governance &amp; Moderation Console</span>
          </div>
          <h1 className="font-serif-display text-2xl sm:text-3xl font-bold">
            Compliance, Copyright &amp; Safety Operations
          </h1>
          <p className="text-xs text-stone-300 max-w-2xl">
            Signed in as {adminEmail}. All takedowns, copyright decisions, account restrictions, appeals, and privacy actions are recorded in the immutable moderation audit trail.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center shrink-0">
          <div className="px-3.5 py-2.5 rounded-2xl bg-white/10">
            <span className="block text-xl font-bold tabular-nums">{pendingReports}</span>
            <span className="text-[10px] text-stone-300 uppercase">Open Reports</span>
          </div>
          <div className="px-3.5 py-2.5 rounded-2xl bg-white/10">
            <span className="block text-xl font-bold tabular-nums">{pendingClaims}</span>
            <span className="text-[10px] text-stone-300 uppercase">IP Claims</span>
          </div>
          <div className="px-3.5 py-2.5 rounded-2xl bg-white/10">
            <span className="block text-xl font-bold tabular-nums">{pendingAppeals}</span>
            <span className="text-[10px] text-stone-300 uppercase">Appeals</span>
          </div>
          <div className="px-3.5 py-2.5 rounded-2xl bg-white/10">
            <span className="block text-xl font-bold tabular-nums">{pendingPrivacy}</span>
            <span className="text-[10px] text-stone-300 uppercase">Privacy/Deletion</span>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
        {[
          { id: 'reports', label: `Reports (${reports.length})`, icon: Flag },
          { id: 'copyright', label: `Copyright Claims (${claims.length})`, icon: Copyright },
          { id: 'appeals', label: `Appeals (${appeals.length})`, icon: Scale },
          { id: 'privacy', label: `Privacy & Deletion (${privacyRequests.length})`, icon: UserX },
          { id: 'policies', label: 'Policy Versions', icon: FileText },
          { id: 'audit', label: `Audit Logs (${auditLogs.length})`, icon: History },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as AdminTab)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === t.id
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: MODERATION REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="p-10 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-center text-xs text-stone-500">
              No moderation reports recorded yet.
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800">
                      {report.id.slice(0, 14)}
                    </span>
                    <span className="text-xs font-bold uppercase text-amber-700">
                      {report.targetType} &bull; {report.reason.replace(/_/g, ' ')}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                      {report.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-400">
                    {new Date(report.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="text-xs text-stone-700 dark:text-stone-300 space-y-1">
                  <p>
                    <strong>Target:</strong> {report.targetTitle || report.targetId} (Author ID: {report.targetAuthorId || 'N/A'})
                  </p>
                  <p>
                    <strong>Reporter:</strong> {report.reporterName || report.reporterId}
                  </p>
                  <p className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/70">{report.details}</p>
                </div>

                <input
                  type="text"
                  value={noteInputs[report.id] ?? report.adminNotes ?? ''}
                  onChange={(e) => setNoteInputs((prev) => ({ ...prev, [report.id]: e.target.value }))}
                  placeholder="Admin review notes / justification..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await LegalService.adminResolveReport(
                        report.id,
                        'under_review',
                        'none',
                        noteInputs[report.id] || 'Marked under admin review',
                        currentUser.uid,
                        adminEmail,
                        report.targetType,
                        report.targetId,
                        report.targetAuthorId
                      );
                      notify('Report marked Under Review.');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold cursor-pointer"
                  >
                    Mark Under Review
                  </button>

                  {(report.targetType === 'video' || report.targetType === 'recipe') && (
                    <button
                      type="button"
                      onClick={async () => {
                        await LegalService.adminResolveReport(
                          report.id,
                          'resolved',
                          'content_removed',
                          noteInputs[report.id] || 'Removed violating content after review',
                          currentUser.uid,
                          adminEmail,
                          report.targetType,
                          report.targetId,
                          report.targetAuthorId
                        );
                        notify('Reported content removed & logged.');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Content</span>
                    </button>
                  )}

                  {report.targetAuthorId && (
                    <button
                      type="button"
                      onClick={async () => {
                        await LegalService.adminResolveReport(
                          report.id,
                          'resolved',
                          'user_restricted',
                          noteInputs[report.id] || 'Account restricted under Community Guidelines',
                          currentUser.uid,
                          adminEmail,
                          report.targetType,
                          report.targetId,
                          report.targetAuthorId
                        );
                        notify('Target user marked restricted.');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      Restrict Account
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      await LegalService.adminResolveReport(
                        report.id,
                        'dismissed',
                        'none',
                        noteInputs[report.id] || 'No policy violation verified',
                        currentUser.uid,
                        adminEmail,
                        report.targetType,
                        report.targetId,
                        report.targetAuthorId
                      );
                      notify('Report dismissed.');
                    }}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-semibold cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: COPYRIGHT CLAIMS */}
      {activeTab === 'copyright' && (
        <div className="space-y-4">
          {claims.length === 0 ? (
            <div className="p-10 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-center text-xs text-stone-500">
              No copyright or creator impersonation claims submitted yet.
            </div>
          ) : (
            claims.map((claim) => (
              <div
                key={claim.id}
                className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800">
                      {claim.id.slice(0, 14)}
                    </span>
                    <span className="text-xs font-bold uppercase text-amber-700">
                      {claim.violationType.replace(/_/g, ' ')}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                      {claim.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-400">
                    {new Date(claim.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-stone-700 dark:text-stone-300">
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 space-y-1">
                    <p><strong>Claimant:</strong> {claim.claimantName} ({claim.claimantEmail})</p>
                    <p><strong>Reported Target:</strong> {claim.reportedTargetType} · {claim.reportedTargetTitle || claim.reportedTargetId}</p>
                    <p><strong>URL:</strong> {claim.reportedContentUrl}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 space-y-1">
                    <p><strong>Original Work:</strong> {claim.originalWorkTitle}</p>
                    <p><strong>Proof URL:</strong> {claim.originalWorkUrl || 'Described below'}</p>
                    <p>{claim.originalWorkDescription}</p>
                  </div>
                </div>

                {claim.counterNoticeText && (
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 text-xs text-blue-900 dark:text-blue-200">
                    <strong>Counter-Notice Submitted:</strong> {claim.counterNoticeText}
                  </div>
                )}

                <input
                  type="text"
                  value={noteInputs[claim.id] ?? claim.adminDecisionNotes ?? ''}
                  onChange={(e) => setNoteInputs((prev) => ({ ...prev, [claim.id]: e.target.value }))}
                  placeholder="Admin copyright decision & evidence verification notes..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await LegalService.adminResolveCopyrightClaim(
                        claim.id,
                        'under_review',
                        noteInputs[claim.id] || 'Reviewing ownership proof under Copyright Act 2022',
                        false,
                        currentUser.uid,
                        adminEmail,
                        claim.reportedTargetType,
                        claim.reportedTargetId
                      );
                      notify('Copyright claim marked Under Review.');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold cursor-pointer"
                  >
                    Mark Under Review
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await LegalService.adminResolveCopyrightClaim(
                        claim.id,
                        'action_taken',
                        noteInputs[claim.id] || 'Infringement verified and reported material removed',
                        true,
                        currentUser.uid,
                        adminEmail,
                        claim.reportedTargetType,
                        claim.reportedTargetId
                      );
                      notify('Infringement action taken & content removed.');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Verify &amp; Remove Infringing Work
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await LegalService.adminResolveCopyrightClaim(
                        claim.id,
                        'dismissed',
                        noteInputs[claim.id] || 'Claim unverified / insufficient evidence',
                        false,
                        currentUser.uid,
                        adminEmail,
                        claim.reportedTargetType,
                        claim.reportedTargetId
                      );
                      notify('Claim dismissed.');
                    }}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-semibold cursor-pointer"
                  >
                    Dismiss Claim
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: APPEALS */}
      {activeTab === 'appeals' && (
        <div className="space-y-4">
          {appeals.length === 0 ? (
            <div className="p-10 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-center text-xs text-stone-500">
              No moderation appeals submitted yet.
            </div>
          ) : (
            appeals.map((appeal) => (
              <div
                key={appeal.id}
                className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      {appeal.userName} · {appeal.targetType} ({appeal.targetId})
                    </span>
                    <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                      {appeal.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-400">
                    {new Date(appeal.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-stone-800 p-3 rounded-xl">
                  {appeal.appealReason}
                </p>

                <input
                  type="text"
                  value={noteInputs[appeal.id] ?? appeal.adminResponse ?? ''}
                  onChange={(e) => setNoteInputs((prev) => ({ ...prev, [appeal.id]: e.target.value }))}
                  placeholder="Response to appellant..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await LegalService.adminResolveAppeal(
                        appeal.id,
                        'approved',
                        noteInputs[appeal.id] || 'Appeal approved; account status restored.',
                        currentUser.uid,
                        adminEmail,
                        appeal.userId
                      );
                      notify('Appeal approved and user status restored.');
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve &amp; Restore</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await LegalService.adminResolveAppeal(
                        appeal.id,
                        'rejected',
                        noteInputs[appeal.id] || 'Moderation decision upheld after review.',
                        currentUser.uid,
                        adminEmail
                      );
                      notify('Appeal rejected.');
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Uphold Decision</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: PRIVACY & DELETION REQUESTS */}
      {activeTab === 'privacy' && (
        <div className="space-y-4">
          {privacyRequests.length === 0 ? (
            <div className="p-10 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-center text-xs text-stone-500">
              No privacy rights or account deletion requests pending.
            </div>
          ) : (
            privacyRequests.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold uppercase text-amber-700">
                      {req.requestType.replace(/_/g, ' ')}
                    </span>
                    <span className="ml-2 text-stone-800 dark:text-stone-200 font-semibold">
                      {req.userName} ({req.userEmail})
                    </span>
                    <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                      {req.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-400">
                    {new Date(req.createdAt).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-stone-800 p-3 rounded-xl">
                  {req.details}
                </p>

                <input
                  type="text"
                  value={noteInputs[req.id] ?? req.adminNotes ?? ''}
                  onChange={(e) => setNoteInputs((prev) => ({ ...prev, [req.id]: e.target.value }))}
                  placeholder="NDPA compliance fulfillment note..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await LegalService.adminResolvePrivacyRequest(
                        req.id,
                        'processing',
                        noteInputs[req.id] || 'Processing data rights request',
                        currentUser.uid,
                        adminEmail
                      );
                      notify('Privacy request set to Processing.');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold cursor-pointer"
                  >
                    Mark Processing
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await LegalService.adminResolvePrivacyRequest(
                        req.id,
                        'completed',
                        noteInputs[req.id] || 'Completed under NDPA 2023 guidelines',
                        currentUser.uid,
                        adminEmail
                      );
                      notify('Privacy request marked Completed.');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Mark Completed
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 5: POLICY VERSION METADATA */}
      {activeTab === 'policies' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSavePolicyMeta}
            className="lg:col-span-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4"
          >
            <h2 className="font-serif-display text-lg font-bold text-stone-900 dark:text-stone-100">
              Publish Policy Version Metadata
            </h2>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Policy</label>
              <select
                value={policyForm.policyKey}
                onChange={(e) => setPolicyForm((p) => ({ ...p, policyKey: e.target.value as LegalPolicyKey }))}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              >
                {Object.values(LEGAL_POLICY_DIRECTORY).map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Version</label>
                <input
                  type="text"
                  required
                  value={policyForm.version}
                  onChange={(e) => setPolicyForm((p) => ({ ...p, version: e.target.value }))}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Last Updated</label>
                <input
                  type="text"
                  required
                  value={policyForm.lastUpdated}
                  onChange={(e) => setPolicyForm((p) => ({ ...p, lastUpdated: e.target.value }))}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Summary of Changes</label>
              <textarea
                rows={3}
                value={policyForm.summaryOfChanges}
                onChange={(e) => setPolicyForm((p) => ({ ...p, summaryOfChanges: e.target.value }))}
                placeholder="Describe revision notes for audit records..."
                className="w-full text-xs p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Policy Metadata</span>
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            <h2 className="font-serif-display text-lg font-bold text-stone-900 dark:text-stone-100">
              Active Policy Registry
            </h2>
            {Object.values(LEGAL_POLICY_DIRECTORY).map((dir) => {
              const override = policyMetas.find((m) => m.policyKey === dir.key);
              return (
                <div
                  key={dir.key}
                  className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-bold text-stone-900 dark:text-stone-100">{dir.title}</p>
                    <p className="text-[11px] text-stone-500">
                      Version v{override?.version || dir.version} &bull; Updated: {override?.lastUpdated || dir.lastUpdated}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate(dir.key)}
                    className="px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-xs font-semibold cursor-pointer"
                  >
                    Open
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: IMMUTABLE AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-3">
          {auditLogs.length === 0 ? (
            <div className="p-10 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-center text-xs text-stone-500">
              No administrative governance actions logged yet.
            </div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-700">{log.action}</span>
                    <span className="text-stone-500">
                      &rarr; {log.targetType} ({log.targetId})
                    </span>
                  </div>
                  <p className="text-stone-700 dark:text-stone-300">{log.details}</p>
                  <p className="text-[11px] text-stone-400">Admin: {log.adminEmail}</p>
                </div>
                <span className="text-[11px] text-stone-400 shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
