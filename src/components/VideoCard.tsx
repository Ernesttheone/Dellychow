import React, { useState, useMemo } from 'react';
import {
  Play,
  Lock,
  Clock,
  Eye,
  Share2,
  Heart,
  MessageSquare,
  Bookmark,
  MoreVertical,
  ChefHat,
  Crown,
  Flag,
} from 'lucide-react';
import { CookingVideo, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';

interface VideoCardProps {
  video: CookingVideo;
  onPlay: (video: CookingVideo) => void;
  onRequestSubscribe?: (chefId: string, chefName: string) => void;
  isGuestRestricted?: boolean;
  onOpenAuthModal?: () => void;
  onShare?: (video: CookingVideo) => void;
  creatorProfile?: UserProfile;
  onSelectChef?: (chefId: string) => void;
  onCommentClick?: (video: CookingVideo) => void;
  onReport?: (video: CookingVideo) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  onPlay,
  onRequestSubscribe,
  isGuestRestricted = false,
  onOpenAuthModal,
  onShare,
  creatorProfile,
  onSelectChef,
  onCommentClick,
  onReport,
}) => {
  const {
    isSubscribedToChef,
    currentUser,
    isVideoLiked,
    toggleLikeVideo,
    isVideoBookmarked,
    toggleVideoBookmark,
    setPendingAction,
  } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isVipLocked = video.isPremium && !isSubscribedToChef(video.authorId);
  const liked = isVideoLiked(video.id);
  const bookmarked = isVideoBookmarked(video.id);

  const authorName = creatorProfile?.displayName || video.authorName || 'Chef';
  const authorPhoto = creatorProfile?.photoURL || video.authorPhoto;
  const followerCount = creatorProfile?.followerCount ?? 0;

  const formattedDate = useMemo(() => {
    if (!video.createdAt) return 'Recently';
    try {
      const d = new Date(video.createdAt);
      const diffMs = Date.now() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 3600 * 24));
      if (diffDays <= 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  }, [video.createdAt]);

  const handleClick = () => {
    if (isGuestRestricted && video.isPremium && !currentUser) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    onPlay(video);
  };

  const handleLikeClick = async (e: React.MouseEvent) => {
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

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (!currentUser) {
      setPendingAction({ type: 'bookmark_video', video });
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    try {
      await toggleVideoBookmark(video);
    } catch {
      // non-blocking
    }
  };

  const handleCommentBtn = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGuestRestricted && video.isPremium && !currentUser) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    if (onCommentClick) {
      onCommentClick(video);
    } else {
      onPlay(video);
    }
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (onShare) onShare(video);
  };

  return (
    <article
      className="group bg-white dark:bg-[#1a1715] rounded-2xl border border-stone-200/80 dark:border-stone-800 overflow-visible shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer relative"
      onClick={handleClick}
    >
      {/* 16:9 YouTube-Style Video Thumbnail */}
      <div className="relative aspect-16/9 bg-stone-900 overflow-hidden rounded-t-2xl">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500 opacity-95 group-hover:opacity-100"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-stone-800 text-stone-400">
            <Play className="w-10 h-10 text-stone-500" />
          </div>
        )}

        {/* Center Play / VIP Lock Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-stone-950/20 group-hover:bg-stone-950/35 transition-colors">
          {isVipLocked ? (
            <div className="w-12 h-12 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
              <Lock className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-white/95 text-amber-700 flex items-center justify-center shadow-lg pl-0.5 transform group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-amber-700" />
            </div>
          )}
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-2.5 right-2.5 bg-stone-950/85 backdrop-blur-xs text-white text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 tabular-nums">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>{video.durationMinutes || 15}m</span>
        </div>

        {/* Badges: VIP Only or Free Tutorial */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {video.isPremium ? (
            <div className="bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
              <Crown className="w-2.5 h-2.5" />
              <span>VIP Masterclass</span>
            </div>
          ) : (
            <div className="bg-emerald-600/90 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm backdrop-blur-xs">
              Free Tutorial
            </div>
          )}
        </div>

        {/* Quick Save Button on Thumbnail */}
        <button
          type="button"
          onClick={handleBookmarkClick}
          aria-label={bookmarked ? 'Remove video from favourites' : 'Save video to favourites'}
          title={bookmarked ? 'Saved to favourites' : 'Save to favourites'}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-xs transition-colors shadow-sm cursor-pointer z-10 ${
            bookmarked
              ? 'bg-amber-600 text-white'
              : 'bg-stone-950/75 hover:bg-amber-600 text-white'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-white' : ''}`} />
        </button>
      </div>

      {/* YouTube-Inspired Creator Avatar + Video Details */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Creator Avatar with Special Glowing Green PLUS (+) Badge */}
          <div
            className="shrink-0 pt-0.5"
            onClick={(e) => {
              if (onSelectChef) {
                e.stopPropagation();
                onSelectChef(video.authorId);
              }
            }}
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

          {/* Title, Creator, Stats, Three-Dot Menu */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <h3 className="font-serif-display text-base font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug">
                {video.title}
              </h3>

              {/* Three-Dot Overflow Menu */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(!menuOpen);
                  }}
                  aria-label="More options"
                  className="p-1.5 -mr-1.5 rounded-full text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                      }}
                    />
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-8 z-40 w-52 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-200 animate-in fade-in zoom-in-95"
                    >
                      <button
                        type="button"
                        onClick={handleBookmarkClick}
                        className="w-full px-3.5 py-2 text-left hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Bookmark className={`w-4 h-4 ${bookmarked ? 'text-amber-600 fill-amber-600' : 'text-stone-500'}`} />
                        <span>{bookmarked ? 'Remove from favourites' : 'Save to favourites'}</span>
                      </button>

                      {onShare && (
                        <button
                          type="button"
                          onClick={handleShareClick}
                          className="w-full px-3.5 py-2 text-left hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Share2 className="w-4 h-4 text-amber-600" />
                          <span>Share video</span>
                        </button>
                      )}

                      {onSelectChef && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onSelectChef(video.authorId);
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2.5 transition-colors border-t border-stone-100 dark:border-stone-800 cursor-pointer"
                        >
                          <ChefHat className="w-4 h-4 text-stone-500" />
                          <span>View creator profile</span>
                        </button>
                      )}

                      {isVipLocked && onRequestSubscribe && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onRequestSubscribe(video.authorId, authorName);
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400 flex items-center gap-2.5 transition-colors border-t border-stone-100 dark:border-stone-800 cursor-pointer"
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
                          className="w-full px-3.5 py-2 text-left hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 flex items-center gap-2.5 transition-colors border-t border-stone-100 dark:border-stone-800 cursor-pointer"
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

            <div className="mt-1 space-y-0.5 text-xs text-stone-500 dark:text-stone-400">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectChef) onSelectChef(video.authorId);
                  }}
                  className="font-semibold text-stone-700 dark:text-stone-200 hover:text-amber-600 transition-colors truncate max-w-[140px] cursor-pointer text-left"
                >
                  {authorName}
                </button>
                <span aria-hidden="true">·</span>
                <span className="text-[11px] tabular-nums">
                  {followerCount.toLocaleString()} {followerCount === 1 ? 'follower' : 'followers'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
                <span className="text-amber-700 dark:text-amber-400 font-semibold uppercase tracking-wider text-[10px]">
                  {video.category || 'Tutorial'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Eye className="w-3 h-3" />
                  {(video.viewCount || 0).toLocaleString()} views
                </span>
                <span aria-hidden="true">·</span>
                <span>{formattedDate}</span>
              </div>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 mt-1.5 leading-relaxed">
              {video.description}
            </p>
          </div>
        </div>

        {/* Social Engagement Action Strip (Like, Comment, Share, Save) */}
        <div className="pt-2.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-1 text-xs">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleLikeClick}
              aria-label={liked ? 'Unlike video' : 'Like video'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                liked
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-500'
                  : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-red-500'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
              <span className="tabular-nums">{video.likesCount || 0}</span>
            </button>

            <button
              type="button"
              onClick={handleCommentBtn}
              aria-label="Open comments"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-amber-600 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Comment</span>
            </button>

            {onShare && (
              <button
                type="button"
                onClick={handleShareClick}
                aria-label="Share video"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-amber-600 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleBookmarkClick}
            aria-label={bookmarked ? 'Saved to favourites' : 'Save video'}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
              bookmarked
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-amber-600 text-amber-600' : ''}`} />
            <span>{bookmarked ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>
    </article>
  );
};
