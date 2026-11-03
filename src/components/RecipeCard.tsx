import React, { useState } from 'react';
import { Bookmark, Clock, Users, Star, PlayCircle, Lock } from 'lucide-react';
import { Recipe } from '../types';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';

interface RecipeCardProps {
  recipe: Recipe;
  onSelect: (recipe: Recipe) => void;
  onSelectChef?: (chefId: string) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onSelect, onSelectChef }) => {
  const { isRecipeBookmarked, toggleBookmark, isSubscribedToChef } = useAuth();
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const bookmarked = isRecipeBookmarked(recipe.id);
  const isPremiumLocked = recipe.isPremium && !isSubscribedToChef(recipe.authorId);

  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);

  return (
    <div 
      className="group bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer"
      onClick={() => onSelect(recipe)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Cover Image */}
      <div className="relative aspect-4/3 bg-stone-100 overflow-hidden">
        {!imageError && recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 text-stone-400 p-4 text-center">
            <span className="font-serif-display text-lg font-bold text-stone-600 mb-1">{recipe.title}</span>
            <span className="text-xs text-stone-400 capitalize">{recipe.cuisine} {recipe.category}</span>
          </div>
        )}

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
          aria-label={bookmarked ? "Remove from bookmarks" : "Save to bookmarks"}
          onClick={(e) => {
            e.stopPropagation();
            toggleBookmark(recipe);
          }}
          className={`absolute top-3 right-3 p-2 rounded-xl transition-all shadow-sm ${
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

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Unboxed Metadata with Typographic Separator */}
          <div className="flex items-center gap-2 text-xs text-stone-500 font-medium mb-1.5">
            <span className="text-amber-700 uppercase tracking-wider text-[11px] font-semibold">{recipe.cuisine}</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{recipe.category}</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-stone-400" />
              {totalTime}m
            </span>
          </div>

          {/* Title */}
          <h3 className="font-serif-display text-lg font-bold text-stone-900 group-hover:text-amber-800 transition-colors line-clamp-1 mb-1.5 leading-snug">
            {recipe.title}
          </h3>

          {/* Description preview */}
          <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-4">
            {recipe.description}
          </p>
        </div>

        {/* Footer: Chef + Rating */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
          <button 
            type="button"
            onClick={(e) => {
              if (onSelectChef) {
                e.stopPropagation();
                onSelectChef(recipe.authorId);
              }
            }}
            className="flex items-center gap-2 text-stone-700 hover:text-amber-700 transition-colors text-left"
          >
            <UserAvatar
              src={recipe.authorPhoto}
              seed={recipe.authorId}
              name={recipe.authorName}
              size="xs"
              ring={false}
            />
            <span className="font-medium truncate max-w-[120px]">{recipe.authorName}</span>
          </button>

          <div className="flex items-center gap-1 text-stone-700 font-semibold tabular-nums">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>{(recipe.ratingAverage || 5.0).toFixed(1)}</span>
            <span className="text-[10px] text-stone-400 font-normal">({recipe.ratingCount || 1})</span>
          </div>
        </div>
      </div>
    </div>
  );
};
