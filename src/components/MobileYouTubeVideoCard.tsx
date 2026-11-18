import React, { useState, useMemo } from 'react';
import {
  Play,
  Lock,
  Clock,
  Share2,
  MoreVertical,
  Bookmark,
  ChefHat,
  Crown,
  Heart,
  MessageSquare,
  Flag,
} from 'lucide-react';
import { CookingVideo, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';

interface MobileYouTubeVideoCardProps {
  video: CookingVideo;
  onPlay: (video: CookingVideo) => void;
  onRequestSubscribe?: (chefId: string, chefName: string) => void;
  onSelectChef?: (chefId: string) => void;
  onShare?: (video: CookingVideo) => void;
  onOpenAuthModal?: () => void;
  creatorProfile?: UserProfile;
  onCommentClick?: (video: CookingVideo) => void;
  onReport?: (video: CookingVideo) => void;
}

export const MobileYouTubeVideoCard: React.FC<MobileYouTubeVideoCardProps> = ({
  video,
  onPlay,
  onRequestSubscribe,
  onSelectChef,
  onShare,
  onOpenAuthModal,
  creatorProfile,
  onCommentClick,
  onReport,
}) => {
  const {
    isSubscribedToChef,
    currentUser,
    isVideoBookmarked,
    toggleVideoBookmark,
    isVideoLiked,
    toggleLikeVideo,
    setPendingAction,
  } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isVipLocked = video.isPremium && !isSubscribedToChef(video.authorId);
  const isBookmarked = isVideoBookmarked(video.id);
  const liked = isVideoLiked(video.id);

  const authorName = creatorProfile?.displayName || video.authorName || 'Chef';
  const authorPhoto = creatorProfile?.photoURL || video.authorPhoto;
  const followerCount = creatorProfile?.followerCount ?? 0;

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
      setPendingAction({ type: 'bookmark_video', video });
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    toggleVideoBookmark(video);
    setMenuOpen(false);
  };

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      setPendingAction({
        type: 'like_video',
        videoId: video.id,
        videoTitle: video.title,
        authorId: video.authorId,
      });
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    try {
      await toggleLikeVideo(video);
    } catch {
      // non-blocking
    }
  };

  const handleCommentPress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCommentClick) {
      onCommentClick(video);
    } else {
      onPlay(video);
    }
  };

  const handleChefClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectChef) {
      onSelectChef(video.authorId);
    }
  };

  const formattedDate = useMemo(() => {
    if (!video.createdAt) return 'Recently uploaded';
    try {
      const d = new Date(video.createdAt);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
      if (diffDays <= 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently uploaded';
    }
  }, [video.createdAt]);

  return (
    <article className="w-full bg-white dark:bg-[#141210] sm:rounded-2xl sm:border sm:border-stone-200/80 dark:sm:border-stone-800 sm:shadow-xs overflow-visible pb-3 border-b border-stone-200/60 dark:border-stone-800 last:border-b-0 transition-all">
      {/* 1. Large 16:9 Thumbnail (YouTube Mobile Style) */}
      <div
        className="relative aspect-16/9 w-full bg-stone-900 cursor-pointer overflow-hidden group select-none sm:rounded-t-2xl"
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

        {/* Center Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
          {isVipLocked ? (
            <div className="w-12 h-12 rounded-full bg-amber-600/95 text-white flex items-center justify-center shadow-lg ring-2 ring-white/30 backdrop-blur-xs">
              <Lock className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-white/90 text-amber-700 flex items-center justify-center shadow-lg pl-0.5 group-active:scale-90 transition-transform">
              <Play className="w-5 h-5 fill-amber-700" />
            </div>
          )}
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs tabular-nums">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>{video.durationMinutes || 15}m</span>
        </div>

        {/* VIP / Free Badge */}
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

      {/* 2. Metadata Bar Below Thumbnail */}
      <div className="px-3.5 pt-3 flex items-start gap-3">
        {/* Creator Avatar with Easy-to-Tap Glowing Green PLUS (+) Follow Badge */}
        <div
          onClick={handleChefClick}
          className="shrink-0 cursor-pointer pt-0.5"
          aria-label={`View ${authorName}'s channel`}
        >
          <UserAvatar
            src={authorPhoto}
            seed={video.authorId}
            name={authorName}
            size="md"
            showFollowButton
            creatorId={video.authorId}
            creatorName={authorName}
            creatorPhoto={authorPhoto}
            onRequireAuth={onOpenAuthModal}
          />
        </div>

        {/* Title & Channel Details */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={handleClick}>
          <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-sm leading-snug line-clamp-2 text-balance hover:text-amber-700 transition-colors">
            {video.title}
          </h3>

          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-stone-500 dark:text-stone-400 mt-1 leading-tight">
            <span
              onClick={handleChefClick}
              className="hover:text-stone-800 dark:hover:text-stone-200 font-semibold truncate max-w-[140px]"
            >
              {authorName}
            </span>
            <span className="text-stone-400">·</span>
            <span className="tabular-nums">
              {followerCount.toLocaleString()} {followerCount === 1 ? 'follower' : 'followers'}
            </span>
            <span className="text-stone-400">·</span>
            <span className="tabular-nums">{(video.viewCount || 0).toLocaleString()} views</span>
            <span className="text-stone-400">·</span>
            <span>{formattedDate}</span>
          </div>

          {video.category && (
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 uppercase tracking-wider">
                {video.category}
              </span>
              {video.recipeId && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-stone-500 dark:text-stone-400 font-medium">
                  <ChefHat className="w-3 h-3 text-amber-600" />
                  <span>Recipe attached</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Three-Dot Menu Button */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="More video actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

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
                className="absolute right-0 top-10 z-50 w-56 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 py-1.5 animate-in fade-in zoom-in-95 text-xs font-medium text-stone-700 dark:text-stone-200"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-amber-600" />
                  <span>Share cooking video</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleBookmark}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2.5 transition-colors cursor-pointer"
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
                    className="w-full px-3.5 py-2.5 text-left hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2.5 transition-colors border-t border-stone-100 dark:border-stone-800 cursor-pointer"
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
                      onRequestSubscribe(video.authorId, authorName);
                    }}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-800 dark:text-amber-400 flex items-center gap-2.5 transition-colors border-t border-stone-100 dark:border-stone-800 cursor-pointer"
                  >
                    <Crown className="w-4 h-4 text-amber-600" />
                    <span>Join VIP Circle</span>
                  </button>
                )}

                {onReport && video.authorId !== currentUser?.uid && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onReport(video);
                    }}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 flex items-center gap-2.5 transition-colors border-t border-stone-100 dark:border-stone-800 cursor-pointer"
                  >
                    <Flag className="w-4 h-4" />
                    <span>Report video</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. Mobile Compact Social Action Row (44px+ accessible touch targets) */}
      <div className="px-3.5 pt-2.5 flex items-center justify-between gap-1 text-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleToggleLike}
            aria-label={liked ? 'Unlike video' : 'Like video'}
            className={`inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-xl font-semibold transition-colors cursor-pointer ${
              liked
                ? 'bg-red-50 dark:bg-red-950/40 text-red-500'
                : 'bg-stone-100/80 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
            <span className="tabular-nums">{video.likesCount || 0}</span>
          </button>

          <button
            type="button"
            onClick={handleCommentPress}
            aria-label="Comment on video"
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-xl font-semibold bg-stone-100/80 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Comment</span>
          </button>

          {onShare && (
            <button
              type="button"
              onClick={handleShare}
              aria-label="Share video"
              className="inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-xl font-semibold bg-stone-100/80 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleToggleBookmark}
          aria-label={isBookmarked ? 'Saved to favourites' : 'Save to favourites'}
          className={`inline-flex items-center gap-1 min-h-[38px] px-3 rounded-xl font-semibold transition-colors cursor-pointer ${
            isBookmarked
              ? 'bg-amber-600 text-white'
              : 'bg-stone-100/80 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-white' : ''}`} />
          <span>{isBookmarked ? 'Saved' : 'Save'}</span>
        </button>
      </div>
    </article>
  );
};
