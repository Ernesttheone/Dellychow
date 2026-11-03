import React, { useState, useRef } from 'react';
import { 
  User, 
  ChefHat, 
  Bookmark, 
  Crown, 
  Save, 
  Camera, 
  Check, 
  Sparkles,
  ArrowRight,
  Shield,
  Upload,
  Trash2,
  Loader2,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ASSET_IMAGES } from '../assets/images';
import { DEFAULT_AVATARS } from '../constants/avatars';
import { processDeviceImage } from '../lib/imageUtils';

interface AccountPageProps {
  onNavigate: (view: string, params?: any) => void;
  onOpenAuthModal: (mode?: 'login' | 'signup') => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({ onNavigate, onOpenAuthModal }) => {
  const { currentUser, userProfile, updateProfileData, favourites, activeSubscriptions, sendPasswordReset } = useAuth();
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

    </div>
  );
};
