import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  DollarSign, 
  Save, 
  MessageSquare, 
  Users, 
  Sparkles, 
  Check, 
  ArrowLeft,
  Pin,
  Shield,
  Lock,
  Globe
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CommunityChat } from '../../components/CommunityChat';
import { RecipeService } from '../../services/recipeService';

interface ChefCommunityProps {
  onBack: () => void;
}

export const ChefCommunity: React.FC<ChefCommunityProps> = ({ onBack }) => {
  const { currentUser, userProfile, updateProfileData } = useAuth();

  const [price, setPrice] = useState(userProfile?.premiumPriceMonthly || 9.99);
  const [perks, setPerks] = useState(
    userProfile?.perks ||
    'Weekly live masterclasses, secret sauce chemistry notes, live Sunday cook-along, and direct Q&A in the VIP kitchen.'
  );
  const [isPublicGroup, setIsPublicGroup] = useState(false);
  const [pinnedAnnouncement, setPinnedAnnouncement] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    RecipeService.getCommunitySettings(currentUser.uid).then((settings) => {
      if (settings) {
        setIsPublicGroup(settings.isPublicGroup ?? false);
        setPinnedAnnouncement(settings.pinnedAnnouncement || '');
      }
    });
  }, [currentUser]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfileData({
        premiumPriceMonthly: Number(price),
        perks
      });

      if (currentUser) {
        await RecipeService.updateCommunitySettings(currentUser.uid, {
          isPublicGroup,
          pinnedAnnouncement,
          rules: 'Be respectful, focus on culinary techniques, no hate speech or spam.'
        });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Strip */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to dashboard</span>
        </button>
      </div>

      <div>
        <div className="flex items-center gap-2 text-xs text-amber-700 font-semibold uppercase tracking-wider mb-1">
          <Crown className="w-4 h-4" />
          <span>VIP Culinary Kitchen & Community</span>
        </div>
        <h1 className="font-serif-display text-3xl font-bold text-stone-900 tracking-tight">
          Chef Community & Group Chat Management
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Moderate your group discussions, manage privacy & announcements, and configure your VIP subscriptions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Settings Column (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Subscriber Metrics */}
          <div className="p-6 rounded-3xl bg-amber-900 text-white space-y-2 shadow-xs">
            <span className="text-xs uppercase tracking-wider text-amber-300 font-semibold">Active Members</span>
            <div className="flex items-baseline gap-2">
              <span className="font-serif-display text-4xl font-bold tabular-nums">
                {userProfile?.subscriberCount || 0}
              </span>
              <span className="text-xs text-amber-200">paying food lovers</span>
            </div>
            <p className="text-xs text-stone-300 pt-1">
              Estimated Monthly Revenue: <strong className="text-white">${((userProfile?.subscriberCount || 0) * (userProfile?.premiumPriceMonthly || 9.99)).toFixed(2)}</strong>
            </p>
          </div>

          {/* Pricing & Group Settings Form */}
          <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl border border-stone-200/80 p-6 shadow-xs space-y-5">
            <h3 className="font-serif-display text-lg font-bold text-stone-900 pb-2 border-b border-stone-100">
              Community & Tier Settings
            </h3>

            {saveSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-2 border border-emerald-200">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Settings updated successfully!</span>
              </div>
            )}

            {/* Privacy Setting Toggle */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                Group Privacy Level
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsPublicGroup(false)}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    !isPublicGroup
                      ? 'border-amber-600 bg-amber-50/50 text-amber-900'
                      : 'border-stone-200 hover:bg-stone-50 text-stone-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>VIP Only</span>
                  </div>
                  <span className="text-[10px] text-stone-500 leading-tight">
                    Only paying subscribers can view and chat
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPublicGroup(true)}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    isPublicGroup
                      ? 'border-amber-600 bg-amber-50/50 text-amber-900'
                      : 'border-stone-200 hover:bg-stone-50 text-stone-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Globe className="w-3.5 h-3.5 text-amber-600" />
                    <span>Open Circle</span>
                  </div>
                  <span className="text-[10px] text-stone-500 leading-tight">
                    All registered food lovers can join discussion
                  </span>
                </button>
              </div>
            </div>

            {/* Pinned Announcement */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5 text-amber-600" />
                <span>Pinned Group Announcement</span>
              </label>
              <input
                type="text"
                value={pinnedAnnouncement}
                onChange={(e) => setPinnedAnnouncement(e.target.value)}
                maxLength={180}
                placeholder="e.g. Next live session Sunday 4 PM GMT: Master sourdough!"
                className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Monthly Subscription Fee ($ USD)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.50"
                  min={1}
                  max={199}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  required
                  className="w-full text-xs sm:text-sm pl-8 pr-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50 tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                VIP Privileges & Perks Offered
              </label>
              <textarea
                value={perks}
                onChange={(e) => setPerks(e.target.value)}
                rows={3}
                required
                maxLength={400}
                placeholder="List what members get..."
                className="w-full text-xs sm:text-sm p-4 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Community Settings'}</span>
            </button>
          </form>

        </div>

        {/* Right: Live VIP Community Chat Room (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif-display text-xl font-bold text-stone-900">
              Live VIP Member Chat
            </h3>
            <span className="text-xs text-stone-500">
              You post with verified &quot;Chef&quot; badge
            </span>
          </div>

          {currentUser && (
            <CommunityChat
              chefId={currentUser.uid}
              chefName={userProfile?.displayName || 'Head Chef'}
            />
          )}
        </div>

      </div>

    </div>
  );
};
