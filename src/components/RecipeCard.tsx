import React, { useState } from 'react';
import { Bookmark, Clock, Star, PlayCircle, Lock, Heart, Share2 } from 'lucide-react';
import { Recipe, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';
import { formatRecipeTotalTime } from '../lib/recipeTime';

interface RecipeCardProps {
  recipe: Recipe;
  onSelect: (recipe: Recipe) => void;
  onSelectChef?: (chefId: string) => void;
  creatorProfile?: UserProfile;
  onOpenAuthModal?: () => void;
  onShare?: (recipe: Recipe) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onSelect,
  onSelectChef,
  creatorProfile,
  onOpenAuthModal,
  onShare
}) => {
  const {
    currentUser,
    isRecipeBookmarked,
    toggleBookmark,
    isRecipeLiked,
    toggleLikeRecipe,
    setPendingAction,
  } = useAuth();
  const [imageError, setImageError] = useState(false);

  const bookmarked = isRecipeBookmarked(recipe.id);
  const liked = isRecipeLiked(recipe.id);
  const hasCoverImage = Boolean(recipe.imageUrl && recipe.imageUrl.trim().length > 0) && !imageError;
  const totalTimeLabel = formatRecipeTotalTime(recipe);
  const authorName = creatorProfile?.displayName || recipe.authorName;
  const authorPhoto = creatorProfile?.photoURL || recipe.authorPhoto;
  const followerCount = creatorProfile?.followerCount ?? 0;

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      setPendingAction({
        type: 'like_recipe',
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        authorId: recipe.authorId
      });
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    try {
      await toggleLikeRecipe(recipe);
    } catch {
      // ignore
    }
  };

  return (
    <div 
      className="group bg-white dark:bg-[#1a1715] rounded-2xl border border-stone-200/80 dark:border-stone-800 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer"
      onClick={() => onSelect(recipe)}
    >
      {/* Dynamic Cover Image: Completely omitted from DOM when no image was uploaded */}
      {hasCoverImage && (
        <div className="relative aspect-4/3 bg-stone-100 dark:bg-stone-900 overflow-hidden">
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
          />

          {/* Video Icon Indicator if video attached */}
          {recipe.videoUrl && (
            <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-xs text-white p-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm">
              <PlayCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-medium">Video</span>
            </div>
          )}

          {/* Premium Lock Badge */}
          {recipe.isPremium && (
            <div className="absolute top-3 right-12 bg-amber-600/90 backdrop-blur-xs text-white px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Lock className="w-3 h-3" />
              <span>VIP Master</span>
            </div>
          )}

          {/* Bookmark Action Button */}
          <button
            type="button"
            aria-label={bookmarked ? "Remove from favourites" : "Save to favourites"}
            onClick={(e) => {
              e.stopPropagation();
              if (!currentUser) {
                if (onOpenAuthModal) onOpenAuthModal();
                return;
              }
              toggleBookmark(recipe);
            }}
            className={`absolute top-3 right-3 p-2 rounded-xl transition-all shadow-sm cursor-pointer ${
              bookmarked 
                ? 'bg-amber-600 text-white' 
                : 'bg-white/90 text-stone-700 hover:bg-white hover:text-amber-600'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-white' : ''}`} />
          </button>

          {/* Measured scrim at bottom for contrast */}
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-stone-900/40 to-transparent pointer-events-none" />
        </div>
      )}

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Compact Top Action Strip when image is omitted */}
          {!hasCoverImage && (
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                {recipe.isPremium && (
                  <span className="bg-amber-600 text-white px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>VIP Master</span>
                  </span>
                )}
                {recipe.videoUrl && (
                  <span className="bg-stone-900 text-amber-300 px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1">
                    <PlayCircle className="w-3 h-3 text-amber-400" />
                    <span>Video</span>
                  </span>
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  {recipe.cuisine || 'Artisan'}
                </span>
              </div>

              <button
                type="button"
                aria-label={bookmarked ? "Remove from favourites" : "Save to favourites"}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!currentUser) {
                    if (onOpenAuthModal) onOpenAuthModal();
                    return;
                  }
                  toggleBookmark(recipe);
                }}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  bookmarked 
                    ? 'bg-amber-600 border-amber-600 text-white' 
                    : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:text-amber-600'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-white' : ''}`} />
              </button>
            </div>
          )}

          {/* Unboxed Metadata with Typographic Separator */}
          <div className="flex items-center gap-2 text-xs text-stone-500 font-medium mb-1.5 flex-wrap">
            {hasCoverImage && (
              <>
                <span className="text-amber-700 dark:text-amber-400 uppercase tracking-wider text-[11px] font-semibold">{recipe.cuisine}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span className="capitalize">{recipe.category}</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-stone-400 shrink-0" />
              <span>{totalTimeLabel}</span>
            </span>
          </div>

          {/* Title */}
          <h3 className="font-serif-display text-lg font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors line-clamp-2 mb-1.5 leading-snug">
            {recipe.title}
          </h3>

          {/* Description preview */}
          <p className={`text-xs text-stone-600 dark:text-stone-400 leading-relaxed mb-4 ${hasCoverImage ? 'line-clamp-2' : 'line-clamp-3'}`}>
            {recipe.description}
          </p>
        </div>

        {/* Footer: Creator with Glowing Green Plus Badge + Like/Share/Rating */}
        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2 text-xs">
          <div
            onClick={(e) => {
              if (onSelectChef) {
                e.stopPropagation();
                onSelectChef(recipe.authorId);
              }
            }}
            className="flex items-center gap-2.5 text-stone-700 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-400 transition-colors text-left min-w-0 cursor-pointer"
          >
            <UserAvatar
              src={authorPhoto}
              seed={recipe.authorId}
              name={authorName}
              size="sm"
              ring={false}
              showFollowButton
              creatorId={recipe.authorId}
              creatorName={authorName}
              creatorPhoto={authorPhoto}
              onRequireAuth={onOpenAuthModal}
            />
            <div className="min-w-0">
              <span className="font-semibold block truncate max-w-[125px] text-stone-800 dark:text-stone-200">{authorName}</span>
              <span className="text-[10px] text-stone-400 block tabular-nums">
                {followerCount.toLocaleString()} {followerCount === 1 ? 'follower' : 'followers'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleLikeClick}
              aria-label={liked ? 'Unlike recipe' : 'Like recipe'}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                liked
                  ? 'text-red-500 bg-red-50 dark:bg-red-950/40'
                  : 'text-stone-500 hover:text-red-500 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-red-500' : ''}`} />
              <span className="text-[11px] font-semibold tabular-nums">{recipe.likesCount || 0}</span>
            </button>

            {onShare && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(recipe);
                }}
                aria-label="Share recipe"
                className="p-1.5 rounded-lg text-stone-500 hover:text-amber-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="flex items-center gap-0.5 text-stone-700 dark:text-stone-200 font-semibold tabular-nums">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{(recipe.ratingAverage || 5.0).toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

