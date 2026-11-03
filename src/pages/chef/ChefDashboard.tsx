import React from 'react';
import { 
  ChefHat, 
  UtensilsCrossed, 
  Video, 
  Users, 
  Star, 
  Plus, 
  Settings, 
  MessageSquare, 
  Trash2, 
  Edit3, 
  Crown,
  Eye,
  ArrowRight
} from 'lucide-react';
import { Recipe, CookingVideo } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { RecipeService } from '../../services/recipeService';
import { UserAvatar } from '../../components/UserAvatar';

interface ChefDashboardProps {
  recipes: Recipe[];
  videos: CookingVideo[];
  onNavigate: (view: string, params?: any) => void;
  onEditRecipe: (recipe: Recipe) => void;
  onPublishStarterRecipes?: () => void;
  onOpenVideoCleanup?: () => void;
}

export const ChefDashboard: React.FC<ChefDashboardProps> = ({
  recipes,
  videos,
  onNavigate,
  onEditRecipe,
  onPublishStarterRecipes,
  onOpenVideoCleanup
}) => {
  const { currentUser, userProfile } = useAuth();

  const chefRecipes = recipes.filter(r => r.authorId === currentUser?.uid);
  const chefVideos = videos.filter(v => v.authorId === currentUser?.uid);

  // Analytics
  const totalViews = chefVideos.reduce((acc, v) => acc + (v.viewCount || 0), 0);
  const avgRating = chefRecipes.length > 0
    ? (chefRecipes.reduce((acc, r) => acc + (r.ratingAverage || 5.0), 0) / chefRecipes.length).toFixed(1)
    : '5.0';

  const handleDeleteRecipe = async (recipeId: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await RecipeService.deleteRecipe(recipeId);
      } catch (err) {
        console.error("Error deleting recipe:", err);
      }
    }
  };

  const handleDeleteVideo = async (videoId: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await RecipeService.deleteVideo(videoId);
      } catch (err) {
        console.error("Error deleting video:", err);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-stone-200">
        <div className="flex items-center gap-4">
          <UserAvatar
            src={userProfile?.photoURL}
            seed={currentUser?.uid}
            name={userProfile?.displayName}
            size="xl"
            className="ring-4 ring-amber-500/20"
          />
          <div>
            <div className="flex items-center gap-2 text-xs text-amber-700 font-semibold uppercase tracking-wider mb-0.5">
              <ChefHat className="w-4 h-4" />
              <span>Chef Studio Control Room</span>
            </div>
            <h1 className="font-serif-display text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Chef {userProfile?.displayName || 'Studio'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              {userProfile?.specialty || 'Artisanal Culinary Arts'} · Manage your recipes, videos, and VIP kitchen circles.
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('chef-create-recipe')}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Recipe</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('chef-upload-video')}
            className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Video className="w-4 h-4 text-amber-400" />
            <span>Upload Video</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('chef-community')}
            className="px-4 py-2.5 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5"
          >
            <MessageSquare className="w-4 h-4 text-amber-600" />
            <span>VIP Chat Room</span>
          </button>

          {onOpenVideoCleanup && (
            <button
              type="button"
              onClick={onOpenVideoCleanup}
              className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Administrator Video Cleanup Tool"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>Video Cleanup</span>
            </button>
          )}
        </div>
      </div>

      {/* Analytics KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">My Recipes</span>
            <UtensilsCrossed className="w-4 h-4 text-amber-600" />
          </div>
          <p className="font-serif-display text-3xl font-bold text-stone-900 tabular-nums">
            {chefRecipes.length}
          </p>
          <span className="text-[11px] text-stone-400">Published to DellyChow</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Video Tutorials</span>
            <Video className="w-4 h-4 text-amber-600" />
          </div>
          <p className="font-serif-display text-3xl font-bold text-stone-900 tabular-nums">
            {chefVideos.length}
          </p>
          <span className="text-[11px] text-stone-400">{(totalViews).toLocaleString()} total video views</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">VIP Subscribers</span>
            <Crown className="w-4 h-4 text-amber-600" />
          </div>
          <p className="font-serif-display text-3xl font-bold text-stone-900 tabular-nums">
            {userProfile?.subscriberCount || 0}
          </p>
          <span className="text-[11px] text-stone-400">Paying member tier</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Rating</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <p className="font-serif-display text-3xl font-bold text-stone-900 tabular-nums">
            {avgRating} <span className="text-xs text-stone-400 font-normal">/ 5.0</span>
          </p>
          <span className="text-[11px] text-stone-400">Food lover reviews</span>
        </div>
      </div>

      {/* Manage Recipes Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif-display text-xl sm:text-2xl font-bold text-stone-900">
            My Published Recipes ({chefRecipes.length})
          </h2>

          <div className="flex items-center gap-2">
            {chefRecipes.length === 0 && onPublishStarterRecipes && (
              <button
                type="button"
                onClick={onPublishStarterRecipes}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors"
              >
                + Publish Starter Chef Recipes
              </button>
            )}
            <button
              onClick={() => onNavigate('chef-my-recipes')}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors flex items-center gap-1"
            >
              <span>Manage All Recipes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {chefRecipes.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white border border-stone-200/80 text-center space-y-3">
            <p className="font-serif-display text-base font-bold text-stone-800">You haven&apos;t published any recipes yet.</p>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Share your favorite meals with ingredients and preparation steps to inspire food lovers worldwide.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('chef-create-recipe')}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
            >
              Add Recipe
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-stone-200/80 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Recipe</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Cook Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {chefRecipes.slice(0, 8).map((r) => (
                    <tr key={r.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-stone-900 flex items-center gap-3">
                        <img
                          src={r.imageUrl}
                          alt={r.title}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <span className="truncate max-w-[200px]">{r.title}</span>
                      </td>
                      <td className="py-3 px-4 text-stone-600 capitalize">{r.category}</td>
                      <td className="py-3 px-4 text-stone-600 tabular-nums">{r.cookTimeMinutes} mins</td>
                      <td className="py-3 px-4">
                        {r.status === 'draft' ? (
                          <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Draft (Private)
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Published
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEditRecipe(r)}
                            className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100"
                            title="Edit Recipe"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecipe(r.id, r.title)}
                            className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50"
                            title="Delete Recipe"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Manage Videos Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif-display text-xl sm:text-2xl font-bold text-stone-900">
            My Cooking Videos ({chefVideos.length})
          </h2>
          <button
            onClick={() => onNavigate('chef-upload-video')}
            className="text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload New Tutorial</span>
          </button>
        </div>

        {chefVideos.length === 0 ? (
          <div className="p-10 rounded-3xl bg-white border border-stone-200/80 text-center space-y-2">
            <p className="text-xs text-stone-500">No cooking videos uploaded yet.</p>
            <button
              onClick={() => onNavigate('chef-upload-video')}
              className="text-xs font-semibold text-amber-700 hover:underline"
            >
              Post your first step-by-step video guide
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {chefVideos.map((video) => (
              <div key={video.id} className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-3">
                <div className="relative aspect-16/9 rounded-xl overflow-hidden bg-stone-900">
                  <img
                    src={video.thumbnailUrl || video.videoUrl}
                    alt={video.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-stone-900/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                    {video.durationMinutes}m
                  </div>
                  {video.isPremium && (
                    <div className="absolute top-2 right-2 bg-amber-600 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                      VIP
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-stone-900 truncate">{video.title}</h4>
                  <p className="text-[11px] text-stone-500 line-clamp-1">{video.description}</p>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
                  <span>{(video.viewCount || 0).toLocaleString()} views</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteVideo(video.id, video.title)}
                    className="text-red-500 hover:text-red-700 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
