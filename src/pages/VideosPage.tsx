import React, { useState, useMemo, useEffect } from 'react';
import { Play, Search, Video, ChefHat, Sparkles, Plus, Clock, ShieldCheck, LogIn, Lock, WifiOff } from 'lucide-react';
import { CookingVideo } from '../types';
import { VideoCard } from '../components/VideoCard';
import { useAuth } from '../context/AuthContext';
import { getWatchedVideosOffline, useOnlineStatus } from '../lib/offlineVideoCache';

interface VideosPageProps {
  videos: CookingVideo[];
  onPlayVideo: (video: CookingVideo) => void;
  onRequestSubscribe: (chefId: string, chefName: string) => void;
  onNavigate: (view: string, params?: any) => void;
  onOpenAuthModal?: (mode?: 'login' | 'signup') => void;
  onShareVideo?: (video: CookingVideo) => void;
}

export const VideosPage: React.FC<VideosPageProps> = ({
  videos,
  onPlayVideo,
  onRequestSubscribe,
  onNavigate,
  onOpenAuthModal,
  onShareVideo
}) => {
  const { currentUser, userProfile, setPendingAction } = useAuth();
  const isChef = userProfile?.role === 'chef';
  const isOnline = useOnlineStatus();
  const [cachedVideos, setCachedVideos] = useState<CookingVideo[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'free' | 'vip'>('all');

  useEffect(() => {
    getWatchedVideosOffline().then((cv) => {
      if (cv && cv.length > 0) {
        setCachedVideos(cv);
      }
    });
  }, []);

  const sourceVideos = videos.length > 0 ? videos : cachedVideos;
  const isShowingOfflineCache = videos.length === 0 && cachedVideos.length > 0;

  // For unauthenticated guests: strictly 3 selected tutorial videos
  const displayVideos = useMemo(() => {
    if (!currentUser) {
      // Return exactly 3 selected tutorial videos for guests
      return sourceVideos.slice(0, 3);
    }

    return sourceVideos.filter((v) => {
      if (activeFilter === 'free' && v.isPremium) return false;
      if (activeFilter === 'vip' && !v.isPremium) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = v.title.toLowerCase().includes(q);
        const matchesAuthor = v.authorName.toLowerCase().includes(q);
        const matchesDesc = v.description.toLowerCase().includes(q);
        if (!matchesTitle && !matchesAuthor && !matchesDesc) return false;
      }
      return true;
    });
  }, [sourceVideos, currentUser, activeFilter, searchQuery]);

  const handleVideoCardClick = (video: CookingVideo) => {
    if (video.isPremium && !currentUser) {
      setPendingAction({ type: 'watch_video', video });
      onOpenAuthModal?.('signup');
      return;
    }
    onPlayVideo(video);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-amber-700 font-semibold uppercase tracking-wider mb-1">
            <Video className="w-4 h-4" />
            <span>Master Video Classes</span>
          </div>
          <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            Culinary Video Masterclasses
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-xl">
            {currentUser 
              ? 'Watch real chefs demonstrate intricate food preparation techniques, knife handling, searing methods, and plating styles.'
              : 'Browse 3 selected chef tutorial videos below. Creating an account is required to watch video playback.'}
          </p>
        </div>

        {isChef && (
          <button
            onClick={() => onNavigate('chef-upload-video')}
            className="px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-sm flex items-center gap-2 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Post Cooking Video</span>
          </button>
        )}
      </div>

      {/* Offline Mode Banner */}
      {(!isOnline || isShowingOfflineCache) && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-stone-900 border border-amber-300 dark:border-amber-700/60 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-stone-700 dark:text-stone-300 font-medium">
              <strong className="text-stone-900 dark:text-white">Offline Mode:</strong> Showing previously watched culinary tutorials and cached thumbnails from your device cache.
            </p>
          </div>
          <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 rounded-full shrink-0">
            {displayVideos.length} cached
          </span>
        </div>
      )}

      {/* Guest 3-Video Selected Limit Notice */}
      {!currentUser && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-stone-900">
                Guest Browsing: 3 Selected Cooking Tutorials Available
              </p>
              <p className="text-stone-600">
                You can freely browse video titles, descriptions, and nutritional details. Creating an account or logging in is required to start tutorial video playback.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={() => onOpenAuthModal?.('login')}
              className="px-3.5 py-1.5 rounded-lg bg-stone-900 text-white font-semibold hover:bg-stone-800 transition-colors flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>
            <button
              onClick={() => onOpenAuthModal?.('signup')}
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-colors shadow-xs"
            >
              Register Free
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar (only for registered users) */}
      {currentUser && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2 border-b border-stone-200/80">
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                activeFilter === 'all'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              All Videos ({videos.length})
            </button>

            <button
              onClick={() => setActiveFilter('free')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                activeFilter === 'free'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              Public Free Tutorials
            </button>

            <button
              onClick={() => setActiveFilter('vip')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                activeFilter === 'vip'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              VIP Masterclasses Only
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos or chef name..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
            />
          </div>
        </div>
      )}

      {/* Videos Grid */}
      {displayVideos.length === 0 ? (
        <div className="p-16 rounded-3xl bg-white border border-stone-200/80 text-center space-y-3 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Video className="w-7 h-7" />
          </div>
          <h3 className="font-serif-display text-lg font-bold text-stone-900">
            No Cooking Videos Found
          </h3>
          <p className="text-xs text-stone-500">
            There are no videos matching your search. Check back soon for fresh culinary uploads!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {displayVideos.map((video) => {
            return (
              <VideoCard
                key={video.id}
                video={video}
                onPlay={handleVideoCardClick}
                onShare={onShareVideo}
                onRequestSubscribe={onRequestSubscribe}
                isGuestRestricted={video.isPremium && !currentUser}
                onOpenAuthModal={() => {
                  setPendingAction({ type: 'watch_video', video });
                  onOpenAuthModal?.('signup');
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

