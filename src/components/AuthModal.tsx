import React, { useState, useEffect } from 'react';
import { 
  X, 
  UtensilsCrossed, 
  ChefHat, 
  User, 
  Sparkles, 
  Check, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  Copy,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { LegalDocumentTab } from '../data/legalDocuments';
import { LegalAcceptanceModal } from './LegalAcceptanceModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  initialRole?: UserRole;
  promptMessage?: string;
  onLoginSuccess?: (role: UserRole) => void;
  onOpenForgotPassword?: () => void;
  onOpenFullLegal?: (tab: LegalDocumentTab) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  initialRole = 'user',
  promptMessage,
  onLoginSuccess,
  onOpenForgotPassword,
  onOpenFullLegal
}) => {
  const { login, createAccount, signInWithGoogle, pendingAction, executePendingAction } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);

  // Form Fields
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Age & Child/Teen Protection bracket (signup only)
  const [ageGroup, setAgeGroup] = useState<'adult_18_plus' | 'teen_13_17'>('adult_18_plus');
  const [parentalConsentConfirmed, setParentalConsentConfirmed] = useState(false);

  // Explicit legal consent state (never auto-checked)
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [legalPreviewTab, setLegalPreviewTab] = useState<LegalDocumentTab | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isExistingEmailError, setIsExistingEmailError] = useState(false);
  const [domainError, setDomainError] = useState<{ hostname: string; projectId: string } | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setSelectedRole(initialRole);
    setErrorMsg('');
    setTermsError('');
    setAgreedToTerms(false);
    setParentalConsentConfirmed(false);
    setAgeGroup('adult_18_plus');
    setLegalPreviewTab(null);
    setIsExistingEmailError(false);
    setDomainError(null);
  }, [initialMode, initialRole, isOpen]);

  if (!isOpen) return null;

  const validateSignupLegalConsent = (): boolean => {
    if (!agreedToTerms) {
      setTermsError(
        "Please read and agree to DellyChow's Terms and Conditions, Privacy Policy and Community Guidelines before creating an account."
      );
      return false;
    }
    if (ageGroup === 'teen_13_17' && !parentalConsentConfirmed) {
      setTermsError(
        'Teen accounts (ages 13–17) require parent or legal guardian consent confirmation before creating an account.'
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setTermsError('');
    setIsExistingEmailError(false);

    if (mode === 'signup' && !validateSignupLegalConsent()) {
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }
        const profile = await createAccount(
          email.trim(),
          password,
          displayName.trim(),
          selectedRole,
          specialty.trim(),
          agreedToTerms,
          { ageGroup, parentalConsentConfirmed }
        );
        onClose();
        if (pendingAction) {
          await executePendingAction();
        }
        if (onLoginSuccess) {
          onLoginSuccess(profile.role);
        }
      } else {
        // Log in
        const profile = await login(email.trim(), password);
        onClose();
        if (pendingAction) {
          await executePendingAction();
        }
        if (onLoginSuccess) {
          onLoginSuccess(profile.role);
        }
      }
    } catch (err: any) {
      console.warn('Authentication notice:', err?.code || err?.message);
      let message = err.message || 'Authentication failed. Please verify your credentials.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        message = 'Invalid email or password. If you don\'t have an account, click "Create Account".';
      } else if (err.code === 'auth/email-already-in-use') {
        setIsExistingEmailError(true);
        message = 'This email is already registered on DellyChow.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password is too weak. Please use at least 6 characters.';
      } else if (err.code === 'auth/operation-not-allowed') {
        message = 'Email & password registration is restricted by project settings. Please use Google Login below.';
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToLoginWithExisting = async () => {
    setMode('login');
    setErrorMsg('');
    setIsExistingEmailError(false);
    if (password && password.length >= 6) {
      setLoading(true);
      try {
        const profile = await login(email.trim(), password);
        onClose();
        if (pendingAction) {
          await executePendingAction();
        }
        if (onLoginSuccess) {
          onLoginSuccess(profile.role);
        }
      } catch (loginErr: any) {
        console.warn('Direct login attempt notice:', loginErr?.code || loginErr?.message);
        setErrorMsg('Please enter your password to log in.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCopyHostname = async () => {
    if (!domainError?.hostname) return;
    try {
      await navigator.clipboard.writeText(domainError.hostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setTermsError('');
    setDomainError(null);

    if (mode === 'signup' && !validateSignupLegalConsent()) {
      return;
    }

    setLoading(true);
    try {
      const profile = await signInWithGoogle(
        selectedRole,
        mode === 'signup' ? agreedToTerms : false,
        mode === 'signup' ? { ageGroup, parentalConsentConfirmed } : undefined
      );
      onClose();
      if (pendingAction) {
        await executePendingAction();
      }
      if (onLoginSuccess && profile) {
        onLoginSuccess(profile.role);
      }
    } catch (err: any) {
      console.warn("Google authentication error:", err);
      if (err.code === 'auth/unauthorized-domain' || (err.message && err.message.includes('unauthorized-domain'))) {
        setDomainError({
          hostname: typeof window !== 'undefined' ? window.location.hostname : '',
          projectId: 'charged-art-wghtt'
        });
      } else {
        setErrorMsg(err.message || 'Google sign in was cancelled.');
      }
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
          aria-label="Close authentication modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="pt-8 px-6 pb-4 sm:px-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
            <UtensilsCrossed className="w-6 h-6" />
          </div>

          <h3 className="font-serif-display text-2xl font-bold text-stone-900">
            {mode === 'signup' ? 'Create Your Account' : 'Log In to DellyChow'}
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            {mode === 'signup'
              ? 'Join as a Chef to publish recipes, or as a Food Lover to explore meals.'
              : 'Sign in to access your culinary dashboard, favourites, and VIP kitchen circles.'}
          </p>

          {promptMessage && !pendingAction && (
            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-left flex items-center gap-2 text-xs text-amber-900 animate-in fade-in">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-medium">{promptMessage}</span>
            </div>
          )}

          {pendingAction && (
            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-left flex items-center gap-2 text-xs text-amber-900 animate-in fade-in">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-medium">
                {pendingAction.type === 'watch_video' && `Creating an account or signing in is required to watch "${pendingAction.video.title}". You will be redirected straight to playback!`}
                {pendingAction.type === 'comment_recipe' && 'Sign in to finish posting your cooking note!'}
                {pendingAction.type === 'comment_video' && 'Sign in to finish posting your video note!'}
                {pendingAction.type === 'like_video' && 'Sign in to like this cooking tutorial!'}
                {pendingAction.type === 'like_recipe' && 'Sign in to like this recipe!'}
                {pendingAction.type === 'follow_chef' && `Sign in to follow ${pendingAction.chefName}!`}
                {pendingAction.type === 'bookmark_video' && 'Sign in to bookmark this video to Favourites!'}
              </span>
            </div>
          )}

          {/* Segmented Mode Toggle */}
          <div className="flex p-1 bg-stone-100 rounded-xl mt-5">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); setTermsError(''); setIsExistingEmailError(false); setDomainError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMsg(''); setTermsError(''); setAgreedToTerms(false); setIsExistingEmailError(false); setDomainError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-6 sm:px-8 pb-8 pt-2 overflow-y-auto space-y-4">
          
          {domainError ? (
            <div className="p-3.5 bg-amber-50/95 text-stone-900 text-xs rounded-2xl border border-amber-300 space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <p className="font-bold text-stone-900">Authorize Domain for Google Sign-In</p>
                  <p className="text-stone-600 text-[11px] mt-0.5">
                    Firebase Auth requires this preview domain to be added to Authorized Domains in your Firebase project.
                  </p>
                </div>
              </div>

              <div className="bg-white p-2 rounded-xl border border-amber-200 flex items-center justify-between gap-2 shadow-2xs">
                <code className="font-mono text-[11px] text-stone-800 break-all select-all font-semibold">
                  {domainError.hostname}
                </code>
                <button
                  type="button"
                  onClick={handleCopyHostname}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-medium rounded-lg flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                >
                  {copiedDomain ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDomain ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              <div className="flex flex-col gap-1.5 pt-0.5">
                <a
                  href={`https://console.firebase.google.com/project/${domainError.projectId}/authentication/settings`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-xl text-xs transition-colors"
                >
                  <span>Open Firebase Authorized Domains</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <p className="text-[10px] text-stone-500 text-center">
                  Click <strong>Add domain</strong> and paste the domain above.
                </p>
              </div>

              <div className="border-t border-amber-200/80 pt-2 text-[11px] text-amber-950 font-medium text-center bg-amber-100/50 -mx-3.5 -mb-3.5 p-2 rounded-b-2xl">
                💡 Tip: You can also sign up or log in using <strong>Email &amp; Password</strong> above without domain setup!
              </div>
            </div>
          ) : isExistingEmailError ? (
            <div className="p-4 bg-amber-50/95 text-stone-900 text-xs rounded-2xl border border-amber-300 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-stone-900 text-xs">Account Already Registered</p>
                  <p className="text-stone-600 text-[11px] mt-0.5 leading-relaxed">
                    An account for <strong className="text-stone-900">{email}</strong> already exists on DellyChow.
                    {password ? ' Click below to log in with your entered password.' : ' Please switch to log in.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSwitchToLoginWithExisting}
                  className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs text-center transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{password ? 'Log In with Entered Password' : 'Switch to Log In'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {onOpenForgotPassword && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenForgotPassword();
                    }}
                    className="py-2 px-3 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 font-semibold rounded-xl text-xs text-center transition-colors cursor-pointer"
                  >
                    Reset Password
                  </button>
                )}
              </div>
            </div>
          ) : errorMsg ? (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 leading-relaxed">
              {errorMsg}
            </div>
          ) : null}

          {/* Role Selector (visible during Create Account) */}
          {mode === 'signup' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                Choose Account Type *
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Food Lover Role Card */}
                <button
                  type="button"
                  onClick={() => setSelectedRole('user')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedRole === 'user'
                      ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-600/20'
                      : 'border-stone-200 bg-stone-50/50 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <User className={`w-4 h-4 ${selectedRole === 'user' ? 'text-amber-700' : 'text-stone-500'}`} />
                    <span className="font-serif-display text-xs font-bold text-stone-900">Food Lover</span>
                  </div>
                  <p className="text-[10px] text-stone-500 leading-tight">
                    Browse meals, view recipes, bookmark, and rate dishes
                  </p>
                </button>

                {/* Chef Role Card */}
                <button
                  type="button"
                  onClick={() => setSelectedRole('chef')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedRole === 'chef'
                      ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-600/20'
                      : 'border-stone-200 bg-stone-50/50 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ChefHat className={`w-4 h-4 ${selectedRole === 'chef' ? 'text-amber-700' : 'text-stone-500'}`} />
                    <span className="font-serif-display text-xs font-bold text-stone-900">Chef / Creator</span>
                  </div>
                  <p className="text-[10px] text-stone-500 leading-tight">
                    Publish recipes, upload cooking videos & host VIP kitchen
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  {selectedRole === 'chef' ? 'Chef Name / Culinary Brand *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={selectedRole === 'chef' ? 'e.g. Chef Marcus Vance' : 'e.g. Clara Gomez'}
                  required
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
                />
              </div>
            )}

            {mode === 'signup' && selectedRole === 'chef' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Culinary Specialty
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g. Handmade Pasta & French Bistro Pastry"
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (isExistingEmailError) setIsExistingEmailError(false);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="chef@dellychow.com"
                  required
                  className="w-full text-xs sm:text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full text-xs sm:text-sm pl-10 pr-10 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {mode === 'login' && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenForgotPassword?.();
                    }}
                    className="text-xs text-amber-700 hover:text-amber-800 font-medium hover:underline transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            {/* Child/Teen Protection & Explicit Policy Acceptance (Required for Sign Up) */}
            {mode === 'signup' && (
              <div className="pt-1 space-y-2.5">
                {/* Age bracket */}
                <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-stone-700">
                    <span>Age Verification</span>
                    <div className="flex items-center gap-1 bg-stone-200/70 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setAgeGroup('adult_18_plus');
                          setTermsError('');
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                          ageGroup === 'adult_18_plus'
                            ? 'bg-white text-stone-900 shadow-2xs'
                            : 'text-stone-600'
                        }`}
                      >
                        18+ Adult
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAgeGroup('teen_13_17');
                          setTermsError('');
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                          ageGroup === 'teen_13_17'
                            ? 'bg-white text-amber-800 shadow-2xs'
                            : 'text-stone-600'
                        }`}
                      >
                        Teen (13–17)
                      </button>
                    </div>
                  </div>

                  {ageGroup === 'teen_13_17' && (
                    <label className="flex items-start gap-2 text-[11px] text-stone-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={parentalConsentConfirmed}
                        onChange={(e) => {
                          setParentalConsentConfirmed(e.target.checked);
                          if (e.target.checked) setTermsError('');
                        }}
                        className="mt-0.5 h-3.5 w-3.5 rounded border-stone-300 text-amber-600 focus:ring-amber-500 shrink-0 cursor-pointer"
                      />
                      <span>
                        I confirm I am aged 13–17 and have verifiable parent/legal guardian permission (with teen privacy defaults enabled).
                      </span>
                    </label>
                  )}
                </div>

                {/* Required Sign-Up Notice */}
                <p className="text-[11px] text-stone-600 leading-relaxed px-0.5">
                  By creating an account, you acknowledge that you have read and agree to DellyChow&apos;s{' '}
                  <button
                    type="button"
                    onClick={() => setLegalPreviewTab('terms')}
                    className="font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-2 cursor-pointer"
                  >
                    Terms and Conditions
                  </button>
                  ,{' '}
                  <button
                    type="button"
                    onClick={() => setLegalPreviewTab('privacy')}
                    className="font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-2 cursor-pointer"
                  >
                    Privacy Policy
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={() => setLegalPreviewTab('guidelines')}
                    className="font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-2 cursor-pointer"
                  >
                    Community Guidelines
                  </button>
                  .
                </p>

                {/* Always-visible unchecked acceptance checkbox */}
                <label
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs leading-relaxed cursor-pointer select-none transition-colors ${
                    termsError
                      ? 'border-red-300 bg-red-50/70 text-red-900'
                      : agreedToTerms
                      ? 'border-amber-500/60 bg-amber-50/50 text-stone-800'
                      : 'border-stone-200 bg-stone-50/80 text-stone-700 hover:border-stone-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked);
                      if (e.target.checked) setTermsError('');
                    }}
                    aria-required="true"
                    className="mt-0.5 h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 shrink-0 cursor-pointer"
                  />
                  <span>
                    I have read and agree to DellyChow&apos;s{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLegalPreviewTab('terms');
                      }}
                      className="font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-2 cursor-pointer"
                    >
                      Terms and Conditions
                    </button>
                    ,{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLegalPreviewTab('privacy');
                      }}
                      className="font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-2 cursor-pointer"
                    >
                      Privacy Policy
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLegalPreviewTab('guidelines');
                      }}
                      className="font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-2 cursor-pointer"
                    >
                      Community Guidelines
                    </button>
                    .
                  </span>
                </label>

                {termsError && (
                  <p role="alert" className="text-[11px] font-medium text-red-600 px-1">
                    {termsError}
                  </p>
                )}
              </div>
            )}

            {/* Sign-In Short Legal Notice */}
            {mode === 'login' && (
              <p className="text-[11px] text-stone-500 leading-relaxed text-center px-1">
                By using DellyChow, you agree to our{' '}
                <button
                  type="button"
                  onClick={() => setLegalPreviewTab('terms')}
                  className="font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-2 cursor-pointer"
                >
                  Terms and Conditions
                </button>{' '}
                and acknowledge our{' '}
                <button
                  type="button"
                  onClick={() => setLegalPreviewTab('privacy')}
                  className="font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-2 cursor-pointer"
                >
                  Privacy Policy
                </button>
                .
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              <span>
                {loading
                  ? 'Processing...'
                  : mode === 'signup'
                  ? selectedRole === 'chef'
                    ? 'Create Chef Account & Studio'
                    : 'Create Food Lover Account'
                  : 'Log In'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-3 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200" />
            </div>
            <span className="relative bg-white px-3 text-[11px] text-stone-400 uppercase tracking-wider font-medium">
              or continue with
            </span>
          </div>

          {/* Google Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleAuth}
            className="w-full py-2.5 px-4 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2.5 text-xs disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>
              {mode === 'signup'
                ? `Sign Up with Google as ${selectedRole === 'chef' ? 'Chef' : 'User'}`
                : 'Log In with Google'}
            </span>
          </button>

          {/* Switch mode footer */}
          <div className="pt-2 text-center text-xs text-stone-500">
            {mode === 'signup' ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(''); setTermsError(''); }}
                  className="text-amber-700 font-semibold hover:underline"
                >
                  Log In
                </button>
              </p>
            ) : (
              <p>
                Don&apos;t have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setErrorMsg(''); setTermsError(''); setAgreedToTerms(false); }}
                  className="text-amber-700 font-semibold hover:underline"
                >
                  Create an Account
                </button>
              </p>
            )}
          </div>

        </div>
      </div>

      {/* Inline Policy Preview Modal (Preserves typed signup fields) */}
      <LegalAcceptanceModal
        isOpen={legalPreviewTab !== null}
        mode="preview"
        initialTab={legalPreviewTab || 'terms'}
        onClose={() => setLegalPreviewTab(null)}
        onOpenFullPage={
          onOpenFullLegal
            ? (tab) => {
                setLegalPreviewTab(null);
                onClose();
                onOpenFullLegal(tab);
              }
            : undefined
        }
      />
    </div>
  );
};
