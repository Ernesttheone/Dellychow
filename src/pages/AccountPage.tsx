import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  ChefHat, 
  Bookmark, 
  Crown, 
  Save, 
  Camera, 
  Check, 
  ArrowRight,
  Upload,
  Trash2,
  Loader2,
  KeyRound,
  Scale,
  ShieldCheck,
  ShieldAlert,
  FileDown,
  Ban,
  Cookie,
  UserX,
  Lock,
  Flag,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_AVATARS } from '../constants/avatars';
import { processDeviceImage } from '../lib/imageUtils';
import {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
  hasAcceptedLatestLegal,
} from '../data/legalDocuments';
import { LegalService } from '../services/legalService';
import { PrivacyRequest, UserPrivacySettings } from '../types';

interface AccountPageProps {
  onNavigate: (view: string, params?: any) => void;
  onOpenAuthModal: (mode?: 'login' | 'signup') => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({ onNavigate, onOpenAuthModal }) => {
  const {
    currentUser,
    userProfile,
    isAdmin,
    updateProfileData,
    favourites,
    activeSubscriptions,
    sendPasswordReset,
    acceptLatestLegalTerms,
    blockedUsers,
    unblockUser,
    cookiePreferences,
    updateCookiePreferences,
    updatePrivacySettings,
  } = useAuth();
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [specialty, setSpecialty] = useState(userProfile?.specialty || '');
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || '');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Privacy, Data Rights & Account Deletion State
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacySavedNotice, setPrivacySavedNotice] = useState<string | null>(null);
  const [exportingData, setExportingData] = useState(false);
  const [privacyRequests, setPrivacyRequests] = useState<PrivacyRequest[]>([]);
  const [rightsRequestType, setRightsRequestType] = useState<'data_access' | 'data_correction' | 'privacy_inquiry'>('data_access');
  const [rightsDetails, setRightsDetails] = useState('');
  const [submittingRights, setSubmittingRights] = useState(false);
  const [rightsSubmittedMsg, setRightsSubmittedMsg] = useState<string | null>(null);

  // Confirmed Account Deletion Workflow
  const [deletionStep, setDeletionStep] = useState<'idle' | 'confirm'>('idle');
  const [deletionPhrase, setDeletionPhrase] = useState('');
  const [deletionAckChecked, setDeletionAckChecked] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [submittingDeletion, setSubmittingDeletion] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setPrivacyRequests([]);
      return;
    }
    const unsub = LegalService.listenToMyPrivacyRequests(currentUser.uid, setPrivacyRequests);
    return () => unsub();
  }, [currentUser]);

  if (!currentUser || !userProfile) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <User className="w-8 h-8" />
        </div>
        <h2 className="font-serif-display text-2xl font-bold text-stone-900">
          Account Profile & Settings
        </h2>
        <p className="text-xs text-stone-500 leading-relaxed">
          Log in or create an account to customize your culinary profile, publish recipes as a chef, or view your saved favourites.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onOpenAuthModal('login')}
            className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors"
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => onOpenAuthModal('signup')}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  const isChef = userProfile.role === 'chef';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfileData({
        displayName,
        bio,
        specialty,
        photoURL
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeviceImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImage(true);
      const dataUrl = await processDeviceImage(file, 400, 0.85);
      setPhotoURL(dataUrl);
      setImageFileName(file.name);
    } catch (err) {
      console.error('Failed to load device image:', err);
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Title */}
      <div>
        <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
          Account & Profile Settings
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Manage your personal culinary identity, profile settings, and verified credentials.
        </p>
      </div>

      {/* Permanent Account Role Card */}
      <div className={`p-6 sm:p-8 rounded-3xl border transition-all ${
        isChef 
          ? 'bg-amber-900 text-white border-amber-800' 
          : 'bg-white text-stone-900 border-stone-200/80 shadow-xs'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
              isChef ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-700'
            }`}>
              {isChef ? <ChefHat className="w-7 h-7" /> : <User className="w-7 h-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold opacity-75">Verified Account Role</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  isChef ? 'bg-amber-500/30 text-amber-200' : 'bg-amber-100 text-amber-800'
                }`}>
                  {isChef ? 'Chef Tutor' : 'Food Lover'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-500/20 text-stone-400 font-medium">Permanent</span>
              </div>
              <h2 className="font-serif-display text-xl font-bold mt-0.5">
                {isChef ? 'Chef Tutor Account' : 'Food Lover Account'}
              </h2>
              <p className={`text-xs mt-1 max-w-md ${isChef ? 'text-stone-300' : 'text-stone-500'}`}>
                {isChef 
                  ? 'Your account role is permanently assigned as Chef Tutor. You have access to Chef Studio, recipe publishing, community management, and VIP masterclasses.'
                  : 'Your account role is permanently assigned as Food Lover. To publish recipes or teach masterclasses as a Chef, please register a separate chef account.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isChef ? (
              <button
                type="button"
                onClick={() => onNavigate('chef-dashboard')}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
              >
                Go to Chef Studio
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuthModal('signup')}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-xl text-xs transition-colors"
                title="Create a separate Chef account"
              >
                Register Chef Account
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="pb-4 border-b border-stone-100">
          <h3 className="font-serif-display text-xl font-bold text-stone-900">
            Public Profile Details
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            This information is visible on your recipes, comments, and chef profile page.
          </p>
        </div>

        {savedSuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Profile updated successfully!</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={80}
              className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
            />
          </div>

          {/* Avatar Selection: 3 Default Avatars or Custom URL */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                Profile Avatar (3 Default Avatars Available)
              </label>
              <button
                type="button"
                onClick={() => onNavigate('user-profile')}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                <span>View My Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3 Default Avatars Interactive Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DEFAULT_AVATARS.map((avatar, idx) => {
                const isSelected = photoURL === avatar.svgDataUri;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setPhotoURL(avatar.svgDataUri)}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                      isSelected 
                        ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20 shadow-2xs' 
                        : 'border-stone-200 bg-stone-50/50 hover:border-amber-400'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-stone-200 shadow-2xs">
                      <img src={avatar.svgDataUri} alt={avatar.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-bold text-stone-900 truncate">{avatar.name}</p>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-stone-500 truncate">{avatar.title}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bar for Changing Profile Image Selected from User or Chef Device */}
            <div className="pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleDeviceImageChange}
                className="hidden"
              />

              <div className="rounded-2xl border border-stone-200/90 bg-stone-50/80 p-3.5 sm:p-4 hover:border-amber-500/60 transition-all">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {!photoURL.startsWith('data:image/svg+xml') && photoURL ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 ring-2 ring-amber-500/30 border border-stone-200">
                        <img
                          src={photoURL}
                          alt="Custom device avatar"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <Camera className="w-6 h-6" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-stone-900 truncate">
                          {!photoURL.startsWith('data:image/svg+xml') && photoURL
                            ? (imageFileName ? `Selected: ${imageFileName}` : 'Device Image Selected')
                            : 'Choose Profile Image from Device'}
                        </p>
                        {!photoURL.startsWith('data:image/svg+xml') && photoURL && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 shrink-0">
                            Custom Photo
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 truncate mt-0.5">
                        Select a JPG, PNG, or WebP photo from your phone or computer.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200/60">
                    {!photoURL.startsWith('data:image/svg+xml') && photoURL && (
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoURL(DEFAULT_AVATARS[0].svgDataUri);
                          setImageFileName(null);
                        }}
                        className="px-3 py-2 text-stone-500 hover:text-red-600 text-xs font-semibold rounded-xl hover:bg-stone-100 transition-colors flex items-center gap-1"
                        title="Revert to default avatar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Reset</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isProcessingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto px-4 py-2.5 bg-stone-900 hover:bg-amber-600 active:scale-98 text-white font-semibold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2"
                    >
                      {isProcessingImage ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>
                            {!photoURL.startsWith('data:image/svg+xml') && photoURL
                              ? 'Change Image'
                              : 'Select from Device'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Specialty */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
              Culinary Specialty / Favorite Cuisine
            </label>
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="e.g. Handmade Pasta & French Bistro Pastry"
              maxLength={100}
              className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
              Biography
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell other food lovers about your culinary journey..."
              maxLength={500}
              className="w-full text-xs sm:text-sm p-4 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-stone-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>
      </form>

      {/* Account Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div 
          onClick={() => onNavigate('favourites')}
          className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs hover:border-amber-500/50 cursor-pointer transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <p className="font-serif-display text-base font-bold text-stone-900">
                {favourites.length} Saved Favourites
              </p>
              <p className="text-xs text-stone-500">Quickly view bookmarked meals</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-stone-400" />
        </div>

        <div 
          onClick={() => onNavigate('premium')}
          className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs hover:border-amber-500/50 cursor-pointer transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <p className="font-serif-display text-base font-bold text-stone-900">
                {activeSubscriptions.length} Active VIP Circles
              </p>
              <p className="text-xs text-stone-500">Manage chef subscriptions & chats</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-stone-400" />
        </div>
      </div>

      {/* Security & Password Recovery */}
      {currentUser?.email && (
        <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif-display text-base font-bold text-stone-900">
                  Password & Account Security
                </h4>
                <p className="text-xs text-stone-500">
                  Send a secure password recovery link to your registered email ({currentUser.email}).
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={resetLoading || resetEmailSent}
              onClick={async () => {
                if (!currentUser?.email) return;
                setResetLoading(true);
                try {
                  await sendPasswordReset(currentUser.email);
                  setResetEmailSent(true);
                  setTimeout(() => setResetEmailSent(false), 8000);
                } catch (e) {
                  console.error(e);
                } finally {
                  setResetLoading(false);
                }
              }}
              className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-2xs flex items-center justify-center gap-2 disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {resetLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Link...</span>
                </>
              ) : resetEmailSent ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Reset Link Sent!</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Send Recovery Email</span>
                </>
              )}
            </button>
          </div>
          {resetEmailSent && (
            <p className="text-[11px] text-emerald-700 font-medium">
              A single-use password recovery link has been dispatched to {currentUser.email}. Please check your inbox.
            </p>
          )}
        </div>
      )}

      {/* Legal Agreements & Compliance Status */}
      <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif-display text-base font-bold text-stone-900 dark:text-stone-100">
                Legal Agreements &amp; Legal Centre
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {hasAcceptedLatestLegal(userProfile) && userProfile?.legalAcceptance
                  ? `Accepted Terms v${userProfile.legalAcceptance.termsVersion} & Privacy v${userProfile.legalAcceptance.privacyPolicyVersion} on ${new Date(
                      userProfile.legalAcceptance.acceptedAt
                    ).toLocaleString()}`
                  : `Current version: Terms v${CURRENT_TERMS_VERSION} & Privacy v${CURRENT_PRIVACY_VERSION} (pending confirmation)`}
              </p>
            </div>
          </div>

          {hasAcceptedLatestLegal(userProfile) ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/70 self-start sm:self-center">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Up to Date</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => acceptLatestLegalTerms('account_settings', 'account_settings')}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors cursor-pointer self-start sm:self-center"
            >
              Accept Current Terms (v{CURRENT_TERMS_VERSION})
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
          {[
            { id: 'legal', label: 'Legal Centre Hub' },
            { id: 'terms', label: 'Terms & Conditions' },
            { id: 'privacy', label: 'Privacy Policy' },
            { id: 'guidelines', label: 'Community Guidelines' },
            { id: 'copyright', label: 'Copyright & IP' },
            { id: 'food-safety', label: 'Food Safety' },
            { id: 'cookies', label: 'Cookie Policy' },
            { id: 'reporting', label: 'Report & Appeals' },
            { id: 'contact', label: 'Legal Support' },
          ].map((docLink) => (
            <button
              key={docLink.id}
              type="button"
              onClick={() => onNavigate(docLink.id)}
              className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              {docLink.label}
            </button>
          ))}
        </div>
      </div>

      {/* Privacy Controls & Teen Safety Settings */}
      {(() => {
        const privacySettings: UserPrivacySettings = userProfile.privacySettings || {
          profileVisibility: 'public',
          allowDirectSharing: true,
          isMinorOrTeenProtected: userProfile.ageGroup === 'teen_13_17',
          ageGroup: userProfile.ageGroup,
        };

        const handleTogglePrivacy = async (updates: Partial<UserPrivacySettings>, label: string) => {
          setPrivacySaving(true);
          setPrivacySavedNotice(null);
          try {
            await updatePrivacySettings(updates);
            setPrivacySavedNotice(label);
            setTimeout(() => setPrivacySavedNotice(null), 3000);
          } catch (err) {
            console.error('Failed to update privacy settings:', err);
          } finally {
            setPrivacySaving(false);
          }
        };

        const pendingDeletion = privacyRequests.find(
          (r) => r.requestType === 'account_deletion' && (r.status === 'pending' || r.status === 'processing')
        );

        return (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif-display text-base font-bold text-stone-900 dark:text-stone-100">
                      Privacy Controls &amp; Teen Safety (NDPA 2023)
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Control who views your culinary profile, external sharing links, and offline video metadata cache.
                    </p>
                  </div>
                </div>
                {privacySavedNotice && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                    <Check className="w-3.5 h-3.5" />
                    <span>{privacySavedNotice}</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 space-y-2">
                  <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                    Profile Visibility
                  </label>
                  <select
                    value={privacySettings.profileVisibility}
                    disabled={privacySaving}
                    onChange={(e) =>
                      handleTogglePrivacy(
                        { profileVisibility: e.target.value as 'public' | 'community_only' },
                        'Profile visibility updated'
                      )
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="public">Public (Visible to visitors &amp; members)</option>
                    <option value="community_only">Community Only (Signed-in DellyChow members)</option>
                  </select>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    When set to Community Only, signed-out visitors cannot browse your profile details.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      Enhanced Teen Protection (13–17)
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                      Prioritizes stricter safety moderation and restricts unsolicited public profile discovery.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={privacySaving}
                    onClick={() =>
                      handleTogglePrivacy(
                        { isMinorOrTeenProtected: !privacySettings.isMinorOrTeenProtected },
                        'Teen protection setting updated'
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                      privacySettings.isMinorOrTeenProtected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {privacySettings.isMinorOrTeenProtected ? 'Active' : 'Enable'}
                  </button>
                </div>

                <div className="p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      Direct Profile Share Links
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                      Allow your public DellyChow profile URL to be copied or shared across devices.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={privacySaving}
                    onClick={() =>
                      handleTogglePrivacy(
                        { allowDirectSharing: !privacySettings.allowDirectSharing },
                        'Sharing preference saved'
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                      privacySettings.allowDirectSharing
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {privacySettings.allowDirectSharing ? 'Allowed' : 'Disabled'}
                  </button>
                </div>

                <div className="p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Cookie className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                        Offline Watch &amp; Thumbnail Cache
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                        Functional browser cache for low-network viewing. Essential auth cookies always remain active.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateCookiePreferences(!cookiePreferences.functionalStorage)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                      cookiePreferences.functionalStorage
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {cookiePreferences.functionalStorage ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            </div>

            {/* Blocked Users Manager */}
            <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center shrink-0">
                    <Ban className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif-display text-base font-bold text-stone-900 dark:text-stone-100">
                      Blocked Accounts ({blockedUsers.length})
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Comments and interactions from blocked accounts are hidden from your view.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('reporting')}
                  className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Reports &amp; Appeals</span>
                </button>
              </div>

              {blockedUsers.length === 0 ? (
                <p className="text-xs text-stone-500 dark:text-stone-400 py-2">
                  You have not blocked any accounts. You can block a user from any chef/user profile or content report modal.
                </p>
              ) : (
                <div className="space-y-2">
                  {blockedUsers.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-stone-50 dark:bg-stone-950/40 border border-stone-200/70 dark:border-stone-800"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                          {rec.blockedUserName || rec.blockedUserId}
                        </p>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                          Blocked on {new Date(rec.createdAt).toLocaleDateString()}
                          {rec.reason ? ` • ${rec.reason}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => unblockUser(rec.blockedUserId)}
                        className="px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* NDPA 2023 Data Rights, Export & Confirmed Account Deletion */}
            <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <FileDown className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif-display text-base font-bold text-stone-900 dark:text-stone-100">
                      Your Data Rights &amp; Portability (NDPA 2023)
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Download a portable JSON copy of your DellyChow profile and saved bookmarks, or request access/correction.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={exportingData}
                  onClick={async () => {
                    setExportingData(true);
                    try {
                      await LegalService.downloadPersonalDataExport(currentUser.uid, userProfile);
                    } finally {
                      setExportingData(false);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {exportingData ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Preparing JSON...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4" />
                      <span>Export My Data (JSON)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Data Access / Correction Request Form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!rightsDetails.trim()) return;
                  setSubmittingRights(true);
                  setRightsSubmittedMsg(null);
                  try {
                    const res = await LegalService.submitPrivacyRequest({
                      userId: currentUser.uid,
                      userEmail: currentUser.email || userProfile.email || '',
                      userName: userProfile.displayName,
                      requestType: rightsRequestType,
                      details: rightsDetails.trim(),
                    });
                    setRightsDetails('');
                    setRightsSubmittedMsg(`Privacy request logged (Ref: ${res.id.slice(0, 8)}).`);
                  } finally {
                    setSubmittingRights(false);
                  }
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select
                    value={rightsRequestType}
                    onChange={(e) => setRightsRequestType(e.target.value as any)}
                    className="text-xs px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950/40 text-stone-800 dark:text-stone-200"
                  >
                    <option value="data_access">Request Data Access Report</option>
                    <option value="data_correction">Request Data Correction</option>
                    <option value="privacy_inquiry">General Privacy / DPO Inquiry</option>
                  </select>
                  <input
                    type="text"
                    value={rightsDetails}
                    onChange={(e) => setRightsDetails(e.target.value)}
                    required
                    placeholder="Specify what data record you want accessed or corrected..."
                    className="sm:col-span-2 text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950/40 text-stone-800 dark:text-stone-200"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {rightsSubmittedMsg ? (
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{rightsSubmittedMsg}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">
                      Handled under Nigeria Data Protection Act (NDPA) 2023 data subject rights.
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={submittingRights || !rightsDetails.trim()}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {submittingRights ? 'Submitting...' : 'Submit Data Request'}
                  </button>
                </div>
              </form>

              {/* Recent Privacy / Deletion Requests */}
              {privacyRequests.length > 0 && (
                <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    Your Submitted Privacy &amp; Deletion Requests
                  </p>
                  {privacyRequests.slice(0, 4).map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950/40 border border-stone-200/70 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-stone-900 dark:text-stone-100 uppercase">
                          {req.requestType.replace('_', ' ')}
                        </span>{' '}
                        <span className="text-stone-500">• {new Date(req.createdAt).toLocaleDateString()}</span>
                        <p className="text-[11px] text-stone-600 dark:text-stone-400 truncate mt-0.5">{req.details}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                          {req.status}
                        </span>
                        {req.requestType === 'account_deletion' &&
                          (req.status === 'pending' || req.status === 'processing') && (
                            <button
                              type="button"
                              onClick={() => LegalService.cancelDeletionRequest(req.id, currentUser.uid)}
                              className="px-2.5 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-[11px] font-semibold cursor-pointer"
                            >
                              Cancel Deletion
                            </button>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Confirmed Account Deletion Workflow */}
              <div className="pt-4 border-t border-red-200/70 dark:border-red-900/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <UserX className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        Confirmed Account Deletion
                      </h5>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        Removing your account permanently erases your public profile, saved bookmarks, and login access after verification. Safety audit logs and transaction records required by law may be retained in anonymized form.
                      </p>
                    </div>
                  </div>

                  {!pendingDeletion && deletionStep === 'idle' && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeletionStep('confirm');
                        setDeletionError(null);
                      }}
                      className="px-4 py-2 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                    >
                      Request Account Deletion
                    </button>
                  )}
                </div>

                {pendingDeletion && (
                  <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-900 dark:text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>
                        Your account is queued for verified deletion (Ref: {pendingDeletion.id.slice(0, 8)}). You may cancel before final execution.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => LegalService.cancelDeletionRequest(pendingDeletion.id, currentUser.uid)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-red-300 text-red-700 font-semibold text-xs hover:bg-red-100 cursor-pointer shrink-0"
                    >
                      Cancel Deletion Request
                    </button>
                  </div>
                )}

                {deletionStep === 'confirm' && !pendingDeletion && (
                  <div className="p-4 rounded-2xl bg-red-50/70 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-3">
                    <p className="text-xs font-semibold text-red-900 dark:text-red-200">
                      To prevent accidental deletion, please type <code className="px-1.5 py-0.5 bg-white rounded border border-red-200 text-red-700 font-mono">DELETE MY ACCOUNT</code> below and confirm your acknowledgment.
                    </p>
                    {deletionError && (
                      <p className="text-xs text-red-700 font-semibold">{deletionError}</p>
                    )}
                    <input
                      type="text"
                      value={deletionPhrase}
                      onChange={(e) => setDeletionPhrase(e.target.value)}
                      placeholder="Type DELETE MY ACCOUNT"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-red-200 bg-white text-stone-900"
                    />
                    <input
                      type="text"
                      value={deletionReason}
                      onChange={(e) => setDeletionReason(e.target.value)}
                      placeholder="Optional reason for leaving (helps improve DellyChow)"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900"
                    />
                    <label className="flex items-start gap-2 text-xs text-stone-700 dark:text-stone-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={deletionAckChecked}
                        onChange={(e) => setDeletionAckChecked(e.target.checked)}
                        className="mt-0.5 accent-red-600"
                      />
                      <span>
                        I understand that my profile, unpublished drafts, and VIP circle access will be permanently removed, while minimal moderation/legal audit records required under Nigerian law are retained.
                      </span>
                    </label>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDeletionStep('idle');
                          setDeletionPhrase('');
                          setDeletionAckChecked(false);
                          setDeletionError(null);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold cursor-pointer"
                      >
                        Keep My Account
                      </button>
                      <button
                        type="button"
                        disabled={submittingDeletion}
                        onClick={async () => {
                          if (deletionPhrase.trim().toUpperCase() !== 'DELETE MY ACCOUNT') {
                            setDeletionError('Please type DELETE MY ACCOUNT exactly to proceed.');
                            return;
                          }
                          if (!deletionAckChecked) {
                            setDeletionError('Please confirm the data retention acknowledgment checkbox.');
                            return;
                          }
                          setDeletionError(null);
                          setSubmittingDeletion(true);
                          try {
                            await LegalService.submitPrivacyRequest({
                              userId: currentUser.uid,
                              userEmail: currentUser.email || userProfile.email || '',
                              userName: userProfile.displayName,
                              requestType: 'account_deletion',
                              details: deletionReason.trim() || 'User-initiated confirmed account deletion request',
                              deletionConfirmationCode: 'DELETE MY ACCOUNT',
                              acknowledgedDataRetention: true,
                            });
                            setDeletionStep('idle');
                            setDeletionPhrase('');
                            setDeletionAckChecked(false);
                          } finally {
                            setSubmittingDeletion(false);
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {submittingDeletion ? 'Submitting...' : 'Confirm Account Deletion'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Governance & Moderation Launch Card (Strictly Authorized Admins Only) */}
            {isAdmin && (
              <div className="p-6 rounded-3xl bg-stone-900 text-white border border-amber-500/40 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                      Authorized Platform Governance
                    </p>
                    <h4 className="font-serif-display text-lg font-bold">
                      Admin Legal, Safety &amp; Moderation Console
                    </h4>
                    <p className="text-xs text-stone-300 mt-0.5">
                      Review moderation reports, verify copyright claims, process appeals, manage NDPA requests, and update policy versions.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('admin-governance')}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-2"
                >
                  <span>Open Console</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        );
      })()}

    </div>
  );
};
