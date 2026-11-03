import React, { useState, useEffect } from 'react';
import { 
  X, 
  KeyRound, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  Clock,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
  initialCode?: string | null;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  onBackToLogin,
  initialCode = null
}) => {
  const { sendPasswordReset, verifyResetCode, confirmResetPassword } = useAuth();

  // Mode: 'request' (enter email) | 'reset' (enter new password) | 'success'
  const [mode, setMode] = useState<'request' | 'reset' | 'success'>('request');
  
  // Step 1: Request fields
  const [email, setEmail] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  
  // Rate limiting state: 60s cooldown timer
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [requestCount, setRequestCount] = useState<number>(0);

  // Step 2: Set New Password fields
  const [oobCode, setOobCode] = useState(initialCode || '');
  const [accountEmail, setAccountEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Handle incoming reset code from email link
  useEffect(() => {
    if (initialCode) {
      setOobCode(initialCode);
      setMode('reset');
      verifyCode(initialCode);
    } else {
      setMode('request');
    }
  }, [initialCode, isOpen]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  if (!isOpen) return null;

  // Verify the reset code when opening with code
  const verifyCode = async (codeToVerify: string) => {
    setErrorMsg('');
    setLoading(true);
    try {
      const emailFound = await verifyResetCode(codeToVerify);
      setAccountEmail(emailFound || '');
    } catch (err: any) {
      console.warn("Invalid or expired reset code:", err);
      let msg = 'This password recovery link has expired or has already been used. Please request a new recovery link below.';
      if (err.code === 'auth/invalid-action-code') {
        msg = 'Invalid or expired recovery code. Please request a fresh password recovery link.';
      }
      setErrorMsg(msg);
      setMode('request');
    } finally {
      setLoading(false);
    }
  };

  // 1. Submit email to request password recovery link
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!email.trim()) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    // Rate limit check: max 5 requests per session, 60s cooldown
    if (cooldownSeconds > 0) {
      setErrorMsg(`Please wait ${cooldownSeconds} seconds before requesting another recovery email.`);
      return;
    }

    if (requestCount >= 5) {
      setErrorMsg('Too many recovery requests. For your security, please wait 15 minutes before trying again.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setRequestSent(true);
      setRequestCount(prev => prev + 1);
      setCooldownSeconds(60); // 60s security rate-limit cooldown
      // Security: Do not reveal whether an email address is registered
      setInfoMsg('If an account exists with this email address, a secure password recovery link has been sent. Please check your inbox and spam folder.');
    } catch (err: any) {
      console.error('Password reset request error:', err);
      setErrorMsg(err.message || 'Failed to send recovery link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit new password
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!oobCode.trim()) {
      setErrorMsg('Missing password reset verification code. Please request a new link.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    try {
      await confirmResetPassword(oobCode.trim(), newPassword);
      setMode('success');
    } catch (err: any) {
      console.error('Reset password error:', err);
      let msg = 'Failed to reset password. The link may have expired or was previously used.';
      if (err.code === 'auth/invalid-action-code' || err.code === 'auth/expired-action-code') {
        msg = 'This recovery link has expired or was already used. Please request a new recovery email.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use a stronger combination of letters and numbers.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-950/75 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-2xl max-w-md w-full flex flex-col relative max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors z-10"
          aria-label="Close recovery modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="pt-8 px-6 pb-4 sm:px-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
            <KeyRound className="w-6 h-6" />
          </div>

          <h3 className="font-serif-display text-2xl font-bold text-stone-900">
            {mode === 'success'
              ? 'Password Reset Complete'
              : mode === 'reset'
              ? 'Set New Password'
              : 'Recover Your Account'}
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            {mode === 'success'
              ? 'Your DellyChow account credentials have been securely updated.'
              : mode === 'reset'
              ? 'Enter and confirm your new secure account password below.'
              : 'Enter your registered email address to receive a secure recovery link.'}
          </p>
        </div>

        {/* Modal Body */}
        <div className="px-6 sm:px-8 pb-8 pt-2 overflow-y-auto space-y-4">
          
          {/* Error Notice */}
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2 leading-relaxed animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Info / Sent Notice */}
          {infoMsg && (
            <div className="p-3.5 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-start gap-2.5 leading-relaxed animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-900">Recovery Link Dispatched</p>
                <p className="mt-0.5 text-emerald-800">{infoMsg}</p>
              </div>
            </div>
          )}

          {/* MODE 1: REQUEST RECOVERY EMAIL */}
          {mode === 'request' && (
            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Registered Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. foodlover@dellychow.com"
                    required
                    disabled={loading || cooldownSeconds > 0}
                    className="w-full text-xs sm:text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50 disabled:opacity-60"
                  />
                </div>
                <p className="text-[11px] text-stone-400 mt-1">
                  We will send a unique, time-limited reset link to this email address.
                </p>
              </div>

              {/* Rate limit status */}
              {cooldownSeconds > 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Rate limit cooldown active</span>
                  </span>
                  <span className="font-bold tabular-nums">{cooldownSeconds}s</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || cooldownSeconds > 0}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Recovery Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Manual Code Option Toggle */}
              <div className="pt-2 text-center border-t border-stone-100 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setMode('reset');
                  }}
                  className="text-xs text-stone-500 hover:text-amber-800 font-medium transition-colors"
                >
                  Already have a recovery link code? <span className="underline font-semibold">Enter code here</span>
                </button>

                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 transition-colors pt-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Log In</span>
                </button>
              </div>
            </form>
          )}

          {/* MODE 2: SET NEW PASSWORD */}
          {mode === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              {accountEmail && (
                <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700">
                  <span className="text-stone-500">Resetting password for: </span>
                  <span className="font-bold text-stone-900">{accountEmail}</span>
                </div>
              )}

              {/* Recovery Code Field (if not already verified) */}
              {!initialCode && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Recovery Code (oobCode) *
                  </label>
                  <input
                    type="text"
                    value={oobCode}
                    onChange={(e) => setOobCode(e.target.value)}
                    placeholder="Paste recovery code from email URL"
                    required
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
                  />
                </div>
              )}

              {/* 1. New Password */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full text-xs sm:text-sm pl-10 pr-10 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 2. Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full text-xs sm:text-sm pl-10 pr-10 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[11px] text-red-600 mt-1">Passwords do not match yet.</p>
                )}
                {confirmPassword && newPassword === confirmPassword && (
                  <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Passwords match</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !newPassword || newPassword !== confirmPassword}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Reset Password</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center border-t border-stone-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMode('request')}
                  className="text-xs text-stone-500 hover:text-stone-800"
                >
                  Request another link
                </button>

                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="text-xs font-semibold text-stone-700 hover:text-stone-900 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Return to Log In</span>
                </button>
              </div>
            </form>
          )}

          {/* MODE 3: SUCCESS CONFIRMATION */}
          {mode === 'success' && (
            <div className="space-y-5 text-center py-2 animate-in fade-in">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto ring-4 ring-emerald-50">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h4 className="font-serif-display text-lg font-bold text-stone-900">
                  Password Updated Successfully
                </h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                  Your new password is now active. You can immediately return to the sign-in screen and log into your DellyChow account.
                </p>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Return to Log In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
