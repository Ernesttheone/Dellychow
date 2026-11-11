import React, { useState } from 'react';
import { 
  Play, 
  Lock, 
  Clock, 
  Eye, 
  Share2, 
  MoreVertical, 
  Bookmark, 
  ShoppingCart, 
  ChefHat, 
  Check, 
  X,
  Sparkles,
  Crown
} from 'lucide-react';
import { CookingVideo } from '../types';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';

interface MobileYouTubeVideoCardProps {
  video: CookingVideo;
  onPlay: (video: CookingVideo) => void;
  onRequestSubscribe?: (chefId: string, chefName: string) => void;
  onSelectChef?: (chefId: string) => void;
  onShare?: (video: CookingVideo) => void;
  onOpenAuthModal?: () => void;
}

export const MobileYouTubeVideoCard: React.FC<MobileYouTubeVideoCardProps> = ({
  video,
  onPlay,
  onRequestSubscribe,
  onSelectChef,
  onShare,
  onOpenAuthModal
}) => {
  const { isSubscribedToChef, currentUser, isVideoBookmarked, toggleVideoBookmark } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const isVipLocked = video.isPremium && !isSubscribedToChef(video.authorId);
  const isBookmarked = isVideoBookmarked(video.id);

  const handleClick = () => {
    onPlay(video);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (onShare) onShare(video);
  };

  const handleToggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    toggleVideoBookmark(video);
    setMenuOpen(false);
  };

  const handleChefClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectChef) {
      onSelectChef(video.authorId);
    }
  };

  // Format date cleanly e.g. "2 days ago" or "Nov 10"
  const formattedDate = React.useMemo(() => {
    if (!video.createdAt) return 'Recently uploaded';
    try {
      const d = new Date(video.createdAt);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently uploaded';
    }
  }, [video.createdAt]);

  return (
    <article className="w-full bg-white sm:rounded-2xl sm:border sm:border-stone-200/80 sm:shadow-xs overflow-hidden pb-4 sm:pb-3 border-b border-stone-200/60 last:border-b-0 sm:border-b transition-all">
      {/* 1. Large 16:9 Thumbnail (YouTube Mobile Style) */}
      <div 
        className="relative aspect-16/9 w-full bg-stone-900 cursor-pointer overflow-hidden group select-none"
        onClick={handleClick}
      >
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-300 group-active:scale-98"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-stone-900 text-stone-500">
            <Play className="w-12 h-12 text-stone-600" />
          </div>
        )}

        {/* Center Play Button Overlay on Hover/Tap */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
          {isVipLocked ? (
            <div className="w-12 h-12 rounded-full bg-amber-600/90 text-white flex items-center justify-center shadow-lg ring-2 ring-white/30 backdrop-blur-xs">
              <Lock className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-white/90 text-amber-700 flex items-center justify-center shadow-lg pl-0.5 group-active:scale-90 transition-transform">
              <Play className="w-5 h-5 fill-amber-700" />
            </div>
          )}
        </div>

        {/* Duration Badge (Bottom-Right, YouTube style) */}
        <div className="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs tabular-nums">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>{video.durationMinutes || 15}m</span>
        </div>

        {/* VIP / Free Badge (Top-Left) */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {video.isPremium ? (
            <span className="bg-amber-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm flex items-center gap-1 backdrop-blur-xs">
              <Crown className="w-3 h-3 text-amber-200" />
              <span>VIP Masterclass</span>
            </span>
          ) : (
            <span className="bg-emerald-600/90 text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm backdrop-blur-xs">
              Free Tutorial
            </span>
          )}
        </div>
      </div>

      {/* 2. Metadata Bar Below Thumbnail (YouTube Mobile Style) */}
      <div className="px-3.5 pt-3 flex items-start gap-3">
        {/* Creator Channel Avatar */}
        <button
          type="button"
          onClick={handleChefClick}
          className="shrink-0 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-full"
          aria-label={`View ${video.authorName}'s channel`}
        >
          <UserAvatar
            src={video.authorPhoto}
            seed={video.authorId}
            name={video.authorName}
            size="md"
          />
        </button>

        {/* Title & Channel Details */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={handleClick}>
          <h3 className="font-semibold text-stone-900 text-sm leading-snug line-clamp-2 text-balance hover:text-amber-800 transition-colors">
            {video.title}
          </h3>

          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-stone-500 mt-1 leading-none">
            <span 
              onClick={handleChefClick}
              className="hover:text-stone-800 font-medium truncate max-w-[150px]"
            >
              {video.authorName}
            </span>
            <span className="text-stone-400">•</span>
            <span>{(video.viewCount || 120).toLocaleString()} views</span>
            <span className="text-stone-400">•</span>
            <span>{formattedDate}</span>
          </div>

          {video.category && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60 uppercase tracking-wider">
                {video.category}
              </span>
              {video.recipeId && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-stone-500 font-medium">
                  <ChefHat className="w-3 h-3 text-amber-600" />
                  <span>Recipe attached</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Three-Dot Menu Button (YouTube Action Overflow) */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1.5 text-stone-500 hover:text-stone-900 rounded-full hover:bg-stone-100 transition-colors"
            aria-label="More video actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Action Popup / Sheet */}
          {menuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                }}
              />
              <div 
                className="absolute right-0 top-8 z-50 w-56 bg-white rounded-2xl shadow-xl border border-stone-200 py-1.5 animate-in fade-in zoom-in-95 text-xs font-medium text-stone-700"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-stone-50 flex items-center gap-2.5 transition-colors"
                >
                  <Share2 className="w-4 h-4 text-amber-600" />
                  <span>Share cooking video</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleBookmark}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-stone-50 flex items-center gap-2.5 transition-colors"
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? 'text-amber-600 fill-amber-600' : 'text-stone-500'}`} />
                  <span>{isBookmarked ? 'Remove from saved' : 'Save to favourites'}</span>
                </button>

                {onSelectChef && (
                  <button
                    type="button"
                    onClick={(e) => {
                      handleChefClick(e);
                      setMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-stone-50 flex items-center gap-2.5 transition-colors border-t border-stone-100"
                  >
                    <ChefHat className="w-4 h-4 text-stone-500" />
                    <span>View Chef&apos;s channel</span>
                  </button>
                )}

                {video.isPremium && !isSubscribedToChef(video.authorId) && onRequestSubscribe && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onRequestSubscribe(video.authorId, video.authorName);
                    }}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-amber-50 text-amber-800 flex items-center gap-2.5 transition-colors border-t border-stone-100"
                  >
                    <Crown className="w-4 h-4 text-amber-600" />
                    <span>Join VIP Circle</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
};
