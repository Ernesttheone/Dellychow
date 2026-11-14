import React, { useState, useEffect } from 'react';
import {
  Scale,
  ShieldCheck,
  Users,
  ChefHat,
  Heart,
  AlertTriangle,
  FileText,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  HelpCircle,
  BookOpen,
  Clock,
  Info,
  Loader2,
  Check,
  Copyright,
  Utensils,
  Cookie,
  Flag,
  PhoneCall,
  ShieldAlert,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import {
  TERMS_SECTIONS,
  LEGAL_POLICY_DIRECTORY,
  POLICY_SECTIONS_MAP,
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
  CURRENT_GUIDELINES_VERSION,
  LEGAL_EFFECTIVE_DATE,
  LegalDocumentTab,
  LegalSection,
  hasAcceptedLatestLegal,
} from '../data/legalDocuments';
import { useAuth } from '../context/AuthContext';
import { LegalService } from '../services/legalService';
import { RecipeService } from '../services/recipeService';
import {
  CopyrightClaim,
  LegalPolicyKey,
  ModerationAppeal,
  ModerationReport,
  PolicyVersionMetadata,
  SupportTicket,
} from '../types';
import { CACHE_METADATA_NAME, CACHE_THUMBNAILS_NAME } from '../lib/offlineVideoCache';

export interface PrefillCopyrightTarget {
  targetType?: 'video' | 'recipe' | 'chef_profile' | 'user_profile';
  targetId?: string;
  targetTitle?: string;
  reportedUrl?: string;
  targetAuthorId?: string;
}

interface TermsAndConditionsPageProps {
  initialTab?: LegalPolicyKey;
  prefillCopyrightTarget?: PrefillCopyrightTarget | null;
  onBack?: () => void;
  onNavigate?: (view: string, params?: any) => void;
  onOpenSupportModal?: () => void;
  onAcceptTerms?: (source: 'account_settings' | 'update_prompt') => Promise<void>;
  onOpenAuthModal?: (mode?: 'login' | 'signup') => void;
}

const POLICY_TABS: Array<{
  key: LegalPolicyKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: 'legal', label: 'Legal Centre Hub', icon: BookOpen },
  { key: 'terms', label: 'Terms & Conditions', icon: Scale },
  { key: 'privacy', label: 'Privacy Policy', icon: ShieldCheck },
  { key: 'guidelines', label: 'Community Guidelines', icon: Users },
  { key: 'copyright', label: 'Copyright & IP', icon: Copyright },
  { key: 'food-safety', label: 'Food Safety', icon: Utensils },
  { key: 'cookies', label: 'Cookie Policy', icon: Cookie },
  { key: 'reporting', label: 'Reporting & Appeals', icon: Flag },
  { key: 'contact', label: 'Contact & Support', icon: PhoneCall },
];

export const TermsAndConditionsPage: React.FC<TermsAndConditionsPageProps> = ({
  initialTab = 'terms',
  prefillCopyrightTarget,
  onBack,
  onNavigate,
  onOpenSupportModal,
  onAcceptTerms,
  onOpenAuthModal,
}) => {
  const {
    currentUser,
    userProfile,
    isAdmin,
    cookiePreferences,
    updateCookiePreferences,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<LegalPolicyKey>(initialTab);
  const [activeSectionId, setActiveSectionId] = useState<string>('introduction');
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [acceptConfirmChecked, setAcceptConfirmChecked] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(false);

  // Live metadata overrides saved by admin
  const [policyMetaOverrides, setPolicyMetaOverrides] = useState<PolicyVersionMetadata[]>([]);

  // My reports, copyright claims, and appeals trackers (private to current user)
  const [myCopyrightClaims, setMyCopyrightClaims] = useState<CopyrightClaim[]>([]);
  const [myReports, setMyReports] = useState<ModerationReport[]>([]);
  const [myAppeals, setMyAppeals] = useState<ModerationAppeal[]>([]);

  // Copyright claim form state
  const [cpViolationType, setCpViolationType] =
    useState<CopyrightClaim['violationType']>('stolen_video');
  const [cpTargetType, setCpTargetType] =
    useState<CopyrightClaim['reportedTargetType']>('video');
  const [cpTargetId, setCpTargetId] = useState('');
  const [cpTargetTitle, setCpTargetTitle] = useState('');
  const [cpReportedUrl, setCpReportedUrl] = useState('');
  const [cpOriginalTitle, setCpOriginalTitle] = useState('');
  const [cpOriginalUrl, setCpOriginalUrl] = useState('');
  const [cpOriginalDesc, setCpOriginalDesc] = useState('');
  const [cpGoodFaith, setCpGoodFaith] = useState(false);
  const [cpSubmitting, setCpSubmitting] = useState(false);
  const [cpSuccessId, setCpSuccessId] = useState<string | null>(null);
  const [cpError, setCpError] = useState<string | null>(null);
  const [counterNoticeDrafts, setCounterNoticeDrafts] = useState<Record<string, string>>({});

  // Reporting & Appeals form state
  const [repTargetType, setRepTargetType] = useState<ModerationReport['targetType']>('video');
  const [repTargetId, setRepTargetId] = useState('');
  const [repTargetTitle, setRepTargetTitle] = useState('');
  const [repReason, setRepReason] = useState<ModerationReport['reason']>('harassment');
  const [repDetails, setRepDetails] = useState('');
  const [repSubmitting, setRepSubmitting] = useState(false);
  const [repSuccessId, setRepSuccessId] = useState<string | null>(null);
  const [repError, setRepError] = useState<string | null>(null);

  const [appealTargetType, setAppealTargetType] =
    useState<ModerationAppeal['targetType']>('account');
  const [appealTargetId, setAppealTargetId] = useState('');
  const [appealReason, setAppealReason] = useState('');
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [appealSuccessId, setAppealSuccessId] = useState<string | null>(null);

  // Cookie cache clear state
  const [cacheClearedMsg, setCacheClearedMsg] = useState<string | null>(null);

  // Central Contact & Complaints form state
  const [contactCategory, setContactCategory] = useState<
    'account' | 'privacy' | 'copyright' | 'complaint' | 'technical' | 'general'
  >('general');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactName, setContactName] = useState(userProfile?.displayName || '');
  const [contactEmail, setContactEmail] = useState(userProfile?.email || '');
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactRefId, setContactRefId] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
    if (initialTab !== 'legal') {
      const list = POLICY_SECTIONS_MAP[initialTab];
      if (list && list.length > 0) setActiveSectionId(list[0].id);
    }
  }, [initialTab]);

  useEffect(() => {
    if (prefillCopyrightTarget) {
      if (prefillCopyrightTarget.targetType) setCpTargetType(prefillCopyrightTarget.targetType);
      if (prefillCopyrightTarget.targetId) setCpTargetId(prefillCopyrightTarget.targetId);
      if (prefillCopyrightTarget.targetTitle) setCpTargetTitle(prefillCopyrightTarget.targetTitle);
      if (prefillCopyrightTarget.reportedUrl) setCpReportedUrl(prefillCopyrightTarget.reportedUrl);
    }
  }, [prefillCopyrightTarget]);

  useEffect(() => {
    if (userProfile) {
      if (!contactName) setContactName(userProfile.displayName || '');
      if (!contactEmail) setContactEmail(userProfile.email || '');
    }
  }, [userProfile, contactName, contactEmail]);

  useEffect(() => {
    const unsubMeta = LegalService.listenToPolicyMetadata(setPolicyMetaOverrides);
    return () => unsubMeta();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setMyCopyrightClaims([]);
      setMyReports([]);
      setMyAppeals([]);
      return;
    }
    const u1 = LegalService.listenToMyCopyrightClaims(currentUser.uid, setMyCopyrightClaims);
    const u2 = LegalService.listenToMyModerationReports(currentUser.uid, setMyReports);
    const u3 = LegalService.listenToMyAppeals(currentUser.uid, setMyAppeals);
    return () => {
      u1();
      u2();
      u3();
    };
  }, [currentUser]);

  const sections: LegalSection[] =
    activeTab !== 'legal' ? POLICY_SECTIONS_MAP[activeTab] || TERMS_SECTIONS : [];
  const currentMeta =
    activeTab !== 'legal' ? LEGAL_POLICY_DIRECTORY[activeTab] : null;
  const metaOverride = policyMetaOverrides.find((m) => m.policyKey === activeTab);

  const isLatestAccepted = hasAcceptedLatestLegal(userProfile);

  const scrollToSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setMobileTocOpen(false);
    const el = document.getElementById(`legal-section-${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSelectPolicy = (tab: LegalPolicyKey) => {
    setActiveTab(tab);
    if (tab !== 'legal') {
      const list = POLICY_SECTIONS_MAP[tab];
      if (list && list.length > 0) setActiveSectionId(list[0].id);
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleConfirmAccept = async () => {
    if (!onAcceptTerms || !acceptConfirmChecked) return;
    setAccepting(true);
    try {
      await onAcceptTerms('account_settings');
      setAcceptSuccess(true);
      setTimeout(() => setAcceptSuccess(false), 5000);
    } finally {
      setAccepting(false);
    }
  };

  const handleSubmitCopyrightClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setCpError(null);
    if (!currentUser) {
      onOpenAuthModal?.('login');
      return;
    }
    if (!cpGoodFaith) {
      setCpError('You must confirm the good-faith declaration before submitting a copyright claim.');
      return;
    }
    setCpSubmitting(true);
    try {
      const res = await LegalService.submitCopyrightClaim({
        claimantUserId: currentUser.uid,
        claimantName: userProfile?.displayName || currentUser.displayName || 'Creator',
        claimantEmail: userProfile?.email || currentUser.email || '',
        violationType: cpViolationType,
        reportedTargetType: cpTargetType,
        reportedTargetId: cpTargetId.trim() || 'unspecified',
        reportedTargetTitle: cpTargetTitle.trim(),
        reportedContentUrl: cpReportedUrl.trim() || window.location.origin,
        targetAuthorId: prefillCopyrightTarget?.targetAuthorId,
        originalWorkTitle: cpOriginalTitle.trim(),
        originalWorkUrl: cpOriginalUrl.trim(),
        originalWorkDescription: cpOriginalDesc.trim(),
        goodFaithDeclaration: true,
      });
      setCpSuccessId(res.id);
      setCpTargetId('');
      setCpTargetTitle('');
      setCpReportedUrl('');
      setCpOriginalTitle('');
      setCpOriginalUrl('');
      setCpOriginalDesc('');
      setCpGoodFaith(false);
    } catch (err: any) {
      setCpError(err?.message || 'Unable to submit copyright claim.');
    } finally {
      setCpSubmitting(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setRepError(null);
    if (!currentUser) {
      onOpenAuthModal?.('login');
      return;
    }
    if (repDetails.trim().length < 10) {
      setRepError('Please provide at least 10 characters explaining the report.');
      return;
    }
    setRepSubmitting(true);
    try {
      const res = await LegalService.submitModerationReport({
        reporterId: currentUser.uid,
        reporterName: userProfile?.displayName || currentUser.displayName || 'Member',
        targetType: repTargetType,
        targetId: repTargetId.trim() || 'general-report',
        targetTitle: repTargetTitle.trim() || undefined,
        reason: repReason,
        details: repDetails.trim(),
      });
      setRepSuccessId(res.id);
      setRepTargetId('');
      setRepTargetTitle('');
      setRepDetails('');
    } catch (err: any) {
      setRepError(err?.message || 'Unable to submit report.');
    } finally {
      setRepSubmitting(false);
    }
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuthModal?.('login');
      return;
    }
    if (!appealReason.trim()) return;
    setAppealSubmitting(true);
    try {
      const id = await LegalService.submitModerationAppeal({
        userId: currentUser.uid,
        userName: userProfile?.displayName || currentUser.displayName || 'Member',
        targetType: appealTargetType,
        targetId: appealTargetId.trim() || currentUser.uid,
        appealReason: appealReason.trim(),
      });
      setAppealSuccessId(id);
      setAppealTargetId('');
      setAppealReason('');
    } finally {
      setAppealSubmitting(false);
    }
  };

  const handleClearOfflineCaches = async () => {
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        await window.caches.delete(CACHE_METADATA_NAME);
        await window.caches.delete(CACHE_THUMBNAILS_NAME);
      }
      localStorage.removeItem('dellychow_cached_videos_index');
      setCacheClearedMsg('Offline video metadata and thumbnail caches cleared successfully.');
      setTimeout(() => setCacheClearedMsg(null), 5000);
    } catch {
      setCacheClearedMsg('Offline cache cleared.');
    }
  };

  const handleSubmitContactEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactSubject.trim() || !contactMessage.trim()) return;
    setContactSubmitting(true);
    try {
      if (contactCategory === 'privacy' && currentUser) {
        const res = await LegalService.submitPrivacyRequest({
          userId: currentUser.uid,
          userName: contactName.trim(),
          userEmail: contactEmail.trim(),
          requestType: 'privacy_inquiry',
          details: `${contactSubject.trim()} — ${contactMessage.trim()}`,
        });
        setContactRefId(res.id);
      } else {
        const mappedCat: SupportTicket['category'] =
          contactCategory === 'privacy' ? 'account' :
          contactCategory === 'copyright' ? 'complaint' :
          contactCategory;
        const ticketId = await RecipeService.submitSupportTicket({
          userId: currentUser?.uid,
          name: contactName.trim(),
          email: contactEmail.trim(),
          topic: contactCategory,
          category: mappedCat,
          priority: contactCategory === 'copyright' || contactCategory === 'privacy' ? 'high' : 'medium',
          subject: `[${contactCategory.toUpperCase()}] ${contactSubject.trim()}`,
          message: contactMessage.trim(),
        });
        setContactRefId(ticketId);
      }
      setContactSubject('');
      setContactMessage('');
    } finally {
      setContactSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
      {/* Top Bar & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : onNavigate?.('home'))}
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-400 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to DellyChow</span>
        </button>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-stone-500">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80">
            <FileText className="w-3.5 h-3.5" />
            <span>Terms v{CURRENT_TERMS_VERSION}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Privacy v{CURRENT_PRIVACY_VERSION}</span>
          </span>
          {isAdmin && onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('admin-governance')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900 text-white text-[11px] font-semibold cursor-pointer hover:bg-stone-800"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin Governance Console</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs p-6 sm:p-8 space-y-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
          <div className="space-y-2.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-xs font-semibold border border-amber-200/80">
              <Scale className="w-3.5 h-3.5" />
              <span>DellyChow Legal Centre, Safety &amp; Governance</span>
            </div>
            <h1 className="font-serif-display text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              {activeTab === 'legal'
                ? 'DellyChow Legal Centre'
                : currentMeta?.title || 'Terms and Conditions'}
            </h1>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              {activeTab === 'legal'
                ? 'Independent, plain-language legal policies, creator copyright protections, food safety guidance, privacy controls, and moderation appeal channels crafted specifically for DellyChow.'
                : currentMeta?.summary}
            </p>
          </div>

          <div className="shrink-0 rounded-2xl bg-[#FAF7F2] dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 p-4 text-xs space-y-1.5 min-w-[240px]">
            <p className="font-bold text-stone-800 dark:text-stone-100 uppercase tracking-wider text-[10px]">
              Policy Metadata
            </p>
            <p className="text-stone-600 dark:text-stone-300">
              <span className="font-semibold">Version:</span> v{metaOverride?.version || currentMeta?.version || CURRENT_TERMS_VERSION}
            </p>
            <p className="text-stone-600 dark:text-stone-300">
              <span className="font-semibold">Last Updated:</span> {metaOverride?.lastUpdated || currentMeta?.lastUpdated || LEGAL_EFFECTIVE_DATE}
            </p>
            <p className="text-stone-600 dark:text-stone-300">
              <span className="font-semibold">Primary Law:</span> Federal Republic of Nigeria (NDPA 2023 / Copyright Act 2022)
            </p>
          </div>
        </div>

        {/* All 8 Policy Tabs + Hub Switcher */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
          {POLICY_TABS.map((t) => {
            const Icon = t.icon;
            const isSelected = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => handleSelectPolicy(t.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-stone-900 text-white dark:bg-amber-600 shadow-xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}

          {onOpenSupportModal && (
            <button
              type="button"
              onClick={onOpenSupportModal}
              className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Live Support &amp; FAQ</span>
            </button>
          )}
        </div>

        {/* Legal Counsel Review & Corporate Placeholder Banner */}
        <div className="rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-800/60 p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed space-y-1">
            <p className="font-bold text-stone-900 dark:text-stone-100">
              Legal Review &amp; Placeholder Notice
            </p>
            <p>
              Built with Nigerian law (Nigeria Data Protection Act 2023, Copyright Act 2022, FCCPA 2018) as the primary foundation alongside international user safeguards. Fields marked{' '}
              <span className="font-semibold text-amber-900 dark:text-amber-300">[TO BE CONFIRMED]</span> (registered company name, RC number, address, legal/DPO email) require review and completion by qualified legal counsel before formal commercial launch.
            </p>
          </div>
        </div>
      </div>

      {/* LEGAL CENTRE OVERVIEW HUB */}
      {activeTab === 'legal' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.keys(LEGAL_POLICY_DIRECTORY) as LegalDocumentTab[]).map((key) => {
              const meta = LEGAL_POLICY_DIRECTORY[key];
              const override = policyMetaOverrides.find((m) => m.policyKey === key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectPolicy(key)}
                  className="text-left rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 p-5 hover:border-amber-500/60 hover:shadow-sm transition-all flex flex-col justify-between gap-3 cursor-pointer"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-amber-700">
                      <span>v{override?.version || meta.version}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                    <h2 className="font-serif-display text-base font-bold text-stone-900 dark:text-stone-100">
                      {meta.title}
                    </h2>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                      {meta.summary}
                    </p>
                  </div>
                  <p className="text-[10px] text-stone-400 pt-2 border-t border-stone-100 dark:border-stone-800">
                    Updated: {override?.lastUpdated || meta.lastUpdated}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Role & Food Safety Highlights (Shown on Terms Tab) */}
      {activeTab === 'terms' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 p-5 space-y-2 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <ChefHat className="w-5 h-5" />
            </div>
            <h2 className="font-serif-display text-base font-bold text-stone-900 dark:text-stone-100">
              100% Creator Ownership
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Chefs keep full ownership of original recipes, videos, and culinary media. DellyChow receives only a limited non-exclusive license to host and stream them inside the Platform.
            </p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 p-5 space-y-2 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
            <h2 className="font-serif-display text-base font-bold text-stone-900 dark:text-stone-100">
              Food Lover &amp; Teen Protections
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Respectful community conduct, anti-impersonation, private user blocking/reporting, and configurable visibility &amp; teen safety controls.
            </p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-stone-900 border border-amber-200/90 dark:border-amber-900/50 p-5 space-y-2 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="font-serif-display text-base font-bold text-stone-900 dark:text-stone-100">
              Food Safety Disclaimer
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Recipes and videos are educational only — never medical or nutritional advice. Always verify allergies, temperatures, and safe kitchen hygiene independently.
            </p>
          </div>
        </div>
      )}

      {/* Signed-in User Acceptance Record Banner */}
      {currentUser && userProfile && activeTab !== 'legal' && (
        <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 p-5 shadow-2xs">
          {isLatestAccepted && userProfile.legalAcceptance ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Acceptance Recorded: Terms v{userProfile.legalAcceptance.termsVersion}, Privacy v{userProfile.legalAcceptance.privacyPolicyVersion} &amp; Guidelines v{userProfile.legalAcceptance.communityGuidelinesVersion || CURRENT_GUIDELINES_VERSION}
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      Recorded UTC: {new Date(userProfile.legalAcceptance.acceptedAt).toLocaleString()} ({userProfile.legalAcceptance.registrationMethod || userProfile.legalAcceptance.source || 'account'})
                    </span>
                  </p>
                </div>
              </div>
              {acceptSuccess && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  Acceptance recorded
                </span>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Confirm Acceptance of Current Policies (v{CURRENT_TERMS_VERSION})
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Your existing recipes, videos, and profile remain untouched. Review and confirm below to update your compliance record.
                  </p>
                </div>
              </div>

              {onAcceptTerms && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <label className="flex items-start gap-2.5 text-xs text-stone-700 dark:text-stone-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={acceptConfirmChecked}
                      onChange={(e) => setAcceptConfirmChecked(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span>
                      I have read and agree to DellyChow&apos;s Terms and Conditions, Privacy Policy and Community Guidelines.
                    </span>
                  </label>
                  <button
                    type="button"
                    disabled={!acceptConfirmChecked || accepting}
                    onClick={handleConfirmAccept}
                    className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                  >
                    {accepting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Accept &amp; Save Record</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Content Layout for Individual Policies */}
      {activeTab !== 'legal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Table of Contents */}
          <aside className="lg:col-span-4 lg:sticky lg:top-20">
            <div className="lg:hidden mb-3">
              <button
                type="button"
                onClick={() => setMobileTocOpen(!mobileTocOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-bold text-stone-900 dark:text-stone-100 shadow-2xs cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  <span>Table of Contents ({sections.length} sections)</span>
                </span>
                <ChevronRight
                  className={`w-4 h-4 text-stone-500 transition-transform ${
                    mobileTocOpen ? 'rotate-90' : ''
                  }`}
                />
              </button>
            </div>

            <nav
              aria-label="Legal Table of Contents"
              className={`${
                mobileTocOpen ? 'block' : 'hidden'
              } lg:block rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 p-4 sm:p-5 shadow-2xs max-h-[75vh] overflow-y-auto`}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-2 mb-3">
                Table of Contents
              </p>
              <ul className="space-y-1">
                {sections.map((section) => {
                  const isSelected = activeSectionId === section.id;
                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        onClick={() => scrollToSection(section.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-start gap-2.5 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-600/12 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 font-semibold'
                            : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                        }`}
                      >
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 shrink-0 w-6">
                          {section.number}.
                        </span>
                        <span className="leading-snug">{section.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          {/* Policy Clauses + Interactive Tools per Tab */}
          <div className="lg:col-span-8 space-y-5">
            {sections.map((section) => (
              <section
                key={section.id}
                id={`legal-section-${section.id}`}
                className="scroll-mt-24 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 p-6 sm:p-7 shadow-2xs space-y-4"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-bold shrink-0">
                    {section.number}
                  </span>
                  <div>
                    <h2 className="font-serif-display text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100">
                      {section.title}
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">{section.summary}</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                  {section.paragraphs.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>

                {section.bulletPoints && section.bulletPoints.length > 0 && (
                  <ul className="space-y-2.5 pl-1 pt-1">
                    {section.bulletPoints.map((bp, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0 mt-2" />
                        <span>{bp}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {section.callout && (
                  <div
                    className={`rounded-2xl p-4 border text-xs leading-relaxed ${
                      section.callout.type === 'safety'
                        ? 'bg-red-50/80 dark:bg-red-950/30 border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200'
                        : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-stone-800 dark:text-stone-200'
                    }`}
                  >
                    <p className="font-bold mb-1">{section.callout.title}</p>
                    <p>{section.callout.body}</p>
                  </div>
                )}
              </section>
            ))}

            {/* INTERACTIVE PANEL FOR COOKIE POLICY TAB */}
            {activeTab === 'cookies' && (
              <div className="rounded-3xl bg-white dark:bg-stone-900 border border-amber-200 dark:border-stone-800 p-6 sm:p-7 space-y-5 shadow-xs">
                <div>
                  <h3 className="font-serif-display text-xl font-bold text-stone-900 dark:text-stone-100">
                    Manage Cookie &amp; Local Storage Preferences
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    DellyChow uses zero third-party ad trackers. Control optional local caching below.
                  </p>
                </div>

                {cacheClearedMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold">
                    {cacheClearedMsg}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        Essential Authentication &amp; Security Storage (Required)
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Required for Firebase Auth sessions, legal consent checks, and account integrity.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase shrink-0">
                      Always Active
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        Functional Theme &amp; Offline Video Cache Storage
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Remembers Light/Dark mode and caches watched video metadata &amp; thumbnails offline via Service Worker.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateCookiePreferences(!cookiePreferences.functionalStorage)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                        cookiePreferences.functionalStorage
                          ? 'bg-amber-600 text-white'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {cookiePreferences.functionalStorage ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <span className="text-[11px] text-stone-400">
                    Preference last updated: {new Date(cookiePreferences.updatedAt).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearOfflineCaches}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Offline Video Cache</span>
                  </button>
                </div>
              </div>
            )}

            {/* INTERACTIVE PANEL FOR COPYRIGHT & IP TAB */}
            {activeTab === 'copyright' && (
              <div className="space-y-6">
                <form
                  onSubmit={handleSubmitCopyrightClaim}
                  className="rounded-3xl bg-white dark:bg-stone-900 border border-amber-200 dark:border-stone-800 p-6 sm:p-7 space-y-4 shadow-xs"
                >
                  <div>
                    <h3 className="font-serif-display text-xl font-bold text-stone-900 dark:text-stone-100">
                      Submit a Copyright or Creator Impersonation Claim
                    </h3>
                    <p className="text-xs text-stone-500 mt-1">
                      Verified by DellyChow administrators prior to removal — no unverified automatic takedowns.
                    </p>
                  </div>

                  {cpSuccessId && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                      Copyright claim logged under reference <strong className="font-mono">{cpSuccessId}</strong>. Track review progress below.
                    </div>
                  )}

                  {cpError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                      {cpError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Infringement Type *
                      </label>
                      <select
                        value={cpViolationType}
                        onChange={(e) => setCpViolationType(e.target.value as any)}
                        className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                      >
                        <option value="stolen_video">Re-uploaded / Stolen Cooking Video</option>
                        <option value="unauthorized_image">Unauthorized Recipe Photography</option>
                        <option value="copied_recipe">Copied Culinary Content / Text</option>
                        <option value="copyrighted_music">Unauthorized Copyrighted Music</option>
                        <option value="creator_impersonation">Creator Profile Impersonation</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Reported Item Type *
                      </label>
                      <select
                        value={cpTargetType}
                        onChange={(e) => setCpTargetType(e.target.value as any)}
                        className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                      >
                        <option value="video">Cooking Video</option>
                        <option value="recipe">Recipe Page</option>
                        <option value="chef_profile">Chef Profile</option>
                        <option value="user_profile">Food Lover Profile</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Reported Content Title / Chef Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={cpTargetTitle}
                        onChange={(e) => setCpTargetTitle(e.target.value)}
                        placeholder="Title of video, recipe, or profile"
                        className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Reported DellyChow URL or ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={cpReportedUrl}
                        onChange={(e) => setCpReportedUrl(e.target.value)}
                        placeholder="e.g. https://.../?video=... or item ID"
                        className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Original Work Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={cpOriginalTitle}
                        onChange={(e) => setCpOriginalTitle(e.target.value)}
                        placeholder="Name of your original video, photo, or recipe"
                        className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Proof / Original Publication URL (optional)
                      </label>
                      <input
                        type="text"
                        value={cpOriginalUrl}
                        onChange={(e) => setCpOriginalUrl(e.target.value)}
                        placeholder="Link to original work or archive"
                        className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Ownership Proof &amp; Infringement Explanation *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={cpOriginalDesc}
                      onChange={(e) => setCpOriginalDesc(e.target.value)}
                      placeholder="Describe original creation date, ownership details, and what portion was copied..."
                      className="w-full text-xs p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                    />
                  </div>

                  <label className="flex items-start gap-2.5 text-xs text-stone-700 dark:text-stone-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cpGoodFaith}
                      onChange={(e) => setCpGoodFaith(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-stone-300 text-amber-600"
                    />
                    <span>
                      Good-Faith Declaration: I declare in good faith that I am the rights holder (or authorized representative), the reported use is unauthorized, and the details provided are accurate under the Nigerian Copyright Act 2022.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={cpSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                  >
                    {cpSubmitting ? 'Submitting Claim...' : 'Submit Copyright Claim'}
                  </button>
                </form>

                {currentUser && myCopyrightClaims.length > 0 && (
                  <div className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-3">
                    <h4 className="font-serif-display text-base font-bold text-stone-900 dark:text-stone-100">
                      My Submitted Copyright Claims ({myCopyrightClaims.length})
                    </h4>
                    {myCopyrightClaims.map((claim) => (
                      <div
                        key={claim.id}
                        className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold">{claim.reportedTargetTitle || claim.originalWorkTitle}</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                            {claim.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {claim.adminDecisionNotes && (
                          <p className="text-stone-600 dark:text-stone-300">
                            Decision Note: {claim.adminDecisionNotes}
                          </p>
                        )}
                        {!claim.counterNoticeText && (
                          <div className="flex gap-2 pt-1">
                            <input
                              type="text"
                              value={counterNoticeDrafts[claim.id] || ''}
                              onChange={(e) =>
                                setCounterNoticeDrafts((p) => ({ ...p, [claim.id]: e.target.value }))
                              }
                              placeholder="Optional dispute / counter-notice clarification..."
                              className="flex-1 px-3 py-1.5 rounded-lg border border-stone-200 bg-white dark:bg-stone-900 text-xs"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                const text = counterNoticeDrafts[claim.id]?.trim();
                                if (!text) return;
                                await LegalService.submitCopyrightCounterNotice(claim.id, text);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-[11px] font-semibold cursor-pointer"
                            >
                              Add Response
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* INTERACTIVE PANEL FOR REPORTING & APPEALS TAB */}
            {activeTab === 'reporting' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <form
                    onSubmit={handleSubmitReport}
                    className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-3.5"
                  >
                    <h3 className="font-serif-display text-lg font-bold text-stone-900 dark:text-stone-100">
                      Report Content, Link or User
                    </h3>
                    {repSuccessId && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                        Private report submitted (<strong className="font-mono">{repSuccessId}</strong>).
                      </div>
                    )}
                    {repError && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                        {repError}
                      </div>
                    )}
                    <select
                      value={repTargetType}
                      onChange={(e) => setRepTargetType(e.target.value as any)}
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                    >
                      <option value="video">Video</option>
                      <option value="recipe">Recipe</option>
                      <option value="video_comment">Video Comment</option>
                      <option value="recipe_comment">Recipe Comment</option>
                      <option value="chef_profile">Chef Profile</option>
                      <option value="user_profile">Food Lover Profile</option>
                      <option value="external_link">Suspicious External Link</option>
                    </select>
                    <input
                      type="text"
                      value={repTargetTitle}
                      onChange={(e) => setRepTargetTitle(e.target.value)}
                      placeholder="Title, username, or link URL *"
                      required
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                    />
                    <select
                      value={repReason}
                      onChange={(e) => setRepReason(e.target.value as any)}
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                    >
                      <option value="harassment">Harassment or Abuse</option>
                      <option value="spam">Spam or Manipulation</option>
                      <option value="fraud">Scam or Fraud</option>
                      <option value="suspicious_link">Suspicious Link</option>
                      <option value="food_safety_hazard">Food Safety Hazard</option>
                      <option value="impersonation">Impersonation</option>
                      <option value="inappropriate_minor_contact">Child/Teen Safety</option>
                      <option value="other">Other Violation</option>
                    </select>
                    <textarea
                      rows={3}
                      required
                      value={repDetails}
                      onChange={(e) => setRepDetails(e.target.value)}
                      placeholder="Describe the violation..."
                      className="w-full text-xs p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                    />
                    <button
                      type="submit"
                      disabled={repSubmitting}
                      className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      {repSubmitting ? 'Submitting...' : 'Submit Private Report'}
                    </button>
                  </form>

                  <form
                    onSubmit={handleSubmitAppeal}
                    className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-3.5"
                  >
                    <h3 className="font-serif-display text-lg font-bold text-stone-900 dark:text-stone-100">
                      Appeal a Moderation Decision
                    </h3>
                    {appealSuccessId && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                        Appeal logged (<strong className="font-mono">{appealSuccessId}</strong>).
                      </div>
                    )}
                    <select
                      value={appealTargetType}
                      onChange={(e) => setAppealTargetType(e.target.value as any)}
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                    >
                      <option value="account">Account Restriction / Suspension</option>
                      <option value="video">Removed Video</option>
                      <option value="recipe">Removed Recipe</option>
                      <option value="comment">Removed Comment</option>
                      <option value="copyright">Copyright Decision</option>
                    </select>
                    <input
                      type="text"
                      value={appealTargetId}
                      onChange={(e) => setAppealTargetId(e.target.value)}
                      placeholder="Content Title or Reference ID *"
                      required
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                    />
                    <textarea
                      rows={5}
                      required
                      value={appealReason}
                      onChange={(e) => setAppealReason(e.target.value)}
                      placeholder="Explain why you believe this moderation decision should be reconsidered..."
                      className="w-full text-xs p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                    />
                    <button
                      type="submit"
                      disabled={appealSubmitting}
                      className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold cursor-pointer"
                    >
                      {appealSubmitting ? 'Submitting...' : 'Submit Appeal'}
                    </button>
                  </form>
                </div>

                {currentUser && (myReports.length > 0 || myAppeals.length > 0) && (
                  <div className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4">
                    <h4 className="font-serif-display text-base font-bold text-stone-900 dark:text-stone-100">
                      My Private Safety Reports &amp; Appeals ({myReports.length + myAppeals.length})
                    </h4>
                    <div className="space-y-2.5">
                      {myReports.map((r) => (
                        <div
                          key={r.id}
                          className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 text-xs flex flex-wrap items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-bold">Report: {r.targetTitle || r.targetId}</span>
                            <span className="ml-2 text-stone-500">({r.reason.replace(/_/g, ' ')})</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                            {r.status}
                          </span>
                        </div>
                      ))}
                      {myAppeals.map((a) => (
                        <div
                          key={a.id}
                          className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 text-xs flex flex-wrap items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-bold">Appeal: {a.targetId}</span>
                            {a.adminResponse && (
                              <p className="text-[11px] text-stone-500 mt-0.5">Response: {a.adminResponse}</p>
                            )}
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                            {a.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* INTERACTIVE PANEL FOR CONTACT & LEGAL SUPPORT TAB */}
            {activeTab === 'contact' && (
              <form
                onSubmit={handleSubmitContactEnquiry}
                className="rounded-3xl bg-white dark:bg-stone-900 border border-amber-200 dark:border-stone-800 p-6 sm:p-7 space-y-4 shadow-xs"
              >
                <div>
                  <h3 className="font-serif-display text-xl font-bold text-stone-900 dark:text-stone-100">
                    Central Legal, Privacy &amp; Complaints Submission
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Submit structured Account, Privacy/NDPA, Copyright, Content, Technical, or General enquiries with instant confirmation reference.
                  </p>
                </div>

                {contactRefId && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                    <p className="font-bold">Submission Received</p>
                    <p>
                      Confirmation Reference: <strong className="font-mono">{contactRefId}</strong>
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Your Full Name *"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Reply Email Address *"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <select
                    value={contactCategory}
                    onChange={(e) => setContactCategory(e.target.value as any)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  >
                    <option value="account">Account Issues</option>
                    <option value="privacy">Privacy &amp; Data Protection (NDPA)</option>
                    <option value="copyright">Copyright Complaints</option>
                    <option value="complaint">Content Reports &amp; Community</option>
                    <option value="technical">Technical Support</option>
                    <option value="general">General Enquiries</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    placeholder="Subject *"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                </div>

                <textarea
                  rows={4}
                  required
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Provide full details of your enquiry or formal legal/privacy request..."
                  className="w-full text-xs p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                />

                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                >
                  {contactSubmitting ? 'Sending...' : 'Submit Legal / Support Enquiry'}
                </button>
              </form>
            )}

            {/* Related Policies Links */}
            {currentMeta && currentMeta.related.length > 0 && (
              <div className="rounded-3xl bg-[#FAF7F2] dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 p-5 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Related DellyChow Policies
                </p>
                <div className="flex flex-wrap gap-2">
                  {currentMeta.related.map((relKey) => (
                    <button
                      key={relKey}
                      type="button"
                      onClick={() => handleSelectPolicy(relKey)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:border-amber-500 cursor-pointer"
                    >
                      <span>{LEGAL_POLICY_DIRECTORY[relKey].title}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Support / Report CTA Card */}
            <div className="rounded-3xl bg-stone-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-serif-display text-lg font-bold">
                  Need Immediate Live Support or Ticket Tracking?
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed max-w-xl">
                  Connect with DellyChow Live Support, browse FAQs, or monitor existing tickets anytime.
                </p>
              </div>
              {onOpenSupportModal && (
                <button
                  type="button"
                  onClick={onOpenSupportModal}
                  className="px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors shrink-0 cursor-pointer"
                >
                  Open Live Support &amp; FAQ
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
