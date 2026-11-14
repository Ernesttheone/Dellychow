import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Bookmark,
  Crown,
  User,
  ChefHat,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Edit3,
  HelpCircle,
  Bell,
  CheckCheck,
  ShoppingCart,
  Trophy,
  Search,
  Video,
  Plus,
  Upload,
  BookOpen,
  Play,
  Home,
  Compass,
  Scale,
} from 'lucide-react';
import { UserRole, CookingVideo, Recipe } from '../types';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';
import { ThemeToggle } from './ThemeToggle';
import { BrandLogo } from './BrandLogo';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, params?: any) => void;
  onOpenAuthModal: (mode?: 'login' | 'signup', role?: UserRole) => void;
  onOpenSupportModal?: () => void;
  onOpenSearch?: () => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  videos?: CookingVideo[];
  recipes?: Recipe[];
  onPlayVideo?: (video: CookingVideo) => void;
  onSelectRecipe?: (recipe: Recipe) => void;
  onSelectChef?: (chefId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenAuthModal,
  onOpenSupportModal,
  onOpenSearch,
  onToggleSidebar,
  videos = [],
  recipes = [],
  onPlayVideo,
  onSelectRecipe,
  onSelectChef,
}) => {
  const {
    currentUser,
    userProfile,
    signOut,
    favourites,
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  // Desktop functional search bar state
  const [desktopQuery, setDesktopQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const isChef = userProfile?.role === 'chef';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    const q = desktopQuery.trim().toLowerCase();
    if (!q) return { matchedVideos: [], matchedRecipes: [], matchedChefs: [] };

    const matchedVideos = videos
      .filter(
        (v) =>
          v.title?.toLowerCase().includes(q) ||
          v.authorName?.toLowerCase().includes(q) ||
          v.category?.toLowerCase().includes(q)
      )
      .slice(0, 4);

    const matchedRecipes = recipes
      .filter(
        (r) =>
          r.title?.toLowerCase().includes(q) ||
          r.authorName?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q) ||
          r.cuisine?.toLowerCase().includes(q)
      )
      .slice(0, 4);

    const chefMap = new Map<string, { id: string; name: string; photo?: string }>();
    [...videos, ...recipes].forEach((item) => {
      if (item.authorId && item.authorName?.toLowerCase().includes(q) && !chefMap.has(item.authorId)) {
        chefMap.set(item.authorId, {
          id: item.authorId,
          name: item.authorName,
          photo: item.authorPhoto,
        });
      }
    });

    return {
      matchedVideos,
      matchedRecipes,
      matchedChefs: Array.from(chefMap.values()).slice(0, 3),
    };
  }, [desktopQuery, videos, recipes]);

  const hasSearchResults =
    searchResults.matchedVideos.length > 0 ||
    searchResults.matchedRecipes.length > 0 ||
    searchResults.matchedChefs.length > 0;

  const handleDesktopSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desktopQuery.trim()) return;
    if (searchResults.matchedVideos.length > 0 && onPlayVideo) {
      onPlayVideo(searchResults.matchedVideos[0]);
      setSearchFocused(false);
      return;
    }
    if (searchResults.matchedRecipes.length > 0 && onSelectRecipe) {
      onSelectRecipe(searchResults.matchedRecipes[0]);
      setSearchFocused(false);
      return;
    }
    setSearchFocused(false);
    onNavigate('explore');
  };

  // Feature selection roll for mobile drawer (preserving ThemeToggle placement rule)
  const coreLinks = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'explore', label: 'Explore Recipes', icon: Compass },
    { id: 'videos', label: 'Video Classes', icon: Video },
    { id: 'challenges', label: 'Cooking Challenges', icon: Trophy },
    { id: 'shopping-lists', label: 'Shopping Lists', icon: ShoppingCart },
    {
      id: 'favourites',
      label: favourites.length > 0 ? `Favourites (${favourites.length})` : 'Favourites',
      icon: Bookmark,
    },
    { id: 'premium', label: 'VIP Classes', icon: Crown },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 dark:bg-[#141210]/95 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800">
      <div className="w-full px-3 sm:px-4 lg:px-5">
        <div className="flex items-center justify-between gap-2 sm:gap-4 h-14 md:h-16">
          {/* Zone 1: Left Sidebar Toggle + Official Deli Chow Logo */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="hidden md:inline-flex items-center justify-center w-10 h-10 rounded-xl text-stone-700 dark:text-stone-200 hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                aria-label="Toggle navigation sidebar"
                title="Toggle sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onNavigate('home');
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 sm:gap-2.5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-xl p-1 cursor-pointer"
            >
              <BrandLogo size="md" className="group-hover:brightness-95 transition-all" />
              <div>
                <span className="font-serif-display text-lg sm:text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors block leading-tight">
                  DellyChow
                </span>
                <span className="hidden sm:block text-[9px] tracking-wider uppercase text-stone-500 font-medium">
                  Artisanal Kitchen
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: YouTube-Style Centered Desktop Search Bar (md+) */}
          <div ref={searchContainerRef} className="hidden md:flex flex-1 max-w-xl mx-3 lg:mx-6 relative">
            <form
              onSubmit={handleDesktopSearchSubmit}
              className="w-full flex items-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-full shadow-2xs focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 overflow-hidden transition-all"
            >
              <Search className="w-4 h-4 text-stone-400 ml-4 shrink-0" />
              <input
                type="text"
                value={desktopQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  setDesktopQuery(e.target.value);
                  setSearchFocused(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearchFocused(false);
                }}
                placeholder="Search recipes, chef video classes, or master chefs..."
                aria-label="Search recipes, videos, and chefs"
                className="w-full px-3 py-2 text-sm bg-transparent text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none border-none"
              />
              {desktopQuery && (
                <button
                  type="button"
                  onClick={() => setDesktopQuery('')}
                  className="p-1.5 mr-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-full cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 border-l border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 transition-colors cursor-pointer"
                aria-label="Run search"
                title="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Instant Desktop Search Results Dropdown */}
            {searchFocused && desktopQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 max-h-[70vh] overflow-y-auto">
                {!hasSearchResults ? (
                  <div className="p-6 text-center text-xs text-stone-500">
                    No matching cooking videos, recipes, or chefs found for &ldquo;{desktopQuery}&rdquo;.
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100 dark:divide-stone-800">
                    {searchResults.matchedVideos.length > 0 && (
                      <div className="p-2">
                        <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          Cooking Videos
                        </p>
                        {searchResults.matchedVideos.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              setSearchFocused(false);
                              if (onPlayVideo) onPlayVideo(v);
                              else onNavigate('videos', { videoId: v.id });
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-amber-50/70 dark:hover:bg-stone-800 text-left transition-colors cursor-pointer"
                          >
                            <div className="w-14 h-9 rounded-lg bg-stone-200 overflow-hidden shrink-0 relative">
                              <img
                                src={v.thumbnailUrl}
                                alt={v.title}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute inset-0 bg-black/25 flex items-center justify-center">
                                <Play className="w-3.5 h-3.5 text-white fill-white" />
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                                {v.title}
                              </p>
                              <p className="text-[11px] text-stone-500 truncate">
                                Chef {v.authorName}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.matchedRecipes.length > 0 && (
                      <div className="p-2">
                        <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          Artisanal Recipes
                        </p>
                        {searchResults.matchedRecipes.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setSearchFocused(false);
                              if (onSelectRecipe) onSelectRecipe(r);
                              else onNavigate('recipe-detail', { recipeId: r.id });
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-amber-50/70 dark:hover:bg-stone-800 text-left transition-colors cursor-pointer"
                          >
                            <img
                              src={r.imageUrl}
                              alt={r.title}
                              className="w-10 h-10 rounded-lg object-cover bg-stone-200 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                                {r.title}
                              </p>
                              <p className="text-[11px] text-stone-500 truncate">
                                {r.cuisine} &bull; Chef {r.authorName}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.matchedChefs.length > 0 && (
                      <div className="p-2">
                        <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          Chefs
                        </p>
                        {searchResults.matchedChefs.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSearchFocused(false);
                              if (onSelectChef) onSelectChef(c.id);
                              else onNavigate('chef-profile', { chefId: c.id });
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-amber-50/70 dark:hover:bg-stone-800 text-left transition-colors cursor-pointer"
                          >
                            <UserAvatar src={c.photo} name={c.name} seed={c.id} size="xs" />
                            <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                              Chef {c.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Zone 3: Right Actions (Mobile Search + Desktop Create + Bell + Support + Account + Mobile Menu) */}
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
            {/* Mobile YouTube-Style Search Icon Button */}
            <button
              type="button"
              onClick={() => {
                if (onOpenSearch) onOpenSearch();
                else onNavigate('explore');
              }}
              className="md:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
              title="Search recipes, videos, chefs"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Desktop "+ Create" Button */}
            <div className="hidden md:block relative">
              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    onOpenAuthModal('signup', 'chef');
                    return;
                  }
                  if (isChef) {
                    setCreateMenuOpen(!createMenuOpen);
                    setNotificationOpen(false);
                    setUserDropdownOpen(false);
                  } else {
                    onNavigate('challenges');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 text-xs font-semibold transition-colors cursor-pointer"
                title={isChef ? 'Create video or recipe' : 'Explore cooking challenges'}
              >
                <Plus className="w-4 h-4 text-amber-600" />
                <span>{isChef ? 'Create' : 'Challenges'}</span>
              </button>

              {createMenuOpen && isChef && (
                <div
                  className="absolute right-0 mt-2 w-52 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 py-1.5 z-50 animate-in fade-in slide-in-from-top-1"
                  onMouseLeave={() => setCreateMenuOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate('chef-upload-video');
                      setCreateMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-stone-800 dark:text-stone-100 hover:bg-amber-50 dark:hover:bg-stone-800 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-amber-600" />
                    <span>Upload / Record Video</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate('chef-create-recipe');
                      setCreateMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-stone-800 dark:text-stone-100 hover:bg-amber-50 dark:hover:bg-stone-800 flex items-center gap-2.5 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-amber-600" />
                    <span>Publish Recipe Guide</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate('chef-dashboard');
                      setCreateMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-stone-800 dark:text-stone-100 hover:bg-amber-50 dark:hover:bg-stone-800 flex items-center gap-2.5 border-t border-stone-100 dark:border-stone-800 cursor-pointer"
                  >
                    <ChefHat className="w-4 h-4 text-stone-500" />
                    <span>Open Chef Studio</span>
                  </button>
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    onOpenAuthModal('login');
                    return;
                  }
                  setNotificationOpen(!notificationOpen);
                  setUserDropdownOpen(false);
                  setCreateMenuOpen(false);
                }}
                className="relative inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-stone-600 dark:text-stone-300 hover:text-amber-800 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {currentUser && unreadNotificationCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-amber-600 text-[9px] font-bold text-white shadow-xs">
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </span>
                )}
              </button>

              {/* Notifications Popover */}
              {notificationOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 py-2 z-50 animate-in fade-in slide-in-from-top-2"
                  onMouseLeave={() => setNotificationOpen(false)}
                >
                  <div className="flex items-center justify-between px-4 py-2 border-b border-stone-100 dark:border-stone-800">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-600" />
                      <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                        Chef &amp; Live Alerts
                      </h4>
                    </div>
                    {unreadNotificationCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsAsRead}
                        className="text-[11px] font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-stone-400">
                        <Bell className="w-8 h-8 mx-auto text-stone-300 mb-2 stroke-1" />
                        No notifications yet. Follow chefs to get notified when they post tutorials or host live masterclasses!
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            markNotificationAsRead(notif.id);
                            if (notif.link) {
                              if (notif.link.startsWith('video:')) {
                                onNavigate('videos', { videoId: notif.link.replace('video:', '') });
                              } else if (notif.link.startsWith('recipe:')) {
                                onNavigate('recipe-detail', { recipeId: notif.link.replace('recipe:', '') });
                              } else if (notif.link === 'premium') {
                                onNavigate('premium');
                              }
                            }
                            setNotificationOpen(false);
                          }}
                          className={`p-3 text-left transition-colors cursor-pointer hover:bg-amber-50/50 dark:hover:bg-stone-800 flex items-start gap-2.5 ${
                            !notif.read ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                          }`}
                        >
                          <div
                            className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-amber-500"
                            style={{ opacity: notif.read ? 0 : 1 }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 leading-tight">
                              {notif.title}
                            </p>
                            <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                            <span className="text-[9px] text-stone-400 mt-1 block">
                              {new Date(notif.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Support & FAQ Button (Desktop / Tablet) */}
            {onOpenSupportModal && (
              <button
                type="button"
                onClick={onOpenSupportModal}
                className="hidden md:inline-flex items-center justify-center min-w-[40px] min-h-[40px] px-2.5 text-stone-600 dark:text-stone-300 hover:text-amber-800 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors gap-1.5 text-xs font-semibold cursor-pointer"
                title="Support & FAQ"
                aria-label="Support & FAQ"
              >
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span className="hidden xl:inline">Support</span>
              </button>
            )}

            {/* User Profile Dropdown or Auth Buttons */}
            {currentUser && userProfile ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setUserDropdownOpen(!userDropdownOpen);
                    setNotificationOpen(false);
                    setCreateMenuOpen(false);
                  }}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors border border-stone-200/60 dark:border-stone-700 cursor-pointer min-h-[44px]"
                  aria-expanded={userDropdownOpen}
                >
                  <UserAvatar
                    src={userProfile.photoURL}
                    name={userProfile.displayName}
                    seed={userProfile.id}
                    size="sm"
                    className="ring-2 ring-amber-500/20"
                  />
                  <div className="hidden xl:block text-left pr-1">
                    <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 leading-tight truncate max-w-[100px]">
                      {userProfile.displayName}
                    </p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium capitalize">
                      {userProfile.role === 'chef' ? 'Head Chef' : 'Food Lover'}
                    </p>
                  </div>
                  <ChevronDown className="hidden sm:block w-4 h-4 text-stone-400 mr-1" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 py-1.5 z-50 animate-in fade-in slide-in-from-top-1"
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-stone-100 dark:border-stone-800">
                      <p className="text-[11px] text-stone-500">Signed in as</p>
                      <p className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate">
                        {currentUser.email}
                      </p>
                    </div>

                    <div className="px-4 py-2 bg-stone-50/80 dark:bg-stone-800/60 border-b border-stone-100 dark:border-stone-800">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 dark:text-stone-100">
                        {isChef ? (
                          <ChefHat className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        <span>Role: {isChef ? 'Chef Tutor' : 'Food Lover'}</span>
                      </div>
                      <span className="text-[10px] text-stone-500 block mt-0.5">Permanent account role</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('user-profile');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-stone-800 hover:text-amber-800 flex items-center gap-2 cursor-pointer"
                    >
                      <User className="w-4 h-4 text-amber-600" />
                      View User Profile
                    </button>

                    {isChef && (
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate('chef-dashboard');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-stone-800 hover:text-amber-800 flex items-center gap-2 cursor-pointer"
                      >
                        <ChefHat className="w-4 h-4 text-amber-600" />
                        Chef Studio Dashboard
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('account');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-stone-800 hover:text-amber-800 flex items-center gap-2 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4 text-stone-500" />
                      Edit Profile &amp; Settings
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('shopping-lists');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-stone-800 hover:text-amber-800 flex items-center gap-2 cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4 text-stone-500" />
                      Shopping Lists
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('challenges');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-stone-800 hover:text-amber-800 flex items-center gap-2 cursor-pointer"
                    >
                      <Trophy className="w-4 h-4 text-stone-500" />
                      Cooking Challenges
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('favourites');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-stone-800 hover:text-amber-800 flex items-center gap-2 cursor-pointer"
                    >
                      <Bookmark className="w-4 h-4 text-stone-500" />
                      Saved Favourites ({favourites.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        signOut();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 border-t border-stone-100 dark:border-stone-800 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenAuthModal('login')}
                  className="hidden sm:inline-flex px-3 py-2 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:text-stone-900 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuthModal('signup')}
                  className="px-3 sm:px-4 min-h-[38px] sm:min-h-[40px] text-xs font-semibold text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-colors shadow-xs whitespace-nowrap cursor-pointer"
                >
                  <span className="hidden sm:inline">Sign In / Join</span>
                  <span className="sm:hidden">Sign In</span>
                </button>
              </div>
            )}

            {/* Mobile Collapsible Navigation Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl focus:outline-none shrink-0 cursor-pointer"
              aria-label="Toggle mobile navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Collapsible Navigation Drawer (< md) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 dark:border-stone-800 bg-[#FAF7F2] dark:bg-[#141210] px-4 pt-3 pb-6 space-y-1.5 max-h-[80vh] overflow-y-auto animate-in fade-in slide-in-from-top-2">
          {coreLinks.map((link) => {
            const Icon = link.icon;
            const isActive = currentView === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => {
                  onNavigate(link.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 text-left px-3 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-semibold'
                    : 'text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{link.label}</span>
              </button>
            );
          })}

          {/* Food Lover Theme Toggle directly after VIP Classes */}
          {!isChef && (
            <div className="pt-1.5 pb-1">
              <ThemeToggle showLabel className="w-full justify-between py-2.5 px-3 min-h-[44px]" />
            </div>
          )}

          {/* Chef Studio & Theme Toggle directly after Chef Studio */}
          {isChef && (
            <>
              <button
                type="button"
                onClick={() => {
                  onNavigate('chef-dashboard');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 text-left px-3 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold bg-amber-600 text-white"
              >
                <ChefHat className="w-4 h-4 shrink-0" />
                <span>Chef Studio Dashboard</span>
              </button>
              <div className="pt-1.5 pb-1">
                <ThemeToggle showLabel className="w-full justify-between py-2.5 px-3 min-h-[44px]" />
              </div>
            </>
          )}

          {currentUser && (
            <div className="pt-2 space-y-1.5 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => {
                  onNavigate('user-profile');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 min-h-[44px] rounded-xl text-sm font-medium text-amber-800 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300 flex items-center gap-2.5"
              >
                <User className="w-4 h-4 text-amber-600" />
                <span>My User Profile</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigate('account');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 min-h-[44px] rounded-xl text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2.5"
              >
                <Edit3 className="w-4 h-4 text-stone-500" />
                <span>Edit Profile &amp; Avatars</span>
              </button>
            </div>
          )}

          {!currentUser && (
            <div className="pt-2 space-y-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => {
                  onOpenAuthModal('login');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-center px-4 py-3 min-h-[44px] rounded-xl text-xs font-semibold text-stone-800 dark:text-stone-100 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 transition-colors"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenAuthModal('signup');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-center px-4 py-3 min-h-[44px] rounded-xl text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-sm"
              >
                Create Account
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-1">
            {onOpenSupportModal && (
              <button
                type="button"
                onClick={() => {
                  onOpenSupportModal();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 min-h-[44px] rounded-xl text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2.5"
              >
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>Support &amp; FAQ</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onNavigate('terms');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 min-h-[44px] rounded-xl text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2.5"
            >
              <Scale className="w-4 h-4 text-amber-600" />
              <span>Terms &amp; Conditions</span>
            </button>

            <div className="flex flex-wrap items-center gap-3 px-3 pt-1 text-xs text-stone-500">
              <button
                type="button"
                onClick={() => {
                  onNavigate('privacy');
                  setMobileMenuOpen(false);
                }}
                className="hover:text-amber-600 font-medium"
              >
                Privacy Policy
              </button>
              <span>&bull;</span>
              <button
                type="button"
                onClick={() => {
                  onNavigate('guidelines');
                  setMobileMenuOpen(false);
                }}
                className="hover:text-amber-600 font-medium"
              >
                Community Guidelines
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
