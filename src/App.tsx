import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Recipe, CookingVideo, UserRole } from './types';
import { RecipeService } from './services/recipeService';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AuthModal } from './components/AuthModal';
import { SupportFAQModal } from './components/SupportFAQModal';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { VideoCleanupModal } from './components/VideoCleanupModal';
import { ErrorBoundary } from './components/ErrorBoundary';

import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { VideosPage } from './pages/VideosPage';
import { FavouritesPage } from './pages/FavouritesPage';
import { ChefProfilePage } from './pages/ChefProfilePage';
import { PremiumPage } from './pages/PremiumPage';
import { AccountPage } from './pages/AccountPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { ShoppingListsPage } from './pages/ShoppingListsPage';
import { ChallengesPage } from './pages/ChallengesPage';
import { AddIngredientsModal } from './components/shopping/AddIngredientsModal';

import { ChefDashboard } from './pages/chef/ChefDashboard';
import { ChefCreateRecipe } from './pages/chef/ChefCreateRecipe';
import { ChefUploadVideo } from './pages/chef/ChefUploadVideo';
import { ChefMyRecipes } from './pages/chef/ChefMyRecipes';
import { ChefCommunity } from './pages/chef/ChefCommunity';
import { ASSET_IMAGES } from './assets/images';
import { syncPublishedVideosToServer } from './lib/videoStorage';
import { ShareModal, ShareItem } from './components/ShareModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileSearchOverlay } from './components/MobileSearchOverlay';
import { ThemeProvider } from './context/ThemeContext';
import { OfflineIndicator } from './components/OfflineIndicator';
import { recordWatchedVideoOffline, getWatchedVideosOffline } from './lib/offlineVideoCache';
import { DeliChowSplashLoader } from './components/DeliChowSplashLoader';
import { DesktopSidebar } from './components/DesktopSidebar';
import { TermsAndConditionsPage, PrefillCopyrightTarget } from './pages/TermsAndConditionsPage';
import { AdminGovernancePage } from './pages/AdminGovernancePage';
import { LegalAcceptanceModal } from './components/LegalAcceptanceModal';
import { ReportContentModal, ReportTarget } from './components/ReportContentModal';
import { hasAcceptedLatestLegal, CURRENT_TERMS_VERSION } from './data/legalDocuments';
import { LegalPolicyKey } from './types';
import { isAuthorizedAdminUser } from './lib/admin';

const LEGAL_VIEWS: LegalPolicyKey[] = [
  'legal',
  'terms',
  'privacy',
  'guidelines',
  'copyright',
  'food-safety',
  'cookies',
  'reporting',
  'contact',
];

function AppContent() {
  const { 
    currentUser, 
    userProfile,
    loading: authLoading,
    pendingToast, 
    activeWatchVideo, 
    setActiveWatchVideo, 
    setPendingAction,
    acceptLatestLegalTerms,
    declineUpdatedLegalTerms,
    signOut,
  } = useAuth();

  const [currentView, setCurrentView] = useState<string>('home');
  const [legalPromptDismissed, setLegalPromptDismissed] = useState<boolean>(false);
  const [legalUpdateModalOpen, setLegalUpdateModalOpen] = useState<boolean>(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [prefillCopyright, setPrefillCopyright] = useState<PrefillCopyrightTarget | null>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('dellychow_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [tabletDrawerOpen, setTabletDrawerOpen] = useState(false);

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTabletDrawerOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('dellychow_sidebar_collapsed', String(next));
        } catch {
          // ignore storage failure
        }
        return next;
      });
    }
  };
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedChefId, setSelectedChefId] = useState<string>('chef-david-chen');
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [exploreCategory, setExploreCategory] = useState<string>('all');
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | null>(null);

  // Firestore real-time data
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [videos, setVideos] = useState<CookingVideo[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);

  // Modals & Sharing
  const [activeVideoModal, setActiveVideoModal] = useState<CookingVideo | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareItem, setShareItem] = useState<ShareItem | null>(null);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [subModal, setSubModal] = useState<{ isOpen: boolean; chefId: string; chefName: string }>({
    isOpen: false,
    chefId: '',
    chefName: ''
  });
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    mode: 'login' | 'signup';
    role: UserRole;
  }>({
    isOpen: false,
    mode: 'login',
    role: 'user'
  });
  const [resetModal, setResetModal] = useState<{
    isOpen: boolean;
    initialCode: string | null;
  }>({
    isOpen: false,
    initialCode: null
  });
  const [videoCleanupOpen, setVideoCleanupOpen] = useState(false);
  const [shoppingModalOpen, setShoppingModalOpen] = useState(false);
  const [shoppingModalRecipes, setShoppingModalRecipes] = useState<Recipe[]>([]);
  const [shoppingTargetListId, setShoppingTargetListId] = useState<string | undefined>();

  const handleAddToShoppingList = (recipe: Recipe) => {
    if (!currentUser) {
      handleOpenAuthModal('login');
      return;
    }
    setShoppingModalRecipes([recipe]);
    setShoppingTargetListId(undefined);
    setShoppingModalOpen(true);
  };

  const handleCombineToShoppingList = (selectedRecipes: Recipe[]) => {
    if (!currentUser) {
      handleOpenAuthModal('login');
      return;
    }
    if (selectedRecipes.length === 0) return;
    setShoppingModalRecipes(selectedRecipes);
    setShoppingTargetListId(undefined);
    setShoppingModalOpen(true);
  };

  const handleShareVideo = (video: CookingVideo) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    setShareItem({
      title: `${video.title} | Chef ${video.authorName}`,
      text: video.description || `Watch this culinary masterclass on DellyChow!`,
      url: `${origin}/?video=${video.id}`,
      mediaType: 'video',
      thumbnailUrl: video.thumbnailUrl
    });
    setShareModalOpen(true);
  };

  // Check URL parameters for direct share links (?video=, ?v=, ?chef=, ?user=, ?recipe=, password reset)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        
        // 1. Password reset flow
        const mode = params.get('mode');
        const oobCode = params.get('oobCode');
        if (mode === 'resetPassword') {
          setResetModal({
            isOpen: true,
            initialCode: oobCode || null
          });
        }

        // 2. Direct Video permanent link (?video=<id> or ?v=<id>)
        const videoId = params.get('video') || params.get('v');
        if (videoId) {
          const found = videos.find(v => v.id === videoId);
          if (found) {
            setActiveVideoModal(found);
          } else {
            RecipeService.getVideo(videoId).then((v: CookingVideo | null) => {
              if (v) {
                if (v.videoUrl && v.videoUrl.startsWith('dellychow-video://')) {
                  const cleanId = v.videoUrl.replace('dellychow-video://', '').split('?')[0];
                  v.videoUrl = `/api/videos/stream/${cleanId}.mp4`;
                }
                setActiveVideoModal(v);
              }
            }).catch(() => {});
          }
        }

        // 3. Direct Chef Profile permanent link (?chef=<chefId>)
        const chefParam = params.get('chef');
        if (chefParam) {
          setSelectedChefId(chefParam);
          setCurrentView('chef-profile');
        }

        // 4. Direct Food Lover User Profile link (?user=<userId>)
        const userParam = params.get('user');
        if (userParam) {
          setSelectedUserId(userParam);
          setCurrentView('user-profile');
        }

        // 5. Direct Recipe permanent link (?recipe=<recipeId>)
        const recipeParam = params.get('recipe');
        if (recipeParam) {
          const rFound = recipes.find(r => r.id === recipeParam);
          if (rFound) {
            setSelectedRecipe(rFound);
            setCurrentView('recipe-detail');
          } else {
            RecipeService.getRecipe(recipeParam).then(r => {
              if (r) {
                setSelectedRecipe(r);
                setCurrentView('recipe-detail');
              }
            }).catch(() => {});
          }
        }
        // 6. Direct Legal Centre / Policy link (?legal=legal|terms|privacy|guidelines|copyright|food-safety|cookies|reporting|contact)
        const legalParam = params.get('legal') as LegalPolicyKey | null;
        if (legalParam && LEGAL_VIEWS.includes(legalParam)) {
          setCurrentView(legalParam);
        }
      }
    } catch (e) {
      console.warn("Could not parse query parameters:", e);
    }
  }, [videos, recipes]);

  // Non-disruptive prompt for existing signed-in users whose profile lacks current legal acceptance
  useEffect(() => {
    if (!authLoading && currentUser && userProfile) {
      if (!hasAcceptedLatestLegal(userProfile) && !legalPromptDismissed && !authModal.isOpen) {
        if (!LEGAL_VIEWS.includes(currentView as LegalPolicyKey)) {
          setLegalUpdateModalOpen(true);
        } else {
          setLegalUpdateModalOpen(false);
        }
      } else if (hasAcceptedLatestLegal(userProfile)) {
        setLegalUpdateModalOpen(false);
      }
    } else {
      setLegalUpdateModalOpen(false);
    }
  }, [authLoading, currentUser, userProfile, legalPromptDismissed, authModal.isOpen, currentView]);

  // Watch video auto-redirect after guest registers/logs in
  useEffect(() => {
    if (activeWatchVideo) {
      setActiveVideoModal(activeWatchVideo);
      setActiveWatchVideo(null);
    }
  }, [activeWatchVideo, setActiveWatchVideo]);

  // Real-time listener for recipes and videos
  useEffect(() => {
    const unsubRecipes = RecipeService.listenToRecipes(
      (loadedRecipes) => {
        setRecipes(loadedRecipes);
        setLoadingContent(false);
      },
      () => {
        setLoadingContent(false);
      }
    );

    const unsubVideos = RecipeService.listenToVideos((loadedVideos) => {
      // Normalize any legacy dellychow-video:// in memory so playback streams smoothly for all users
      const normalizedVideos = loadedVideos.map(v => {
        if (v.videoUrl && v.videoUrl.startsWith('dellychow-video://')) {
          const cleanId = v.videoUrl.replace('dellychow-video://', '').split('?')[0];
          return { ...v, videoUrl: `/api/videos/stream/${cleanId}.mp4` };
        }
        return v;
      });
      if (normalizedVideos.length > 0) {
        setVideos(normalizedVideos);
      } else {
        // Fallback to offline cached videos if network returned empty or user is offline
        getWatchedVideosOffline().then((cached) => {
          if (cached && cached.length > 0) {
            setVideos(cached);
          }
        });
      }

      // Only attempt to persist synced URL to Firestore if current user is author or admin
      if (currentUser) {
        const uid = currentUser.uid;
        const isAuthorized = (v: CookingVideo) =>
          v.authorId === uid || isAuthorizedAdminUser(currentUser);

        const videosToSync = loadedVideos.filter(v => 
          v.videoUrl && v.videoUrl.startsWith('dellychow-video://') && isAuthorized(v)
        );

        if (videosToSync.length > 0) {
          syncPublishedVideosToServer(videosToSync, async (videoId, newUrl) => {
            try {
              await RecipeService.updateVideo(videoId, { videoUrl: newUrl });
            } catch (err) {
              console.warn('Could not update video with synced server URL:', err);
            }
          });
        }
      }
    });

    return () => {
      unsubRecipes();
      unsubVideos();
    };
  }, [currentUser]);

  const handleNavigate = (view: string, params?: any) => {
    if (view === 'user-profile') {
      setSelectedUserId(params?.userId || undefined);
    }
    if (params?.category) {
      setExploreCategory(params.category);
    }
    if (params?.chefId) {
      setSelectedChefId(params.chefId);
    }
    if (params?.recipeId) {
      const found = recipes.find(r => r.id === params.recipeId);
      if (found) setSelectedRecipe(found);
    }
    if (params?.videoId) {
      const found = videos.find(v => v.id === params.videoId);
      if (found) {
        if (found.isPremium && !currentUser) {
          setPendingAction({ type: 'watch_video', video: found });
          handleOpenAuthModal('signup', 'user');
        } else {
          setActiveVideoModal(found);
        }
      }
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setCurrentView('recipe-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectChef = (chefId: string) => {
    setSelectedChefId(chefId);
    setCurrentView('chef-profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAuthModal = (mode: 'login' | 'signup' = 'login', role: UserRole = 'user') => {
    setAuthModal({
      isOpen: true,
      mode,
      role
    });
  };

  const handleLoginSuccess = (role: UserRole) => {
    if (role === 'chef') {
      setCurrentView('chef-dashboard');
    } else {
      setCurrentView('explore');
    }
  };

  const handleOpenSubscribe = (chefId: string, chefName: string) => {
    if (!currentUser) {
      handleOpenAuthModal('signup', 'user');
      return;
    }
    setSubModal({
      isOpen: true,
      chefId,
      chefName
    });
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setRecipeToEdit(recipe);
    setCurrentView('chef-create-recipe');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePublishStarterRecipes = async () => {
    const chefId = currentUser?.uid || 'chef-david-chen';
    const chefName = userProfile?.displayName || 'Chef David Chen';
    const chefPhoto = userProfile?.photoURL || ASSET_IMAGES.chefAvatar;

    try {
      setSeedNotice('Publishing starter recipes into Firestore...');
      const count = await RecipeService.seedStarterRecipes(chefId, chefName, chefPhoto);
      setSeedNotice(`Successfully published ${count} artisanal recipes & video masterclasses!`);
      setTimeout(() => setSeedNotice(null), 3000);
    } catch (err) {
      console.error(err);
      setSeedNotice('Published starter recipes!');
      setTimeout(() => setSeedNotice(null), 3000);
    }
  };

  // Only published recipes appear publicly to food lovers and guests
  const publicRecipes = recipes.filter(r => !r.status || r.status === 'published');

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-[#FAF7F2] text-stone-900 font-sans selection:bg-amber-500 selection:text-white">
      {/* Custom Brand Logo Reveal & Utensil-Joining Loading Screen */}
      <DeliChowSplashLoader isLoading={loadingContent} />

      {/* Top Navbar (YouTube-Style Mobile & Desktop Header) */}
      <Navbar 
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenAuthModal={handleOpenAuthModal}
        onOpenSupportModal={() => setSupportModalOpen(true)}
        onOpenSearch={() => setMobileSearchOpen(true)}
        onToggleSidebar={handleToggleSidebar}
        sidebarCollapsed={sidebarCollapsed}
        videos={videos}
        recipes={publicRecipes}
        onPlayVideo={(video) => {
          setActiveVideoModal(video);
          recordWatchedVideoOffline(video);
        }}
        onSelectRecipe={handleSelectRecipe}
        onSelectChef={handleSelectChef}
      />

      {/* Notification banner if starter content seeded */}
      {seedNotice && (
        <div className="bg-amber-600 text-white text-xs font-semibold py-2 px-4 text-center animate-in fade-in">
          {seedNotice}
        </div>
      )}

      {/* Non-blocking Terms Update Reminder Bar (when dismissed for later) */}
      {currentUser &&
        userProfile &&
        !hasAcceptedLatestLegal(userProfile) &&
        legalPromptDismissed &&
        !LEGAL_VIEWS.includes(currentView as LegalPolicyKey) && (
          <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800/70 px-4 py-2 text-xs text-stone-800 dark:text-stone-100 flex flex-wrap items-center justify-between gap-2">
            <span>
              DellyChow&apos;s Terms &amp; Conditions and Privacy Policy (v{CURRENT_TERMS_VERSION}) are ready for your review.
            </span>
            <button
              type="button"
              onClick={() => setLegalUpdateModalOpen(true)}
              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors cursor-pointer"
            >
              Review &amp; Accept
            </button>
          </div>
        )}

      {/* Action Toast when a pending guest action completes */}
      {pendingToast && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 bg-stone-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-stone-700 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{pendingToast}</span>
        </div>
      )}

      {/* Desktop/Tablet Collapsible Sidebar + Scrollable Content Shell */}
      <div className="flex flex-1 min-w-0">
        <DesktopSidebar
          currentView={currentView}
          collapsed={sidebarCollapsed}
          mobileDrawerOpen={tabletDrawerOpen}
          onCloseMobileDrawer={() => setTabletDrawerOpen(false)}
          onNavigate={handleNavigate}
          onOpenAuthModal={handleOpenAuthModal}
          onOpenSupportModal={() => setSupportModalOpen(true)}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Main View Router */}
          <main className="flex-1 pb-16 md:pb-8">
        {currentView === 'home' && (
          <HomePage
            recipes={publicRecipes}
            videos={videos}
            onSelectRecipe={handleSelectRecipe}
            onPlayVideo={(video) => {
              setActiveVideoModal(video);
              recordWatchedVideoOffline(video);
            }}
            onNavigate={handleNavigate}
            onRequestSubscribe={handleOpenSubscribe}
            onPublishStarterRecipes={handlePublishStarterRecipes}
            onOpenAuthModal={handleOpenAuthModal}
            onShareVideo={handleShareVideo}
            onSelectChef={handleSelectChef}
          />
        )}

        {currentView === 'explore' && (
          <ExplorePage
            recipes={publicRecipes}
            initialCategory={exploreCategory}
            onSelectRecipe={handleSelectRecipe}
            onSelectChef={handleSelectChef}
          />
        )}

        {currentView === 'recipe-detail' && selectedRecipe && (
          <RecipeDetailPage
            recipe={selectedRecipe}
            onBack={() => setCurrentView('explore')}
            onSelectChef={handleSelectChef}
            onRequestSubscribe={handleOpenSubscribe}
            onOpenAuthModal={handleOpenAuthModal}
            onAddToShoppingList={handleAddToShoppingList}
            onReportContent={(target) => setReportTarget(target)}
          />
        )}

        {currentView === 'videos' && (
          <VideosPage
            videos={videos}
            onPlayVideo={(video) => {
              setActiveVideoModal(video);
              recordWatchedVideoOffline(video);
            }}
            onRequestSubscribe={handleOpenSubscribe}
            onNavigate={handleNavigate}
            onOpenAuthModal={handleOpenAuthModal}
            onShareVideo={handleShareVideo}
          />
        )}

        {currentView === 'favourites' && (
          <FavouritesPage
            recipes={publicRecipes}
            videos={videos}
            onSelectRecipe={handleSelectRecipe}
            onSelectChef={handleSelectChef}
            onPlayVideo={(video) => setActiveVideoModal(video)}
            onRequestSubscribe={handleOpenSubscribe}
            onNavigate={handleNavigate}
            onOpenAuthModal={handleOpenAuthModal}
            onCreateShoppingList={handleCombineToShoppingList}
          />
        )}

        {currentView === 'shopping-lists' && (
          <ShoppingListsPage
            onNavigate={handleNavigate}
            onOpenAuthModal={handleOpenAuthModal}
            onSelectRecipe={handleSelectRecipe}
          />
        )}

        {currentView === 'challenges' && (
          <ChallengesPage
            onNavigate={handleNavigate}
            onOpenAuthModal={handleOpenAuthModal}
          />
        )}

        {currentView === 'chef-profile' && (
          <ChefProfilePage
            chefId={selectedChefId}
            recipes={publicRecipes}
            videos={videos}
            onSelectRecipe={handleSelectRecipe}
            onPlayVideo={(video) => setActiveVideoModal(video)}
            onRequestSubscribe={handleOpenSubscribe}
            onOpenAuthModal={handleOpenAuthModal}
            onReportContent={(target) => setReportTarget(target)}
          />
        )}

        {currentView === 'premium' && (
          <PremiumPage
            videos={videos}
            onPlayVideo={(video) => setActiveVideoModal(video)}
            onRequestSubscribe={handleOpenSubscribe}
            onSelectChef={handleSelectChef}
            onOpenAuthModal={handleOpenAuthModal}
          />
        )}

        {currentView === 'account' && (
          <AccountPage
            onNavigate={handleNavigate}
            onOpenAuthModal={handleOpenAuthModal}
          />
        )}

        {currentView === 'user-profile' && (
          <UserProfilePage
            recipes={publicRecipes}
            videos={videos}
            onSelectRecipe={handleSelectRecipe}
            onSelectChef={handleSelectChef}
            onNavigate={handleNavigate}
            onOpenAuthModal={handleOpenAuthModal}
            viewUserId={selectedUserId}
            onReportContent={(target) => setReportTarget(target)}
          />
        )}

        {/* Chef Portal Views */}
        {currentView === 'chef-dashboard' && (
          <ChefDashboard
            recipes={recipes}
            videos={videos}
            onNavigate={handleNavigate}
            onEditRecipe={handleEditRecipe}
            onPublishStarterRecipes={handlePublishStarterRecipes}
            onOpenVideoCleanup={() => setVideoCleanupOpen(true)}
          />
        )}

        {currentView === 'chef-create-recipe' && (
          <ChefCreateRecipe
            recipeToEdit={recipeToEdit}
            onBack={() => {
              setRecipeToEdit(null);
              setCurrentView('chef-dashboard');
            }}
            onSuccess={() => {
              setRecipeToEdit(null);
              setCurrentView('chef-dashboard');
            }}
          />
        )}

        {currentView === 'chef-upload-video' && (
          <ChefUploadVideo
            recipes={recipes}
            onBack={() => setCurrentView('chef-dashboard')}
            onSuccess={() => setCurrentView('chef-dashboard')}
          />
        )}

        {currentView === 'chef-my-recipes' && (
          <ChefMyRecipes
            recipes={recipes}
            onBack={() => setCurrentView('chef-dashboard')}
            onNavigate={handleNavigate}
            onEditRecipe={handleEditRecipe}
            onSelectRecipe={handleSelectRecipe}
          />
        )}

        {currentView === 'chef-community' && (
          <ChefCommunity
            onBack={() => setCurrentView('chef-dashboard')}
          />
        )}

        {LEGAL_VIEWS.includes(currentView as LegalPolicyKey) && (
          <TermsAndConditionsPage
            initialTab={currentView as LegalPolicyKey}
            prefillCopyrightTarget={prefillCopyright}
            onBack={() => setCurrentView('home')}
            onNavigate={handleNavigate}
            onOpenSupportModal={() => setSupportModalOpen(true)}
            onOpenAuthModal={handleOpenAuthModal}
            onAcceptTerms={async (source) => {
              await acceptLatestLegalTerms(source);
            }}
          />
        )}

        {currentView === 'admin-governance' && (
          <AdminGovernancePage
            onBack={() => setCurrentView('account')}
            onNavigate={handleNavigate}
          />
        )}
          </main>

          {/* Footer (Hidden on mobile to avoid double navigation, visible on md: screens) */}
          <div className="hidden md:block">
            <Footer 
              onNavigate={handleNavigate} 
              onOpenSupportModal={() => setSupportModalOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar (YouTube Style) */}
      <MobileBottomNav
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenAuthModal={handleOpenAuthModal}
      />

      {/* Mobile YouTube-Style Search Overlay */}
      <MobileSearchOverlay
        isOpen={mobileSearchOpen}
        onClose={() => setMobileSearchOpen(false)}
        videos={videos}
        recipes={publicRecipes}
        onPlayVideo={(video) => {
          setActiveVideoModal(video);
          recordWatchedVideoOffline(video);
        }}
        onSelectRecipe={handleSelectRecipe}
        onSelectChef={handleSelectChef}
      />

      {/* Offline Connectivity & Cache Indicator */}
      <OfflineIndicator onViewCachedVideos={() => setCurrentView('videos')} />

      {/* Global Modals */}
      {activeVideoModal && (
        <VideoPlayerModal
          video={activeVideoModal}
          onClose={() => setActiveVideoModal(null)}
          onViewRecipe={(recipeId) => handleNavigate('recipe-detail', { recipeId })}
          onSelectChef={handleSelectChef}
          onRequestSubscribe={handleOpenSubscribe}
          onOpenAuthModal={handleOpenAuthModal}
          onNavigateToShopping={() => {
            setActiveVideoModal(null);
            setCurrentView('shopping-lists');
          }}
          recipes={publicRecipes}
          videos={videos}
          onSelectVideo={(video) => setActiveVideoModal(video)}
          onReportContent={(target) => setReportTarget(target)}
        />
      )}

      <SubscriptionModal
        isOpen={subModal.isOpen}
        onClose={() => setSubModal(prev => ({ ...prev, isOpen: false }))}
        chefId={subModal.chefId}
        chefName={subModal.chefName}
      />

      <AuthModal
        isOpen={authModal.isOpen}
        initialMode={authModal.mode}
        initialRole={authModal.role}
        onClose={() => setAuthModal(prev => ({ ...prev, isOpen: false }))}
        onLoginSuccess={handleLoginSuccess}
        onOpenForgotPassword={() => setResetModal({ isOpen: true, initialCode: null })}
        onOpenFullLegal={(tab) => handleNavigate(tab)}
      />

      <ResetPasswordModal
        isOpen={resetModal.isOpen}
        initialCode={resetModal.initialCode}
        onClose={() => setResetModal({ isOpen: false, initialCode: null })}
        onBackToLogin={() => {
          setResetModal({ isOpen: false, initialCode: null });
          handleOpenAuthModal('login', 'user');
        }}
      />

      <VideoCleanupModal
        isOpen={videoCleanupOpen}
        onClose={() => setVideoCleanupOpen(false)}
        videos={videos}
        onCleanupComplete={() => {
          // videos collection updates in real-time
        }}
      />

      <SupportFAQModal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
      />

      <AddIngredientsModal
        isOpen={shoppingModalOpen}
        onClose={() => setShoppingModalOpen(false)}
        recipes={shoppingModalRecipes}
        targetListId={shoppingTargetListId}
        onSuccess={(listId) => {
          setCurrentView('shopping-lists');
        }}
      />

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        item={shareItem}
      />

      <LegalAcceptanceModal
        isOpen={legalUpdateModalOpen}
        mode="update_prompt"
        initialTab="terms"
        onClose={() => {
          setLegalUpdateModalOpen(false);
          setLegalPromptDismissed(true);
        }}
        onOpenFullPage={(tab) => {
          setLegalUpdateModalOpen(false);
          setLegalPromptDismissed(true);
          handleNavigate(tab);
        }}
        onAcceptLatest={async () => {
          await acceptLatestLegalTerms('update_prompt', 'existing_user_update');
          setLegalUpdateModalOpen(false);
        }}
        onDeclineLatest={async () => {
          await declineUpdatedLegalTerms();
          setLegalUpdateModalOpen(false);
          setLegalPromptDismissed(true);
        }}
        onSignOutDeclined={async () => {
          setLegalUpdateModalOpen(false);
          await signOut();
        }}
        onOpenAccountPrivacy={() => {
          setLegalUpdateModalOpen(false);
          setLegalPromptDismissed(true);
          handleNavigate('account');
        }}
      />

      <ReportContentModal
        isOpen={reportTarget !== null}
        target={reportTarget}
        onClose={() => setReportTarget(null)}
        onOpenAuthModal={handleOpenAuthModal}
        onOpenCopyrightClaim={(target) => {
          setPrefillCopyright({
            targetType:
              target.targetType === 'chef_profile'
                ? 'chef_profile'
                : target.targetType === 'user_profile'
                ? 'user_profile'
                : target.targetType === 'recipe'
                ? 'recipe'
                : 'video',
            targetId: target.targetId,
            targetTitle: target.targetTitle,
            targetAuthorId: target.targetAuthorId,
            reportedUrl: typeof window !== 'undefined' ? window.location.origin : '',
          });
          setReportTarget(null);
          handleNavigate('copyright');
        }}
        onViewMyReports={() => {
          setReportTarget(null);
          handleNavigate('reporting');
        }}
      />

    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
