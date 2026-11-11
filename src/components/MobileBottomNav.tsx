import React, { useState } from 'react';
import { 
  Home, 
  Compass, 
  Plus, 
  Crown, 
  User, 
  Video, 
  ChefHat, 
  X, 
  Trophy, 
  ShoppingCart,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';

interface MobileBottomNavProps {
  currentView: string;
  onNavigate: (view: string, params?: any) => void;
  onOpenAuthModal?: (mode?: 'login' | 'signup', role?: any) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate,
  onOpenAuthModal
}) => {
  const { currentUser, userProfile } = useAuth();
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  const isChef = userProfile?.role === 'chef';

  const handleCreateClick = () => {
    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal('login', 'chef');
      return;
    }
    setCreateSheetOpen(true);
  };

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      isActive: currentView === 'home',
      onClick: () => onNavigate('home')
    },
    {
      id: 'explore',
      label: 'Explore',
      icon: Compass,
      isActive: currentView === 'explore' || currentView === 'recipe-detail',
      onClick: () => onNavigate('explore')
    },
    {
      id: 'create',
      label: 'Create',
      isCreateButton: true,
      onClick: handleCreateClick
    },
    {
      id: 'subscriptions',
      label: 'VIP Circle',
      icon: Crown,
      isActive: currentView === 'premium',
      onClick: () => onNavigate('premium')
    },
    {
      id: 'you',
      label: 'You',
      icon: User,
      isAvatar: Boolean(currentUser),
      isActive: currentView === 'account' || currentView === 'user-profile' || currentView === 'favourites' || currentView.startsWith('chef-'),
      onClick: () => {
        if (!currentUser) {
          if (onOpenAuthModal) onOpenAuthModal('login');
        } else if (isChef) {
          onNavigate('chef-dashboard');
        } else {
          onNavigate('user-profile');
        }
      }
    }
  ];

  return (
    <>
      {/* 1. YouTube-Inspired Fixed Bottom Bar */}
      <nav 
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-t border-stone-200/90 pb-[env(safe-area-inset-bottom)] md:hidden shadow-lg select-none"
      >
        <div className="grid grid-cols-5 items-center h-14 px-1 max-w-lg mx-auto">
          {navItems.map((item) => {
            if (item.isCreateButton) {
              return (
                <div key={item.id} className="flex justify-center items-center">
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="w-10 h-10 rounded-full bg-amber-600 hover:bg-amber-700 active:scale-95 text-white flex items-center justify-center shadow-md shadow-amber-600/30 transition-transform cursor-pointer"
                    aria-label="Create or upload"
                    title="Create"
                  >
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              );
            }

            const IconComponent = item.icon!;
            const isActive = item.isActive;

            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="flex flex-col items-center justify-center py-1 transition-colors relative group focus:outline-none"
                aria-current={isActive ? 'page' : undefined}
              >
                {item.isAvatar && currentUser ? (
                  <div className={`p-0.5 rounded-full transition-all ${
                    isActive ? 'ring-2 ring-amber-600' : 'ring-1 ring-stone-300'
                  }`}>
                    <UserAvatar
                      src={userProfile?.photoURL || currentUser.photoURL}
                      seed={currentUser.uid}
                      name={userProfile?.displayName || currentUser.displayName || 'You'}
                      size="xs"
                      ring={false}
                    />
                  </div>
                ) : (
                  <IconComponent 
                    className={`w-5 h-5 transition-transform group-active:scale-90 ${
                      isActive ? 'text-amber-700 stroke-[2.4]' : 'text-stone-500 stroke-[1.8]'
                    }`} 
                  />
                )}
                <span 
                  className={`text-[10px] mt-0.5 tracking-tight font-medium ${
                    isActive ? 'text-amber-800 font-bold' : 'text-stone-500'
                  }`}
                >
                  {item.label}
                </span>

                {/* Subtle Active Indicator Dot */}
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-amber-600 absolute bottom-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 2. YouTube-Style "Create" Action Bottom Sheet */}
      {createSheetOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end md:hidden animate-in fade-in"
          onClick={() => setCreateSheetOpen(false)}
        >
          <div 
            className="bg-white rounded-t-3xl border-t border-stone-200 p-5 space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle & Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-600/10 text-amber-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-serif-display text-base font-bold text-stone-900">
                  DellyChow Creator Studio
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateSheetOpen(false)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Actions List */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setCreateSheetOpen(false);
                  if (isChef) {
                    onNavigate('chef-upload-video');
                  } else {
                    onNavigate('challenges');
                  }
                }}
                className="w-full p-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200/70 flex items-center gap-3.5 text-left transition-all active:scale-98"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Video className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
                    <span>Upload Cooking Video</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-600 text-white font-semibold">Studio</span>
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Publish an authentic video tutorial or knife masterclass
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreateSheetOpen(false);
                  if (isChef) {
                    onNavigate('chef-create-recipe');
                  } else {
                    onNavigate('account');
                  }
                }}
                className="w-full p-3.5 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200/80 flex items-center gap-3.5 text-left transition-all active:scale-98"
              >
                <div className="w-10 h-10 rounded-xl bg-stone-800 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-stone-900">
                    {isChef ? 'Create Recipe Guide' : 'Become a Certified Chef'}
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5">
                    {isChef 
                      ? 'Add step-by-step cooking instructions and culinary ingredients'
                      : 'Apply to publish artisan recipes and stream video masterclasses'}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreateSheetOpen(false);
                  onNavigate('challenges');
                }}
                className="w-full p-3 rounded-xl hover:bg-stone-50 flex items-center gap-3 text-left transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-stone-800">Join Cooking Challenge</div>
                  <p className="text-[11px] text-stone-500">Showcase your dish and win culinary community badges</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
