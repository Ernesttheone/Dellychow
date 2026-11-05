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

function AppContent() {
  const { 
    currentUser, 
    userProfile, 
    pendingToast, 
    activeWatchVideo, 
    setActiveWatchVideo, 
    setPendingAction 
  } = useAuth();

  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedChefId, setSelectedChefId] = useState<string>('chef-david-chen');
  const [exploreCategory, setExploreCategory] = useState<string>('all');
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | null>(null);

  // Modals
  const [activeVideoModal, setActiveVideoModal] = useState<CookingVideo | null>(null);
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

  // Check URL parameters for password reset links (e.g. ?mode=resetPassword&oobCode=XYZ)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');
        const oobCode = params.get('oobCode');
        if (mode === 'resetPassword') {
          setResetModal({
            isOpen: true,
            initialCode: oobCode || null
          });
        }
      }
    } catch (e) {
      console.warn("Could not parse reset password query parameters:", e);
    }
  }, []);

  // Watch video auto-redirect after guest registers/logs in
  useEffect(() => {
    if (activeWatchVideo) {
      setActiveVideoModal(activeWatchVideo);
      setActiveWatchVideo(null);
    }
  }, [activeWatchVideo, setActiveWatchVideo]);

  // Firestore real-time data
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [videos, setVideos] = useState<CookingVideo[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);

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
      setVideos(loadedVideos);
      syncPublishedVideosToServer(loadedVideos, async (videoId, newUrl) => {
        try {
          await RecipeService.updateVideo(videoId, { videoUrl: newUrl });
        } catch (err) {
          console.warn('Could not update video with synced server URL:', err);
        }
      });
    });

    return () => {
      unsubRecipes();
      unsubVideos();
    };
  }, []);

  const handleNavigate = (view: string, params?: any) => {
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
        if (!currentUser) {
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
      
      {/* Top Navbar */}
      <Navbar 
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenAuthModal={handleOpenAuthModal}
        onOpenSupportModal={() => setSupportModalOpen(true)}
      />

      {/* Notification banner if starter content seeded */}
      {seedNotice && (
        <div className="bg-amber-600 text-white text-xs font-semibold py-2 px-4 text-center animate-in fade-in">
          {seedNotice}
        </div>
      )}

      {/* Action Toast when a pending guest action completes */}
      {pendingToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-stone-700 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{pendingToast}</span>
        </div>
      )}

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'home' && (
          <HomePage
            recipes={publicRecipes}
            videos={videos}
            onSelectRecipe={handleSelectRecipe}
            onPlayVideo={(video) => setActiveVideoModal(video)}
            onNavigate={handleNavigate}
            onRequestSubscribe={handleOpenSubscribe}
            onPublishStarterRecipes={handlePublishStarterRecipes}
            onOpenAuthModal={handleOpenAuthModal}
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
          />
        )}

        {currentView === 'videos' && (
          <VideosPage
            videos={videos}
            onPlayVideo={(video) => setActiveVideoModal(video)}
            onRequestSubscribe={handleOpenSubscribe}
            onNavigate={handleNavigate}
            onOpenAuthModal={handleOpenAuthModal}
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
      </main>

      {/* Footer */}
      <Footer 
        onNavigate={handleNavigate} 
        onOpenSupportModal={() => setSupportModalOpen(true)}
      />

      {/* Global Modals */}
      <VideoPlayerModal
        video={activeVideoModal}
        onClose={() => setActiveVideoModal(null)}
        onViewRecipe={(recipeId) => handleNavigate('recipe-detail', { recipeId })}
        onSelectChef={handleSelectChef}
        onOpenAuthModal={handleOpenAuthModal}
      />

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

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
