import React from 'react';
import { 
  Search, 
  Sparkles, 
  ChefHat, 
  ArrowRight, 
  Video, 
  Crown, 
  UtensilsCrossed,
  HeartHandshake,
  Flame,
  Award
} from 'lucide-react';
import { Recipe, CookingVideo, UserProfile } from '../types';
import { RecipeCard } from '../components/RecipeCard';
import { VideoCard } from '../components/VideoCard';
import { ASSET_IMAGES } from '../assets/images';
import { useAuth } from '../context/AuthContext';

interface HomePageProps {
  recipes: Recipe[];
  videos: CookingVideo[];
  onSelectRecipe: (recipe: Recipe) => void;
  onPlayVideo: (video: CookingVideo) => void;
  onNavigate: (view: string, params?: any) => void;
  onRequestSubscribe: (chefId: string, chefName: string) => void;
  onPublishStarterRecipes?: () => void;
  onOpenAuthModal?: (mode?: 'login' | 'signup') => void;
  onShareVideo?: (video: CookingVideo) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  recipes,
  videos,
  onSelectRecipe,
  onPlayVideo,
  onNavigate,
  onRequestSubscribe,
  onPublishStarterRecipes,
  onOpenAuthModal,
  onShareVideo
}) => {
  const { currentUser, userProfile, setPendingAction } = useAuth();
  const isChef = userProfile?.role === 'chef';

  const categories = [
    { id: 'all', label: 'All Recipes' },
    { id: 'breakfast', label: 'Breakfast' },
    { id: 'lunch', label: 'Lunch' },
    { id: 'dinner', label: 'Dinner' },
    { id: 'desserts', label: 'Desserts' },
    { id: 'snacks', label: 'Snacks' },
  ];

  const featuredRecipes = recipes.slice(0, 6);
  const featuredVideos = videos.slice(0, 3);

  return (
    <div className="space-y-16 md:space-y-24 pb-16">
      
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-stone-900 text-white rounded-2xl sm:rounded-3xl mx-3 sm:mx-6 lg:mx-8 mt-3 sm:mt-4 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-0 lg:min-h-[540px] items-stretch">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 p-5 sm:p-10 lg:p-16 flex flex-col justify-between z-10 order-2 lg:order-1">
            <div className="space-y-4 sm:space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xs text-amber-300 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Global Culinary Collective</span>
              </div>

              <h1 className="font-serif-display text-2xl sm:text-4xl lg:text-6xl font-bold tracking-tight text-white leading-tight text-balance">
                Where World Chefs & Food Lovers Share The Table.
              </h1>

              <p className="text-stone-300 text-xs sm:text-base max-w-xl leading-relaxed">
                Discover artisan recipes tested to perfection, stream authentic cooking video tutorials, and join private chef circles with direct culinary mentorship.
              </p>
            </div>

            {/* Hero Actions & Quick Search */}
            <div className="pt-6 sm:pt-8 space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('explore')}
                  className="px-5 py-3 sm:px-6 sm:py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 group"
                >
                  <span>Explore All Recipes</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('videos')}
                  className="px-5 py-3 sm:px-6 sm:py-3.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl text-xs sm:text-sm transition-colors backdrop-blur-xs flex items-center justify-center gap-2"
                >
                  <Video className="w-4 h-4 text-amber-400" />
                  <span>Cooking Videos</span>
                </button>

                {isChef && (
                  <button
                    type="button"
                    onClick={() => onNavigate('chef-create-recipe')}
                    className="px-5 py-3 sm:py-3.5 border border-amber-500/50 hover:bg-amber-500/20 text-amber-300 font-semibold rounded-xl text-xs sm:text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <ChefHat className="w-4 h-4" />
                    <span>Publish New Recipe</span>
                  </button>
                )}
              </div>

              {/* Trust Metric Strip */}
              <div className="pt-5 border-t border-white/10 grid grid-cols-3 gap-2 text-center sm:text-left sm:flex sm:items-center sm:gap-8 text-xs text-stone-400">
                <div>
                  <p className="font-serif-display text-base sm:text-xl font-bold text-white tabular-nums">100%</p>
                  <p className="text-[11px] sm:text-xs">Chef-Tested</p>
                </div>
                <div className="hidden sm:block h-6 w-px bg-white/10" />
                <div>
                  <p className="font-serif-display text-base sm:text-xl font-bold text-white tabular-nums">4K HD</p>
                  <p className="text-[11px] sm:text-xs">Tutorials</p>
                </div>
                <div className="hidden sm:block h-6 w-px bg-white/10" />
                <div>
                  <p className="font-serif-display text-base sm:text-xl font-bold text-white tabular-nums">VIP</p>
                  <p className="text-[11px] sm:text-xs">Kitchens</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Image Column - Positioned prominently on mobile and desktop */}
          <div className="lg:col-span-5 relative w-full h-64 sm:h-80 lg:h-full lg:min-h-[540px] order-1 lg:order-2 overflow-hidden">
            <img
              src={ASSET_IMAGES.heroCooking}
              alt="DellyChow Artisanal Culinary Cooking"
              loading="eager"
              decoding="async"
              className="w-full h-full object-cover block lg:rounded-r-3xl"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/20 to-transparent lg:bg-gradient-to-r lg:from-stone-900 lg:via-transparent lg:to-transparent pointer-events-none" />
            
            {/* Overlay Tag */}
            <div className="absolute bottom-3 left-3 right-3 sm:bottom-6 sm:left-6 sm:right-6 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-stone-900/85 backdrop-blur-md border border-white/10 text-white flex items-center gap-3 shadow-lg">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-600/30 text-amber-400 flex items-center justify-center shrink-0">
                <Award className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="text-xs">
                <p className="font-bold">Featured Technique</p>
                <p className="text-stone-300 line-clamp-1 sm:line-clamp-none">Fresh tagliatelle & black truffle emulsion plating</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Category Filter Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Curated Meal Categories
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Select a culinary course to filter mouth-watering recipes
            </p>
          </div>

          <button
            onClick={() => onNavigate('explore')}
            className="text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors flex items-center gap-1"
          >
            <span>All Categories</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onNavigate('explore', { category: cat.id })}
              className="p-4 rounded-2xl bg-white border border-stone-200/80 hover:border-amber-500/50 hover:bg-amber-50/30 transition-all text-center group shadow-2xs"
            >
              <span className="font-serif-display text-sm font-bold text-stone-800 group-hover:text-amber-800 transition-colors block">
                {cat.label}
              </span>
              <span className="text-[10px] text-stone-400 uppercase tracking-wider mt-1 block">
                Explore Course
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Featured Recipes Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold uppercase tracking-wider mb-1">
              <Flame className="w-3.5 h-3.5" />
              <span>Trending In The Kitchen</span>
            </div>
            <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Published Chef Recipes
            </h2>
          </div>

          <button
            onClick={() => onNavigate('explore')}
            className="text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors flex items-center gap-1"
          >
            <span>View Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recipes.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white border border-stone-200/80 text-center space-y-4 max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <UtensilsCrossed className="w-8 h-8" />
            </div>
            <h3 className="font-serif-display text-xl font-bold text-stone-900">
              No Recipes Have Been Published Yet
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
              Our chefs are preparing fresh recipes in their kitchens. Please explore again soon, or publish your own culinary creations!
            </p>
            {onPublishStarterRecipes && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onPublishStarterRecipes}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm"
                >
                  Publish Chef David Chen&apos;s Starter Recipes
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {featuredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onSelect={onSelectRecipe}
                onSelectChef={(chefId) => onNavigate('chef-profile', { chefId })}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. Cooking Videos & Masterclasses Section */}
      <section className="bg-stone-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold uppercase tracking-wider mb-1">
                <Video className="w-3.5 h-3.5" />
                <span>Culinary Video Guides</span>
              </div>
              <h2 className="font-serif-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Step-by-Step Cooking Videos
              </h2>
              <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-lg">
                Watch chefs demonstrate knife skills, searing temperatures, and sauce emulsions in real time.
              </p>
            </div>

            <button
              onClick={() => onNavigate('videos')}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 self-start md:self-auto"
            >
              <span>View All Videos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {videos.length === 0 ? (
            <p className="text-xs text-stone-400 text-center py-8">
              No cooking videos posted yet. New video tutorials are arriving soon.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onPlay={(v) => {
                    if (v.isPremium && !currentUser) {
                      setPendingAction({ type: 'watch_video', video: v });
                      if (onOpenAuthModal) onOpenAuthModal('signup');
                      return;
                    }
                    onPlayVideo(v);
                  }}
                  onShare={onShareVideo}
                  onRequestSubscribe={onRequestSubscribe}
                  isGuestRestricted={video.isPremium && !currentUser}
                  onOpenAuthModal={() => {
                    setPendingAction({ type: 'watch_video', video });
                    if (onOpenAuthModal) onOpenAuthModal('signup');
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. VIP Communities Spotlight Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-700 via-amber-800 to-stone-900 text-white p-6 sm:p-12 lg:p-16 overflow-hidden shadow-lg">
          <div className="relative z-10 max-w-2xl space-y-4 sm:space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-200 text-xs font-semibold uppercase tracking-wider">
              <Crown className="w-3.5 h-3.5" />
              <span>DellyChow VIP Cooking Communities</span>
            </div>

            <h2 className="font-serif-display text-2xl sm:text-4xl font-bold tracking-tight leading-tight">
              Cook Side-by-Side With Renowned Master Chefs.
            </h2>

            <p className="text-stone-200 text-xs sm:text-sm leading-relaxed">
              Join private chef circles to participate in private group chats, receive answers to your culinary troubleshooting, and unlock exclusive masterclass tutorials.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('premium')}
                className="px-5 py-3 sm:px-6 sm:py-3.5 bg-white text-stone-900 hover:bg-stone-100 font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-sm text-center"
              >
                Discover VIP Kitchens
              </button>
              <button
                type="button"
                onClick={() => onNavigate('account')}
                className="px-5 py-3 sm:px-6 sm:py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors text-center"
              >
                Offer VIP Memberships as a Chef
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
