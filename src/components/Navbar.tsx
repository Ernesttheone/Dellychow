import React, { useState } from 'react';
import { 
  UtensilsCrossed, 
  Bookmark, 
  Crown, 
  User, 
  ChefHat, 
  Compass, 
  Video, 
  Menu, 
  X, 
  LogOut,
  ChevronDown,
  Edit3,
  HelpCircle,
  Bell,
  CheckCheck,
  ExternalLink,
  ShoppingCart,
  Trophy,
  Search
} from 'lucide-react';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, params?: any) => void;
  onOpenAuthModal: (mode?: 'login' | 'signup', role?: UserRole) => void;
  onOpenSupportModal?: () => void;
  onOpenSearch?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentView, 
  onNavigate, 
  onOpenAuthModal, 
  onOpenSupportModal,
  onOpenSearch 
}) => {
  const { 
    currentUser, 
    userProfile, 
    signOut, 
    favourites, 
    notifications, 
    unreadNotificationCount, 
    markNotificationAsRead, 
    markAllNotificationsAsRead 
  } = useAuth();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const isChef = userProfile?.role === 'chef';

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'explore', label: 'Explore' },
    { id: 'videos', label: 'Videos' },
    { id: 'challenges', label: 'Challenges' },
    { id: 'shopping-lists', label: 'Shopping Lists' },
    { id: 'favourites', label: `Favourites ${favourites.length > 0 ? `(${favourites.length})` : ''}` },
    { id: 'premium', label: 'VIP Classes' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-4 md:gap-6 h-16 sm:h-18">
          
          {/* Zone 1: Brand Wordmark */}
          <button 
            onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }}
            className="flex items-center gap-2 sm:gap-2.5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-md shrink-0"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-sm group-hover:bg-amber-700 transition-colors shrink-0">
              <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="font-serif-display text-xl sm:text-2xl font-bold tracking-tight text-stone-900 group-hover:text-amber-800 transition-colors block leading-tight">
                DellyChow
              </span>
              <span className="text-[9px] sm:text-[10px] tracking-wider uppercase text-stone-500 font-medium block">
                Artisanal Kitchen
              </span>
            </div>
          </button>

          {/* Zone 2: Navigation Links (hidden on mobile/tablet, full on lg: 1024px+) */}
          <nav className="hidden lg:flex items-center gap-3 xl:gap-6 text-xs lg:text-sm font-medium text-stone-600">
            {navLinks.map((link) => {
              const isActive = currentView === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => onNavigate(link.id)}
                  className={`whitespace-nowrap transition-colors py-1.5 border-b-2 ${
                    isActive 
                      ? 'text-amber-700 border-amber-600 font-semibold' 
                      : 'border-transparent hover:text-stone-900 hover:border-stone-300'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}

            {/* If Chef, direct link to Chef Studio */}
            {isChef && (
              <button
                onClick={() => onNavigate('chef-dashboard')}
                className={`whitespace-nowrap flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                  currentView.startsWith('chef-')
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                <ChefHat className="w-3.5 h-3.5" />
                Chef Studio
              </button>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />
          </nav>

          {/* Zone 3: Primary Action / User Profile & Notifications */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
            
            {/* YouTube-Style Search Button */}
            <button
              type="button"
              onClick={() => {
                if (onOpenSearch) onOpenSearch();
                else onNavigate('explore');
              }}
              className="p-2 text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
              title="Search recipes, videos, chefs"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

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
                }}
                className="relative p-2 text-stone-600 hover:text-amber-800 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {currentUser && unreadNotificationCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-amber-600 text-[9px] font-bold text-white shadow-xs animate-pulse">
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </span>
                )}
              </button>

                {/* Notifications Popover */}
                {notificationOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in slide-in-from-top-2"
                    onMouseLeave={() => setNotificationOpen(false)}
                  >
                    <div className="flex items-center justify-between px-4 py-2 border-b border-stone-100">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-amber-600" />
                        <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Chef & Live Alerts</h4>
                      </div>
                      {unreadNotificationCount > 0 && (
                        <button
                          onClick={markAllNotificationsAsRead}
                          className="text-[11px] font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-stone-100">
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
                            className={`p-3 text-left transition-colors cursor-pointer hover:bg-amber-50/50 flex items-start gap-2.5 ${
                              !notif.read ? 'bg-amber-50/30' : ''
                            }`}
                          >
                            <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-amber-500" style={{ opacity: notif.read ? 0 : 1 }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-stone-900 leading-tight">
                                {notif.title}
                              </p>
                              <p className="text-[11px] text-stone-600 mt-0.5 line-clamp-2">
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

            {/* Support & FAQ Button */}
            {onOpenSupportModal && (
              <button
                type="button"
                onClick={onOpenSupportModal}
                className="p-1.5 sm:p-2 text-stone-600 hover:text-amber-800 rounded-xl hover:bg-stone-100 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                title="Support & FAQ"
                aria-label="Support & FAQ"
              >
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span className="hidden sm:inline">Support</span>
              </button>
            )}

            {/* User Profile Dropdown or Auth Buttons */}
            {currentUser && userProfile ? (
              <div className="relative">
                <button
                  onClick={() => {
                    setUserDropdownOpen(!userDropdownOpen);
                    setNotificationOpen(false);
                  }}
                  className="flex items-center gap-2 sm:gap-2.5 p-1 sm:p-1.5 rounded-full hover:bg-stone-100 transition-colors border border-stone-200/60"
                  aria-expanded={userDropdownOpen}
                >
                  <UserAvatar
                    src={userProfile.photoURL}
                    name={userProfile.displayName}
                    seed={userProfile.id}
                    size="sm"
                    className="ring-2 ring-amber-500/20"
                  />
                  <div className="hidden lg:block text-left pr-1">
                    <p className="text-xs font-semibold text-stone-900 leading-tight truncate max-w-[100px]">
                      {userProfile.displayName}
                    </p>
                    <p className="text-[10px] text-amber-700 font-medium capitalize">
                      {userProfile.role === 'chef' ? 'Head Chef' : 'Food Lover'}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-stone-400" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1"
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-stone-100">
                      <p className="text-[11px] text-stone-500">Signed in as</p>
                      <p className="text-xs font-medium text-stone-900 truncate">{currentUser.email}</p>
                    </div>

                    <div className="px-4 py-2 bg-stone-50/80 border-b border-stone-100">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                        {isChef ? <ChefHat className="w-3.5 h-3.5 text-amber-600" /> : <User className="w-3.5 h-3.5 text-amber-600" />}
                        <span>Role: {isChef ? 'Chef Tutor' : 'Food Lover'}</span>
                      </div>
                      <span className="text-[10px] text-stone-500 block mt-0.5">Permanent account role</span>
                    </div>

                    <button
                      onClick={() => { onNavigate('user-profile'); setUserDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-stone-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2"
                    >
                      <User className="w-4 h-4 text-amber-600" />
                      View User Profile
                    </button>

                    {isChef && (
                      <button
                        onClick={() => { onNavigate('chef-dashboard'); setUserDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-stone-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2"
                      >
                        <ChefHat className="w-4 h-4 text-amber-600" />
                        Chef Studio Dashboard
                      </button>
                    )}

                    <button
                      onClick={() => { onNavigate('account'); setUserDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-stone-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4 text-stone-500" />
                      Edit Profile & Settings
                    </button>

                    <button
                      onClick={() => { onNavigate('shopping-lists'); setUserDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-stone-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4 text-stone-500" />
                      Shopping Lists
                    </button>

                    <button
                      onClick={() => { onNavigate('challenges'); setUserDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-stone-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2"
                    >
                      <Trophy className="w-4 h-4 text-stone-500" />
                      Cooking Challenges
                    </button>

                    <button
                      onClick={() => { onNavigate('favourites'); setUserDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-stone-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2"
                    >
                      <Bookmark className="w-4 h-4 text-stone-500" />
                      Saved Favourites ({favourites.length})
                    </button>

                    <button
                      onClick={() => { signOut(); setUserDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-stone-100"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenAuthModal('login')}
                  className="hidden xs:inline-flex sm:inline-flex px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 transition-colors whitespace-nowrap"
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuthModal('signup')}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-colors shadow-xs whitespace-nowrap"
                >
                  <span className="hidden sm:inline">Create Account</span>
                  <span className="sm:hidden">Join</span>
                </button>
              </div>
            )}

            {/* Mobile & Tablet Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-stone-600 hover:text-stone-900 focus:outline-none shrink-0"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-stone-200 bg-[#FAF7F2] px-4 pt-3 pb-6 space-y-2">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => { onNavigate(link.id); setMobileMenuOpen(false); }}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                currentView === link.id ? 'bg-amber-100 text-amber-800' : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              {link.label}
            </button>
          ))}

          {isChef && (
            <button
              onClick={() => { onNavigate('chef-dashboard'); setMobileMenuOpen(false); }}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium bg-amber-600 text-white"
            >
              Chef Studio Dashboard
            </button>
          )}

          {/* Theme Toggle in Mobile Drawer */}
          <div className="pt-2 pb-1">
            <ThemeToggle showLabel className="w-full justify-between py-2.5 px-3" />
          </div>

          {currentUser && (
            <div className="pt-2 space-y-2 border-t border-stone-200">
              <button
                onClick={() => { onNavigate('user-profile'); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-amber-800 bg-amber-50 flex items-center gap-2"
              >
                <User className="w-4 h-4 text-amber-600" />
                <span>My User Profile</span>
              </button>
              <button
                onClick={() => { onNavigate('account'); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-100 flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4 text-stone-500" />
                <span>Edit Profile & Avatars</span>
              </button>
            </div>
          )}

          {!currentUser && (
            <div className="pt-2 space-y-2 border-t border-stone-200">
              <button
                onClick={() => { onOpenAuthModal('login'); setMobileMenuOpen(false); }}
                className="block w-full text-center px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => { onOpenAuthModal('signup'); setMobileMenuOpen(false); }}
                className="block w-full text-center px-4 py-2.5 rounded-xl text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-sm"
              >
                Create Account
              </button>
            </div>
          )}

          {onOpenSupportModal && (
            <div className="pt-2 border-t border-stone-200">
              <button
                onClick={() => { onOpenSupportModal(); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-100 flex items-center gap-2"
              >
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>Support & FAQ</span>
              </button>
            </div>
          )}
        </div>
      )}

    </header>
  );
};
