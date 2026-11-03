import React, { useState } from 'react';
import { Bookmark, ArrowRight, UtensilsCrossed, LogIn, Video, Clock } from 'lucide-react';
import { Recipe, CookingVideo } from '../types';
import { RecipeCard } from '../components/RecipeCard';
import { VideoCard } from '../components/VideoCard';
import { useAuth } from '../context/AuthContext';

interface FavouritesPageProps {
  recipes: Recipe[];
  videos?: CookingVideo[];
  onSelectRecipe: (recipe: Recipe) => void;
  onSelectChef: (chefId: string) => void;
  onPlayVideo?: (video: CookingVideo) => void;
  onRequestSubscribe?: (chefId: string, chefName: string) => void;
  onNavigate: (view: string) => void;
  onOpenAuthModal: (mode?: 'login' | 'signup') => void;
}

export const FavouritesPage: React.FC<FavouritesPageProps> = ({
  recipes,
  videos = [],
  onSelectRecipe,
  onSelectChef,
  onPlayVideo,
  onRequestSubscribe,
  onNavigate,
  onOpenAuthModal
}) => {
  const { currentUser, favourites, videoFavourites } = useAuth();
  const [activeTab, setActiveTab] = useState<'recipes' | 'videos'>('recipes');
  const [selectedCategory, setSelectedCategory] = useState('all');

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <Bookmark className="w-8 h-8" />
        </div>
        <h2 className="font-serif-display text-2xl font-bold text-stone-900">
          Access Your Favourites
        </h2>
        <p className="text-xs text-stone-500 leading-relaxed">
          Bookmarking allows food lovers and chefs to save and organize recipes and tutorial videos across all devices. Log in or create an account to start saving meals.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onOpenAuthModal('login')}
            className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Log In</span>
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

  // Get full recipe objects that match user's favourites
  const favRecipeIds = new Set(favourites.map(f => f.recipeId));
  const bookmarkedRecipes = recipes.filter(r => favRecipeIds.has(r.id));

  const filteredBookmarked = bookmarkedRecipes.filter(r => {
    if (selectedCategory === 'all') return true;
    return r.category === selectedCategory;
  });

  // Get full video objects or fallback from videoFavourites records
  const favVideoIds = new Set(videoFavourites.map(v => v.videoId));
  const bookmarkedVideos: CookingVideo[] = videoFavourites.map(vf => {
    const full = videos.find(v => v.id === vf.videoId);
    if (full) return full;
    return {
      id: vf.videoId,
      authorId: 'chef-david-chen',
      authorName: vf.authorName,
      authorPhoto: vf.authorPhoto,
      title: vf.videoTitle,
      description: 'Bookmarked culinary technique tutorial.',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: vf.thumbnailUrl,
      durationMinutes: vf.durationMinutes,
      category: vf.category,
      isPremium: vf.isPremium,
      viewCount: 1000,
      createdAt: vf.addedAt
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-amber-700 font-semibold uppercase tracking-wider mb-1">
          <Bookmark className="w-4 h-4" />
          <span>Personal Recipe Box</span>
        </div>
        <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
          Your Saved Favourites
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Manage your saved artisanal recipes and bookmarked cooking tutorial videos.
        </p>
      </div>

      {/* Primary Tab Switcher */}
      <div className="flex items-center gap-3 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('recipes')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'recipes'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Saved Recipes ({bookmarkedRecipes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('videos')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'videos'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Bookmarked Videos ({bookmarkedVideos.length})</span>
        </button>
      </div>

      {/* Recipes Tab Content */}
      {activeTab === 'recipes' && (
        <div className="space-y-6">
          {/* Categories Bar */}
          {bookmarkedRecipes.length > 0 && (
            <div className="flex items-center gap-2 pb-2 overflow-x-auto">
              {['all', 'breakfast', 'lunch', 'dinner', 'desserts', 'snacks'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {bookmarkedRecipes.length === 0 ? (
            <div className="p-16 rounded-3xl bg-white border border-stone-200/80 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <UtensilsCrossed className="w-8 h-8" />
              </div>
              <h3 className="font-serif-display text-xl font-bold text-stone-900">
                No Saved Recipes Yet
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                As you explore meals, tap the bookmark ribbon icon on any recipe to save it here for effortless access in your kitchen.
              </p>
              <button
                onClick={() => onNavigate('explore')}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
              >
                <span>Explore Recipes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : filteredBookmarked.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white border border-stone-200/80 text-center space-y-2 max-w-md mx-auto">
              <p className="text-xs font-semibold text-stone-700">No favourites in this category</p>
              <button
                onClick={() => setSelectedCategory('all')}
                className="text-xs text-amber-700 hover:underline"
              >
                Show all saved recipes
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {filteredBookmarked.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onSelect={onSelectRecipe}
                  onSelectChef={onSelectChef}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Videos Tab Content */}
      {activeTab === 'videos' && (
        <div className="space-y-6">
          {bookmarkedVideos.length === 0 ? (
            <div className="p-16 rounded-3xl bg-white border border-stone-200/80 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Video className="w-8 h-8" />
              </div>
              <h3 className="font-serif-display text-xl font-bold text-stone-900">
                No Bookmarked Videos Yet
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Save cooking tutorials and masterclasses while watching to revisit knife techniques, baking steps, and pan searing advice anytime.
              </p>
              <button
                onClick={() => onNavigate('videos')}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
              >
                <span>Browse Cooking Videos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {bookmarkedVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onPlay={(v) => onPlayVideo && onPlayVideo(v)}
                  onRequestSubscribe={onRequestSubscribe}
                />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
