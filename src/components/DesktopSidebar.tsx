import React, { useState } from 'react';
import {
  Home,
  Compass,
  Video,
  Crown,
  ChefHat,
  Upload,
  PlusCircle,
  BookOpen,
  Users,
  Bookmark,
  ShoppingCart,
  Trophy,
  User,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  X,
  Scale,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { BrandLogo } from './BrandLogo';

interface DesktopSidebarProps {
  currentView: string;
  collapsed: boolean;
  mobileDrawerOpen: boolean;
  onCloseMobileDrawer: () => void;
  onNavigate: (view: string, params?: any) => void;
  onOpenAuthModal: (mode?: 'login' | 'signup', role?: 'user' | 'chef') => void;
  onOpenSupportModal?: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  currentView,
  collapsed,
  mobileDrawerOpen,
  onCloseMobileDrawer,
  onNavigate,
  onOpenAuthModal,
  onOpenSupportModal,
}) => {
  const { currentUser, userProfile, favourites, isAdmin } = useAuth();
  const [libraryExpanded, setLibraryExpanded] = useState(true);

  const isChef = userProfile?.role === 'chef';
  const legalViews = ['legal', 'terms', 'privacy', 'guidelines', 'copyright', 'food-safety', 'cookies', 'reporting', 'contact'];
  const isLegalActive = legalViews.includes(currentView);

  const handleNav = (view: string, requiresAuth = false) => {
    if (requiresAuth && !currentUser) {
      onOpenAuthModal('login', 'user');
      onCloseMobileDrawer();
      return;
    }
    onNavigate(view);
    onCloseMobileDrawer();
  };

  const primaryItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'explore', label: 'Explore Recipes', icon: Compass },
    { id: 'videos', label: 'Video Classes', icon: Video },
    { id: 'premium', label: 'VIP Classes', icon: Crown },
  ];

  const chefItems = [
    { id: 'chef-dashboard', label: 'Chef Studio', icon: ChefHat },
    { id: 'chef-upload-video', label: 'Upload Video', icon: Upload },
    { id: 'chef-create-recipe', label: 'Create Recipe', icon: PlusCircle },
    { id: 'chef-my-recipes', label: 'My Recipes', icon: BookOpen },
    { id: 'chef-community', label: 'Chef Circle', icon: Users },
  ];

  const libraryItems = [
    {
      id: 'favourites',
      label: favourites.length > 0 ? `Favourites (${favourites.length})` : 'Favourites',
      icon: Bookmark,
      requiresAuth: false,
    },
    { id: 'shopping-lists', label: 'Shopping Lists', icon: ShoppingCart, requiresAuth: false },
    { id: 'challenges', label: 'Challenges', icon: Trophy, requiresAuth: false },
    { id: 'user-profile', label: 'My Profile', icon: User, requiresAuth: true },
    { id: 'account', label: 'Settings', icon: Settings, requiresAuth: false },
  ];

  const renderNavContent = (isExpandedView: boolean) => (
    <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden py-3 px-2.5 space-y-4">
      {/* 1. Primary Feature Selection Roll */}
      <div className="space-y-1">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentView === item.id ||
            (item.id === 'explore' && currentView === 'recipe-detail');

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              title={!isExpandedView ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center ${
                isExpandedView ? 'justify-start gap-3.5 px-3 py-2.5' : 'flex-col justify-center gap-1 py-2.5 px-1'
              } rounded-xl text-left transition-colors cursor-pointer ${
                isActive
                  ? 'bg-amber-600/12 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 font-semibold'
                  : 'text-stone-700 hover:bg-stone-200/60 dark:text-stone-300 dark:hover:bg-stone-800/70 font-medium'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? 'text-amber-600 dark:text-amber-400 stroke-[2.3]' : 'stroke-[1.9]'
                }`}
              />
              <span
                className={`${
                  isExpandedView ? 'text-sm truncate' : 'text-[10px] text-center leading-tight line-clamp-1'
                }`}
              >
                {item.id === 'explore' && !isExpandedView
                  ? 'Explore'
                  : item.id === 'videos' && !isExpandedView
                  ? 'Videos'
                  : item.id === 'premium' && !isExpandedView
                  ? 'VIP'
                  : item.label}
              </span>
            </button>
          );
        })}

        {/* Food Lover Theme Toggle directly after VIP Classes */}
        {!isChef && (
          <div className={`pt-1.5 ${isExpandedView ? 'px-1' : 'flex justify-center'}`}>
            <ThemeToggle
              showLabel={isExpandedView}
              className={
                isExpandedView
                  ? 'w-full justify-between py-2 px-3 rounded-xl'
                  : 'w-full justify-center py-2 px-1 rounded-xl'
              }
            />
          </div>
        )}
      </div>

      {/* 2. Chef Studio Feature Selection Roll (Chef accounts only) */}
      {isChef && (
        <div className="pt-3 border-t border-stone-200/80 dark:border-stone-800 space-y-1">
          {isExpandedView && (
            <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Chef Studio
            </p>
          )}
          {chefItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                title={!isExpandedView ? item.label : undefined}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center ${
                  isExpandedView ? 'justify-start gap-3.5 px-3 py-2.5' : 'flex-col justify-center gap-1 py-2 px-1'
                } rounded-xl transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-xs font-semibold'
                    : 'text-stone-700 hover:bg-stone-200/60 dark:text-stone-300 dark:hover:bg-stone-800/70 font-medium'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0 stroke-[2]" />
                <span
                  className={`${
                    isExpandedView ? 'text-sm truncate' : 'text-[10px] text-center leading-tight line-clamp-1'
                  }`}
                >
                  {!isExpandedView && item.id === 'chef-dashboard' ? 'Studio' : item.label}
                </span>
              </button>
            );
          })}

          {/* Chef Theme Toggle directly after Chef Studio */}
          <div className={`pt-1.5 ${isExpandedView ? 'px-1' : 'flex justify-center'}`}>
            <ThemeToggle
              showLabel={isExpandedView}
              className={
                isExpandedView
                  ? 'w-full justify-between py-2 px-3 rounded-xl'
                  : 'w-full justify-center py-2 px-1 rounded-xl'
              }
            />
          </div>
        </div>
      )}

      {/* 3. Expandable "Your Kitchen" Section */}
      <div className="pt-3 border-t border-stone-200/80 dark:border-stone-800 space-y-1">
        {isExpandedView && (
          <button
            type="button"
            onClick={() => setLibraryExpanded(!libraryExpanded)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer"
          >
            <span>Your Kitchen</span>
            {libraryExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}

        {(libraryExpanded || !isExpandedView) && (
          <div className="space-y-1">
            {libraryItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id, item.requiresAuth)}
                  title={!isExpandedView ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center ${
                    isExpandedView ? 'justify-start gap-3.5 px-3 py-2.5' : 'flex-col justify-center gap-1 py-2 px-1'
                  } rounded-xl transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-amber-600/12 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 font-semibold'
                      : 'text-stone-700 hover:bg-stone-200/60 dark:text-stone-300 dark:hover:bg-stone-800/70 font-medium'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0 stroke-[1.85]" />
                  <span
                    className={`${
                      isExpandedView ? 'text-sm truncate' : 'text-[10px] text-center leading-tight line-clamp-1'
                    }`}
                  >
                    {!isExpandedView && item.id === 'shopping-lists'
                      ? 'Lists'
                      : !isExpandedView && item.id === 'user-profile'
                      ? 'Profile'
                      : !isExpandedView && item.id === 'favourites'
                      ? 'Saved'
                      : item.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Support & Legal Links */}
      <div className="pt-3 border-t border-stone-200/80 dark:border-stone-800 mt-auto space-y-1">
        {onOpenSupportModal && (
          <button
            type="button"
            onClick={() => {
              onOpenSupportModal();
              onCloseMobileDrawer();
            }}
            title={!isExpandedView ? 'Support & FAQ' : undefined}
            className={`w-full flex items-center ${
              isExpandedView ? 'justify-start gap-3.5 px-3 py-2.5' : 'flex-col justify-center gap-1 py-2 px-1'
            } rounded-xl text-stone-600 hover:bg-stone-200/60 dark:text-stone-400 dark:hover:bg-stone-800/70 font-medium transition-colors cursor-pointer`}
          >
            <HelpCircle className="w-5 h-5 shrink-0 text-amber-600" />
            <span className={isExpandedView ? 'text-sm truncate' : 'text-[10px]'}>
              {isExpandedView ? 'Support & FAQ' : 'Help'}
            </span>
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => handleNav('admin-governance')}
            title={!isExpandedView ? 'Admin Governance' : undefined}
            aria-current={currentView === 'admin-governance' ? 'page' : undefined}
            className={`w-full flex items-center ${
              isExpandedView ? 'justify-start gap-3.5 px-3 py-2' : 'flex-col justify-center gap-1 py-2 px-1'
            } rounded-xl transition-colors cursor-pointer ${
              currentView === 'admin-governance'
                ? 'bg-amber-600/12 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 font-semibold'
                : 'text-stone-600 hover:bg-stone-200/60 dark:text-stone-400 dark:hover:bg-stone-800/70 font-medium'
            }`}
          >
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
            <span className={isExpandedView ? 'text-xs truncate' : 'text-[10px]'}>
              {isExpandedView ? 'Admin Console' : 'Admin'}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => handleNav('legal')}
          title={!isExpandedView ? 'Legal Centre' : undefined}
          aria-current={isLegalActive ? 'page' : undefined}
          className={`w-full flex items-center ${
            isExpandedView ? 'justify-start gap-3.5 px-3 py-2' : 'flex-col justify-center gap-1 py-2 px-1'
          } rounded-xl transition-colors cursor-pointer ${
            isLegalActive
              ? 'bg-amber-600/12 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 font-semibold'
              : 'text-stone-600 hover:bg-stone-200/60 dark:text-stone-400 dark:hover:bg-stone-800/70 font-medium'
          }`}
        >
          <Scale className="w-4 h-4 shrink-0" />
          <span className={isExpandedView ? 'text-xs truncate' : 'text-[10px]'}>
            {isExpandedView ? 'Legal Centre' : 'Legal'}
          </span>
        </button>

        {isExpandedView && (
          <div className="px-3 pt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-stone-400">
            <button
              type="button"
              onClick={() => handleNav('terms')}
              className="hover:text-amber-600 transition-colors cursor-pointer"
            >
              Terms
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => handleNav('privacy')}
              className="hover:text-amber-600 transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => handleNav('guidelines')}
              className="hover:text-amber-600 transition-colors cursor-pointer"
            >
              Guidelines
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => handleNav('reporting')}
              className="hover:text-amber-600 transition-colors cursor-pointer"
            >
              Report
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Collapsible Left Sidebar (lg: 1024px+) */}
      <aside
        aria-label="Primary Sidebar Navigation"
        className={`hidden lg:block shrink-0 sticky top-16 h-[calc(100vh-4rem)] border-r border-stone-200/80 dark:border-stone-800 bg-[#FAF7F2]/90 dark:bg-[#141210]/95 backdrop-blur-sm transition-[width] duration-200 ease-out z-30 ${
          collapsed ? 'w-[76px]' : 'w-60'
        }`}
      >
        {renderNavContent(!collapsed)}
      </aside>

      {/* Tablet Mini Rail (md: 768px - 1023px) */}
      <aside
        aria-label="Compact Sidebar Navigation"
        className="hidden md:block lg:hidden shrink-0 sticky top-16 h-[calc(100vh-4rem)] w-[76px] border-r border-stone-200/80 dark:border-stone-800 bg-[#FAF7F2]/90 dark:bg-[#141210]/95 backdrop-blur-sm z-30"
      >
        {renderNavContent(false)}
      </aside>

      {/* Tablet Slide-Over Expanded Drawer (triggered by top-left menu button on md: screens) */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 hidden md:flex lg:hidden bg-black/50 backdrop-blur-xs animate-in fade-in"
          onClick={onCloseMobileDrawer}
        >
          <div
            className="w-64 max-w-[80vw] h-full bg-[#FAF7F2] dark:bg-[#141210] border-r border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col animate-in slide-in-from-left-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-16 px-4 flex items-center justify-between border-b border-stone-200/80 dark:border-stone-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <BrandLogo size="sm" />
                <span className="font-serif-display text-lg font-bold text-stone-900 dark:text-stone-100">
                  DellyChow
                </span>
              </div>
              <button
                type="button"
                onClick={onCloseMobileDrawer}
                className="p-2 rounded-xl text-stone-500 hover:bg-stone-200/60 dark:hover:bg-stone-800 cursor-pointer"
                aria-label="Close navigation drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{renderNavContent(true)}</div>
          </div>
        </div>
      )}
    </>
  );
};
