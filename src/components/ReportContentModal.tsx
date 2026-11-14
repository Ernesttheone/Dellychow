import React, { useState, useEffect } from 'react';
import {
  X,
  Flag,
  Ban,
  Copyright,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { ModerationReport } from '../types';
import { useAuth } from '../context/AuthContext';
import { LegalService } from '../services/legalService';

export interface ReportTarget {
  targetType: ModerationReport['targetType'];
  targetId: string;
  targetTitle?: string;
  targetAuthorId?: string;
  targetAuthorName?: string;
}

interface ReportContentModalProps {
  isOpen: boolean;
  target: ReportTarget | null;
  onClose: () => void;
  onOpenAuthModal?: (mode?: 'login' | 'signup') => void;
  onOpenCopyrightClaim?: (target: ReportTarget) => void;
  onViewMyReports?: () => void;
}

const REPORT_REASONS: Array<{ value: ModerationReport['reason']; label: string }> = [
  { value: 'harassment', label: 'Harassment, Hate Speech or Abuse' },
  { value: 'spam', label: 'Spam, Promotional Flooding or Manipulation' },
  { value: 'fraud', label: 'Scam, Phishing or Fraudulent Offer' },
  { value: 'suspicious_link', label: 'Suspicious or Unsafe External Link' },
  { value: 'copyright_violation', label: 'Stolen Video, Recipe, Photo or Audio' },
  { value: 'impersonation', label: 'Creator or User Impersonation' },
  { value: 'food_safety_hazard', label: 'Unsafe Food Practice or Hazardous Claim' },
  { value: 'inappropriate_minor_contact', label: 'Child / Teen Safety Concern' },
  { value: 'other', label: 'Other Community Guideline Violation' },
];

export const ReportContentModal: React.FC<ReportContentModalProps> = ({
  isOpen,
  target,
  onClose,
  onOpenAuthModal,
  onOpenCopyrightClaim,
  onViewMyReports,
}) => {
  const { currentUser, userProfile, blockUser, blockedUserIds } = useAuth();
  const [reason, setReason] = useState<ModerationReport['reason']>('harassment');
  const [details, setDetails] = useState('');
  const [alsoBlockAuthor, setAlsoBlockAuthor] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('harassment');
      setDetails('');
      setAlsoBlockAuthor(false);
      setSubmitting(false);
      setSubmittedId(null);
      setError(null);
    }
  }, [isOpen, target?.targetId]);

  if (!isOpen || !target) return null;

  const canBlockAuthor = Boolean(
    target.targetAuthorId &&
      currentUser &&
      target.targetAuthorId !== currentUser.uid &&
      !blockedUserIds.includes(target.targetAuthorId)
  );

  const isAlreadyBlocked = Boolean(
    target.targetAuthorId && blockedUserIds.includes(target.targetAuthorId)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentUser) {
      onClose();
      onOpenAuthModal?.('login');
      return;
    }

    if (details.trim().length < 10) {
      setError('Please describe the issue briefly (at least 10 characters) so our moderation team can investigate.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await LegalService.submitModerationReport({
        reporterId: currentUser.uid,
        reporterName: userProfile?.displayName || currentUser.displayName || 'Community Member',
        targetType: target.targetType,
        targetId: target.targetId,
        targetTitle: target.targetTitle,
        targetAuthorId: target.targetAuthorId,
        reason,
        details: details.trim(),
      });

      if (alsoBlockAuthor && canBlockAuthor && target.targetAuthorId) {
        await blockUser(target.targetAuthorId, target.targetAuthorName, `Blocked during report (${reason})`);
      }

      setSubmittedId(res.id);
    } catch (err: any) {
      setError(err?.message || 'Unable to submit report right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickBlockOnly = async () => {
    if (!currentUser) {
      onClose();
      onOpenAuthModal?.('login');
      return;
    }
    if (!target.targetAuthorId) return;
    setSubmitting(true);
    try {
      await blockUser(target.targetAuthorId, target.targetAuthorName, 'Blocked via safety menu');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center shrink-0">
              <Flag className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif-display text-base font-bold text-stone-900 dark:text-stone-100 truncate">
                Safety &amp; Moderation Report
              </h3>
              <p className="text-[11px] text-stone-500 truncate">
                {target.targetTitle || `Reporting ${target.targetType.replace('_', ' ')}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close report dialog"
            className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-900 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {submittedId ? (
            <div className="p-6 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="font-serif-display text-lg font-bold text-stone-900 dark:text-stone-100">
                Report Received Privately
              </h4>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                Reference <span className="font-mono font-bold">{submittedId}</span>. Your report is visible only to authorized DellyChow moderation administrators and is never exposed publicly to other users.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {onViewMyReports && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewMyReports();
                    }}
                    className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold cursor-pointer"
                  >
                    Track My Reports
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : !currentUser ? (
            <div className="p-6 rounded-2xl bg-amber-50/60 border border-amber-200 text-center space-y-3">
              <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto" />
              <h4 className="font-serif-display text-base font-bold text-stone-900">
                Sign In to Submit a Private Report
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Signing in links the private report confirmation to your account so you can track moderation status updates securely.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuthModal?.('login');
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
              >
                Sign In to Report
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-300 mb-1.5">
                    Reason for Report *
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as ModerationReport['reason'])}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {REPORT_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {(reason === 'copyright_violation' || reason === 'impersonation') && onOpenCopyrightClaim && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-3">
                    <div className="text-[11px] text-stone-700 dark:text-stone-200">
                      <span className="font-bold block">Filing an IP or Creator Impersonation Claim?</span>
                      <span>Use our dedicated Copyright Claim form with good-faith evidence declaration.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCopyrightClaim(target);
                      }}
                      className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold shrink-0 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Copyright className="w-3.5 h-3.5" />
                      <span>Copyright Form</span>
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-300 mb-1.5">
                    Details &amp; Context *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    maxLength={1200}
                    placeholder="Explain what happened, timestamps if video, or why this violates DellyChow Community Guidelines..."
                    className="w-full text-xs p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {canBlockAuthor && (
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 text-xs text-stone-700 dark:text-stone-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alsoBlockAuthor}
                      onChange={(e) => setAlsoBlockAuthor(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span>
                      Also block <strong>{target.targetAuthorName || 'this user'}</strong> so their comments and notes are hidden from my feed.
                    </span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Report...</span>
                    </>
                  ) : (
                    <>
                      <Flag className="w-4 h-4" />
                      <span>Submit Private Moderation Report</span>
                    </>
                  )}
                </button>
              </form>

              {/* Quick Block Action */}
              {target.targetAuthorId && target.targetAuthorId !== currentUser.uid && (
                <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-stone-500">
                    {isAlreadyBlocked
                      ? `You already blocked ${target.targetAuthorName || 'this user'}.`
                      : `Prefer just to hide ${target.targetAuthorName || 'this user'} without reporting?`}
                  </div>
                  {!isAlreadyBlocked && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleQuickBlockOnly}
                      className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5 text-stone-500" />
                      <span>Block User</span>
                    </button>
                  )}
                </div>
              )}

              {onOpenCopyrightClaim && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCopyrightClaim(target);
                  }}
                  className="w-full text-[11px] text-amber-700 dark:text-amber-400 hover:underline flex items-center justify-center gap-1 pt-1 cursor-pointer"
                >
                  <span>Go to Copyright &amp; IP Infringement Form</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
