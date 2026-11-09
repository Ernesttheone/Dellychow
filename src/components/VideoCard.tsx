import React from 'react';
import { Play, Lock, Clock, Eye, Share2, LogIn } from 'lucide-react';
import { CookingVideo } from '../types';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';

interface VideoCardProps {
  video: CookingVideo;
  onPlay: (video: CookingVideo) => void;
  onRequestSubscribe?: (chefId: string, chefName: string) => void;
  isGuestRestricted?: boolean;
  onOpenAuthModal?: () => void;
  onShare?: (video: CookingVideo) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ 
  video, 
  onPlay, 
  onRequestSubscribe,
  isGuestRestricted = false,
  onOpenAuthModal,
  onShare
}) => {
  const { isSubscribedToChef, currentUser } = useAuth();
  const isVipLocked = video.isPremium && !isSubscribedToChef(video.authorId);

  const handleClick = () => {
    // Free tutorials are open to everyone (guests and members alike)
    // Only lock when specifically configured as a guest-restricted premium asset
    if (isGuestRestricted && video.isPremium && !currentUser) {
      if (onOpenAuthModal) {
        onOpenAuthModal();
      }
      return;
    }

    onPlay(video);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShare) {
      onShare(video);
    }
  };

  return (
    <div 
      className="group bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer relative"
      onClick={handleClick}
    >
      {/* Video Thumbnail */}
      <div className="relative aspect-16/9 bg-stone-900 overflow-hidden">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500 opacity-90 group-hover:opacity-100"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-stone-800 text-stone-400">
            <Play className="w-10 h-10 text-stone-500" />
          </div>
        )}

        {/* Play Button or Lock Badge Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-stone-950/20 group-hover:bg-stone-950/30 transition-colors">
          {isVipLocked ? (
            <div className="w-12 h-12 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
              <Lock className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-white/90 text-amber-700 flex items-center justify-center shadow-lg pl-0.5 transform group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-amber-700" />
            </div>
          )}
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-2.5 right-2.5 bg-stone-900/80 backdrop-blur-xs text-white text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
          <Clock className="w-3 h-3 text-stone-300" />
          <span>{video.durationMinutes}m</span>
        </div>

        {/* Badges: VIP Only or Free Tutorial */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {video.isPremium ? (
            <div className="bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              <span>VIP Masterclass</span>
            </div>
          ) : (
            <div className="bg-emerald-600/90 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm backdrop-blur-xs">
              Free Tutorial
            </div>
          )}
        </div>

        {/* Quick Share Button on thumbnail */}
        {onShare && (
          <button
            type="button"
            onClick={handleShareClick}
            aria-label="Share video link"
            title="Share Video"
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-stone-900/80 hover:bg-amber-600 text-white flex items-center justify-center backdrop-blur-xs transition-colors shadow-sm cursor-pointer z-10"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500 font-medium mb-1">
            <span className="text-amber-700 uppercase tracking-wider text-[11px] font-semibold">{video.category || 'Tutorial'}</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3 text-stone-400" />
              {(video.viewCount || 100).toLocaleString()} views
            </span>
          </div>

          <h3 className="font-serif-display text-base font-bold text-stone-900 group-hover:text-amber-800 transition-colors line-clamp-1 mb-1">
            {video.title}
          </h3>

          <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
            {video.description}
          </p>
        </div>

        {/* Author info & lock note */}
        <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <UserAvatar
              src={video.authorPhoto}
              seed={video.authorId}
              name={video.authorName}
              size="xs"
              ring={false}
            />
            <span className="font-medium text-stone-700 truncate max-w-[130px]">{video.authorName}</span>
          </div>

          <div className="flex items-center gap-2">
            {isVipLocked ? (
              <span className="text-[11px] font-semibold text-amber-700">Unlock VIP</span>
            ) : (
              <span className="text-[11px] text-emerald-700 font-medium">Watch Free</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
