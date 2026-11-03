/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  User, 
  ChefHat, 
  Bookmark, 
  Crown, 
  Edit3, 
  Calendar, 
  Sparkles, 
  Utensils, 
  Heart, 
  MessageSquare, 
  ArrowRight, 
  Check, 
  ShieldCheck,
  Flame,
  Award,
  Upload,
  Camera,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Recipe, CookingVideo } from '../types';
import { RecipeCard } from '../components/RecipeCard';
import { UserAvatar } from '../components/UserAvatar';
import { DEFAULT_AVATARS, getDefaultAvatar } from '../constants/avatars';
import { processDeviceImage } from '../lib/imageUtils';

interface UserProfilePageProps {
  recipes: Recipe[];
  videos: CookingVideo[];
  onSelectRecipe: (recipe: Recipe) => void;
  onSelectChef: (chefId: string) => void;
  onNavigate: (view: string, params?: any) => void;
  onOpenAuthModal: (mode?: 'login' | 'signup') => void;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({
  recipes,
  onSelectRecipe,
  onSelectChef,
  onNavigate,
  onOpenAuthModal
}) => {
  const { currentUser, userProfile, favourites, activeSubscriptions, updateProfileData } = useAuth();
  const [activeTab, setActiveTab] = useState<'favourites' | 'subscriptions' | 'avatars'>('favourites');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [uploadingDeviceImage, setUploadingDeviceImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser || !userProfile) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
          <User className="w-8 h-8" />
        </div>
        <h2 className="font-serif-display text-2xl font-bold text-stone-900">
          User Profile
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
          Log in or create an account to view your culinary profile, track saved recipes, and manage your chef VIP circles.
        </p>
        <div className="flex items-center justify-center gap-3 pt-3">
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
  const favRecipeIds = new Set(favourites.map(f => f.recipeId));
  const savedRecipes = recipes.filter(r => favRecipeIds.has(r.id));
  const memberDate = userProfile.createdAt 
    ? new Date(userProfile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Oct 2026';

  const handleSelectDefaultAvatar = async (avatarSvgUri: string, avatarName: string) => {
    setSavingAvatar(true);
    try {
      await updateProfileData({ photoURL: avatarSvgUri });
      setAvatarSuccess(avatarName);
      setTimeout(() => setAvatarSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to update avatar:', err);
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleDeviceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDeviceImage(true);
    try {
      const dataUrl = await processDeviceImage(file, 400, 0.85);
      await updateProfileData({ photoURL: dataUrl });
      setAvatarSuccess('Device Photo');
      setTimeout(() => setAvatarSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to upload device photo:', err);
    } finally {
      setUploadingDeviceImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* 1. Profile Hero Card */}
      <section className="relative overflow-hidden rounded-3xl bg-stone-900 text-white border border-stone-800 p-6 sm:p-10 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          
          {/* Avatar & Core Identity */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
            <div className="relative group">
              <UserAvatar
                src={userProfile.photoURL}
                name={userProfile.displayName}
                seed={userProfile.id}
                size="2xl"
                className="ring-4 ring-amber-500/30"
              />
              <button
                type="button"
                onClick={() => setActiveTab('avatars')}
                className="absolute bottom-0 right-0 bg-amber-600 hover:bg-amber-700 text-white p-2 rounded-full shadow-md text-xs transition-transform group-hover:scale-105"
                title="Change Avatar"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isChef 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {isChef ? <ChefHat className="w-3.5 h-3.5" /> : <Utensils className="w-3.5 h-3.5" />}
                  <span>{isChef ? 'Head Chef & Creator' : 'Food Lover'}</span>
                </span>

                <span className="inline-flex items-center gap-1 text-[11px] text-stone-400">
                  <Calendar className="w-3 h-3" />
                  <span>Joined {memberDate}</span>
                </span>
              </div>

              <h1 className="font-serif-display text-2xl sm:text-4xl font-bold text-white tracking-tight">
                {userProfile.displayName}
              </h1>

              <p className="text-stone-300 text-xs sm:text-sm max-w-xl leading-relaxed">
                {userProfile.bio || 'Passionate culinary explorer discovering artisan recipes, testing flavours, and sharing the love of food.'}
              </p>

              {userProfile.specialty && (
                <div className="flex items-center gap-2 pt-1 text-xs text-amber-400 font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Specialty: {userProfile.specialty}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-row md:flex-col items-center md:items-end gap-3 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-white/10">
            <button
              type="button"
              onClick={() => onNavigate('account')}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 backdrop-blur-xs"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>

            {isChef && (
              <button
                type="button"
                onClick={() => onNavigate('chef-dashboard')}
                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                <ChefHat className="w-4 h-4" />
                <span>Chef Studio</span>
              </button>
            )}
          </div>
        </div>

        {/* Ambient Culinary Texture */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* 2. Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div 
          onClick={() => setActiveTab('favourites')}
          className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs hover:border-amber-500/50 cursor-pointer transition-all"
        >
          <div className="flex items-center gap-2 text-stone-400 text-xs mb-1">
            <Bookmark className="w-3.5 h-3.5 text-amber-600" />
            <span>Saved Recipes</span>
          </div>
          <p className="font-serif-display text-2xl font-bold text-stone-900 tabular-nums">
            {favourites.length}
          </p>
        </div>

        <div 
          onClick={() => setActiveTab('subscriptions')}
          className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs hover:border-amber-500/50 cursor-pointer transition-all"
        >
          <div className="flex items-center gap-2 text-stone-400 text-xs mb-1">
            <Crown className="w-3.5 h-3.5 text-amber-600" />
            <span>VIP Chef Circles</span>
          </div>
          <p className="font-serif-display text-2xl font-bold text-stone-900 tabular-nums">
            {activeSubscriptions.length}
          </p>
        </div>

        <div 
          onClick={() => setActiveTab('avatars')}
          className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs hover:border-amber-500/50 cursor-pointer transition-all"
        >
          <div className="flex items-center gap-2 text-stone-400 text-xs mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Default Avatars</span>
          </div>
          <p className="font-serif-display text-2xl font-bold text-stone-900 tabular-nums">
            3 Ready
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-stone-400 text-xs mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Verified Status</span>
          </div>
          <p className="font-serif-display text-lg font-bold text-emerald-700">
            Active Foodie
          </p>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="border-b border-stone-200 flex items-center gap-2 sm:gap-6 text-xs sm:text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('favourites')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'favourites'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Saved Recipes ({favourites.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subscriptions')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'subscriptions'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Crown className="w-4 h-4" />
          <span>VIP Subscriptions ({activeSubscriptions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('avatars')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'avatars'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Default Avatars (3 Options)</span>
        </button>
      </div>

      {/* 4. Tab Content */}
      {/* TAB 1: SAVED FAVOURITES */}
      {activeTab === 'favourites' && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif-display text-xl sm:text-2xl font-bold text-stone-900">
              Bookmarked Meals & Recipes
            </h2>
            <button
              onClick={() => onNavigate('explore')}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
            >
              <span>Explore More Recipes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {savedRecipes.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white border border-stone-200/80 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Bookmark className="w-7 h-7" />
              </div>
              <h3 className="font-serif-display text-lg font-bold text-stone-900">
                No Bookmarked Recipes Yet
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Tap the bookmark icon on any recipe while exploring to save it to your personal cookbook.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('explore')}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
              >
                Browse Artisan Recipes
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onSelect={onSelectRecipe}
                  onSelectChef={onSelectChef}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: VIP SUBSCRIPTIONS */}
      {activeTab === 'subscriptions' && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif-display text-xl sm:text-2xl font-bold text-stone-900">
                Active Chef VIP Memberships
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Your direct access to exclusive tutorials and private chef kitchens.
              </p>
            </div>
            <button
              onClick={() => onNavigate('premium')}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
            >
              <span>View All VIP Chefs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeSubscriptions.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white border border-stone-200/80 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Crown className="w-7 h-7" />
              </div>
              <h3 className="font-serif-display text-lg font-bold text-stone-900">
                No Active VIP Memberships
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Join private chef circles to unlock masterclasses, secret techniques, and group chats with master chefs.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('premium')}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
              >
                Explore Premium Chefs
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeSubscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs hover:border-amber-500/50 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        seed={sub.chefId}
                        name={sub.chefName}
                        size="md"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                          <h4 className="font-serif-display text-base font-bold text-stone-900">
                            Chef {sub.chefName}
                          </h4>
                        </div>
                        <p className="text-xs text-stone-500">
                          VIP Inner Kitchen Member
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                    <span className="text-xs text-stone-400">
                      Renews monthly
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectChef(sub.chefId)}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-2xs flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Enter Kitchen Chat</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: THREE DEFAULT AVATARS */}
      {activeTab === 'avatars' && (
        <section className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Instant Profile Styling</span>
            </div>
            <h2 className="font-serif-display text-xl sm:text-2xl font-bold text-stone-900">
              Three Curated Default Culinary Avatars
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-2xl leading-relaxed">
              When a chef or user hasn&apos;t uploaded an external photo, DellyChow provides three artisan vector avatars. Choose your signature avatar below or let our kitchen assign one automatically!
            </p>
          </div>

          {avatarSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Your profile avatar has been set to <strong>{avatarSuccess}</strong>!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DEFAULT_AVATARS.map((avatar, idx) => {
              const isSelected = userProfile.photoURL === avatar.svgDataUri;
              return (
                <div
                  key={avatar.id}
                  className={`rounded-3xl border p-6 flex flex-col justify-between transition-all ${
                    isSelected 
                      ? 'bg-amber-50/50 border-amber-500 shadow-md ring-2 ring-amber-500/30' 
                      : 'bg-white border-stone-200/80 shadow-xs hover:border-amber-300 hover:shadow-sm'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-stone-100 text-stone-600">
                        Option #{idx + 1}
                      </span>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
                          <Check className="w-3 h-3 text-amber-600" />
                          <span>Active Avatar</span>
                        </span>
                      )}
                    </div>

                    <div className="flex justify-center py-2">
                      <div className="w-24 h-24 rounded-full overflow-hidden shadow-md ring-4 ring-white border-2 border-stone-200">
                        <img
                          src={avatar.svgDataUri}
                          alt={avatar.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="text-center space-y-1">
                      <h3 className="font-serif-display text-lg font-bold text-stone-900">
                        {avatar.name}
                      </h3>
                      <p className="text-xs font-semibold text-amber-700">
                        {avatar.title}
                      </p>
                      <p className="text-xs text-stone-500 leading-relaxed pt-1">
                        {avatar.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      type="button"
                      disabled={savingAvatar || isSelected}
                      onClick={() => handleSelectDefaultAvatar(avatar.svgDataUri, avatar.name)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                        isSelected
                          ? 'bg-amber-100 text-amber-800 cursor-default'
                          : 'bg-stone-900 hover:bg-amber-600 text-white shadow-xs'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Currently Selected</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>{savingAvatar ? 'Saving...' : `Select ${avatar.name}`}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Device Profile Image Selection Bar */}
          <div className="rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleDeviceImageUpload}
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                {!userProfile.photoURL?.startsWith('data:image/svg+xml') && userProfile.photoURL ? (
                  <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 ring-4 ring-amber-500/20 border-2 border-stone-200 shadow-xs">
                    <img
                      src={userProfile.photoURL}
                      alt="Device Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <Camera className="w-7 h-7" />
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif-display text-base font-bold text-stone-900 truncate">
                      {!userProfile.photoURL?.startsWith('data:image/svg+xml') && userProfile.photoURL
                        ? 'Custom Device Photo in Use'
                        : 'Upload Photo from Your Device'}
                    </h3>
                    {!userProfile.photoURL?.startsWith('data:image/svg+xml') && userProfile.photoURL && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        Device Photo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Select a photo directly from your device storage or camera. DellyChow optimizes it automatically.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                <button
                  type="button"
                  disabled={uploadingDeviceImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  {uploadingDeviceImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Optimizing Photo...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>
                        {!userProfile.photoURL?.startsWith('data:image/svg+xml') && userProfile.photoURL
                          ? 'Change Device Image'
                          : 'Select from Device'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-stone-600 text-xs flex items-start gap-3">
            <Award className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Culinary Identity Protection:</strong> These three default avatars are vector-crafted to ensure zero loading latency, offline accessibility, and consistent culinary branding across recipe cards, author tags, comments, and chef directories.
            </p>
          </div>
        </section>
      )}

    </div>
  );
};
