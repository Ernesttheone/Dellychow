import React, { useState, useEffect } from 'react';
import {
  X,
  Scale,
  ShieldCheck,
  Users,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Copyright,
  Utensils,
  Cookie,
  LogOut,
  FileDown,
} from 'lucide-react';
import {
  LEGAL_POLICY_DIRECTORY,
  POLICY_SECTIONS_MAP,
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
  CURRENT_GUIDELINES_VERSION,
  LegalDocumentTab,
} from '../data/legalDocuments';
import { BrandLogo } from './BrandLogo';

interface LegalAcceptanceModalProps {
  isOpen: boolean;
  mode: 'preview' | 'update_prompt';
  initialTab?: LegalDocumentTab;
  onClose: () => void;
  onOpenFullPage?: (tab: LegalDocumentTab) => void;
  onAcceptLatest?: () => Promise<void>;
  onDeclineLatest?: () => Promise<void>;
  onSignOutDeclined?: () => Promise<void>;
  onOpenAccountPrivacy?: () => void;
}

const MODAL_POLICY_TABS: Array<{
  key: 'terms' | 'privacy' | 'guidelines' | 'copyright' | 'food-safety' | 'cookies';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: 'terms', label: 'Terms', icon: Scale },
  { key: 'privacy', label: 'Privacy Policy', icon: ShieldCheck },
  { key: 'guidelines', label: 'Community Guidelines', icon: Users },
  { key: 'copyright', label: 'Copyright', icon: Copyright },
  { key: 'food-safety', label: 'Food Safety', icon: Utensils },
  { key: 'cookies', label: 'Cookies', icon: Cookie },
];

export const LegalAcceptanceModal: React.FC<LegalAcceptanceModalProps> = ({
  isOpen,
  mode,
  initialTab = 'terms',
  onClose,
  onOpenFullPage,
  onAcceptLatest,
  onDeclineLatest,
  onSignOutDeclined,
  onOpenAccountPrivacy,
}) => {
  const [activeTab, setActiveTab] = useState<LegalDocumentTab>(
    POLICY_SECTIONS_MAP[initialTab] ? initialTab : 'terms'
  );
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [declineViewOpen, setDeclineViewOpen] = useState(false);
  const [declineRecorded, setDeclineRecorded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(POLICY_SECTIONS_MAP[initialTab] ? initialTab : 'terms');
      setAgreed(false);
      setError(null);
      setSubmitting(false);
      setDeclineViewOpen(false);
      setDeclineRecorded(false);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const meta = LEGAL_POLICY_DIRECTORY[activeTab] || LEGAL_POLICY_DIRECTORY.terms;
  const sections = POLICY_SECTIONS_MAP[activeTab] || POLICY_SECTIONS_MAP.terms;

  const handleConfirmUpdate = async () => {
    if (!agreed) {
      setError('Please check the confirmation box to record your agreement.');
      return;
    }
    if (!onAcceptLatest) return;
    setSubmitting(true);
    setError(null);
    try {
      await onAcceptLatest();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not save your acceptance record. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDecline = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (onDeclineLatest) {
        await onDeclineLatest();
      }
      setDeclineRecorded(true);
    } catch (err: any) {
      setError(err?.message || 'Could not record decline status.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-[#FAF7F2] dark:bg-stone-900 rounded-3xl overflow-hidden shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-white dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo size="sm" />
            <div className="min-w-0">
              <h3 className="font-serif-display text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 truncate">
                {mode === 'update_prompt'
                  ? 'Updated DellyChow Legal Policies'
                  : `DellyChow ${meta.title}`}
              </h3>
              <p className="text-[11px] text-stone-500 truncate">
                Terms v{CURRENT_TERMS_VERSION} &bull; Privacy v{CURRENT_PRIVACY_VERSION} &bull; Guidelines v{CURRENT_GUIDELINES_VERSION}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close legal dialog"
            className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-900 flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Banner for Existing Users */}
        {mode === 'update_prompt' && !declineViewOpen && (
          <div className="px-5 py-3 bg-amber-50/80 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-800/50 text-xs text-stone-700 dark:text-stone-200 flex items-start gap-2.5 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              We&apos;ve updated DellyChow&apos;s Terms, Privacy Policy, and Community Guidelines to clarify creator content ownership, NDPA 2023 data rights, reporting, and food safety. Your recipes, videos, and profile stay completely intact.
            </p>
          </div>
        )}

        {/* Policy Selector Tabs (All 6 core policies) */}
        {!declineViewOpen && (
          <div className="px-5 pt-3 pb-2 flex flex-wrap items-center gap-1.5 border-b border-stone-200/70 dark:border-stone-800 bg-white/60 dark:bg-stone-900 shrink-0">
            {MODAL_POLICY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-stone-900 text-white dark:bg-amber-600'
                      : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 hover:bg-stone-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            {onOpenFullPage && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullPage(activeTab);
                }}
                className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
              >
                <span>Open Legal Centre</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Body */}
        {declineViewOpen ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="rounded-2xl bg-white dark:bg-stone-950/70 border border-amber-200 dark:border-stone-800 p-5 space-y-3">
              <h4 className="font-serif-display text-lg font-bold text-stone-900 dark:text-stone-100">
                {declineRecorded
                  ? 'Policy Decline Recorded'
                  : 'Declining Updated Legal Terms'}
              </h4>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                {declineRecorded
                  ? 'Your decline decision has been recorded securely without removing your uploaded content. Because continued interactive platform use requires acceptance of mandatory service terms, you may either export your personal data / request account deletion or sign out below.'
                  : 'If you prefer not to accept the updated Terms and Conditions, Privacy Policy, and Community Guidelines, your existing content and profile will not be erased automatically. You can record your decline and choose to export your data, request account deletion, or sign out.'}
              </p>

              {error && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {error}
                </div>
              )}

              <div className="flex flex-wrap gap-2.5 pt-2">
                {!declineRecorded && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleConfirmDecline}
                    className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    {submitting ? 'Recording...' : 'Confirm Decline'}
                  </button>
                )}

                {onOpenAccountPrivacy && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAccountPrivacy();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Data Export / Deletion Options</span>
                  </button>
                )}

                {onSignOutDeclined && (
                  <button
                    type="button"
                    onClick={async () => {
                      await onSignOutDeclined();
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setDeclineViewOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50 cursor-pointer ml-auto"
                >
                  Back to Policies
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="rounded-xl bg-white/80 dark:bg-stone-950/60 border border-stone-200/80 dark:border-stone-800 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500">
              <span>
                <strong className="text-stone-800 dark:text-stone-200">{meta.title}</strong> &bull; Version v{meta.version}
              </span>
              <span>Last Updated: {meta.lastUpdated}</span>
            </div>

            {sections.map((section) => (
              <div
                key={section.id}
                className="rounded-2xl bg-white dark:bg-stone-950/60 border border-stone-200/80 dark:border-stone-800 p-4 space-y-2"
              >
                <h4 className="font-serif-display text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
                  {section.number}. {section.title}
                </h4>
                {section.paragraphs.map((p, idx) => (
                  <p key={idx} className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                    {p}
                  </p>
                ))}
                {section.bulletPoints && section.bulletPoints.length > 0 && (
                  <ul className="space-y-1.5 pt-1">
                    {section.bulletPoints.map((bp, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-xs text-stone-600 dark:text-stone-300 leading-relaxed"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0 mt-1.5" />
                        <span>{bp}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {section.callout && (
                  <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 p-3 text-[11px] text-stone-700 dark:text-stone-200">
                    <span className="font-bold block mb-0.5">{section.callout.title}</span>
                    <span>{section.callout.body}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        {!declineViewOpen && (
          <div className="p-4 sm:p-5 bg-white dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 space-y-3 shrink-0">
            {mode === 'update_prompt' ? (
              <>
                {error && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                    {error}
                  </div>
                )}
                <label className="flex items-start gap-2.5 text-xs text-stone-700 dark:text-stone-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => {
                      setAgreed(e.target.checked);
                      if (e.target.checked) setError(null);
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span>
                    I have read and agree to DellyChow&apos;s Terms and Conditions (v{CURRENT_TERMS_VERSION}), Privacy Policy (v{CURRENT_PRIVACY_VERSION}), and Community Guidelines (v{CURRENT_GUIDELINES_VERSION}).
                  </span>
                </label>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setDeclineViewOpen(true)}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-stone-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer text-left sm:text-center"
                  >
                    Decline Update Options
                  </button>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
                    >
                      Remind Me Later
                    </button>
                    <button
                      type="button"
                      disabled={!agreed || submitting}
                      onClick={handleConfirmUpdate}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving Record...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Accept Policies &amp; Continue</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-stone-500">
                  Your form details are preserved. Return to check the agreement box.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold cursor-pointer shrink-0"
                >
                  Back to Form
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
