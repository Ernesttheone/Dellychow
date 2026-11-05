import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Play, 
  Clock, 
  ChefHat, 
  Eye, 
  Heart, 
  Bookmark, 
  Share2, 
  Send, 
  MessageSquare, 
  Sparkles, 
  Flame, 
  Check, 
  UserPlus, 
  Lock, 
  Crown, 
  AlertCircle,
  ShieldCheck,
  Radio,
  Loader2
} from 'lucide-react';
import { CookingVideo, VideoComment } from '../types';
import { UserAvatar } from './UserAvatar';
import { useAuth } from '../context/AuthContext';
import { RecipeService } from '../services/recipeService';
import { resolveVideoUrl } from '../lib/videoStorage';

interface VideoPlayerModalProps {
  video: CookingVideo | null;
  onClose: () => void;
  onViewRecipe?: (recipeId: string) => void;
  onSelectChef?: (chefId: string) => void;
  onRequestSubscribe?: (chefId: string, chefName: string) => void;
  onOpenAuthModal?: (mode?: 'login' | 'signup') => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ 
  video, 
  onClose, 
  onViewRecipe,
  onSelectChef,
  onRequestSubscribe,
  onOpenAuthModal 
}) => {
  const { currentUser, userProfile, isSubscribedToChef, isVideoBookmarked, toggleVideoBookmark, setPendingAction } = useAuth();

  const [likes, setLikes] = useState<number>(0);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  // VIP Live Preview state (Feature 4)
  const [previewSecondsLeft, setPreviewSecondsLeft] = useState<number>(10);
  const [previewEnded, setPreviewEnded] = useState<boolean>(false);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // Comments state
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'comments'>('info');
  const [playableUrl, setPlayableUrl] = useState<string>('');
  const [videoLoading, setVideoLoading] = useState<boolean>(true);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Video Accessibility: Public videos open to both chefs and normal users.
  // VIP videos open to paying VIP subscribers or the author chef.
  const isOwnerChef = Boolean(currentUser?.uid && video?.authorId && currentUser.uid === video.authorId);
  const isVipVideo = Boolean(video?.isPremium || video?.category?.toLowerCase().includes('vip'));
  const hasActiveSubscription = video ? (isOwnerChef || isSubscribedToChef(video.authorId)) : false;
  const isVipProtected = isVipVideo && !hasActiveSubscription;

  useEffect(() => {
    if (video) {
      setLikes(video.likesCount || Math.floor((video.viewCount || 200) * 0.08) || 12);
      setHasLiked(false);
      setIsFollowing(false);
      setCommentInput('');
      setActiveTab('info');
      setPreviewSecondsLeft(10);
      setPreviewEnded(false);
      setVideoLoading(true);
      setVideoError(null);
    }
  }, [video]);

  // Resolve published video stream from server or storage
  useEffect(() => {
    if (!video?.videoUrl) {
      setPlayableUrl('');
      setVideoLoading(false);
      setVideoError('No video URL is linked to this masterclass.');
      return;
    }
    let isCancelled = false;
    setVideoLoading(true);
    setVideoError(null);

    resolveVideoUrl(video.videoUrl, video.id)
      .then((resolved) => {
        if (!isCancelled) {
          if (resolved) {
            setPlayableUrl(resolved);
            setVideoLoading(false);
          } else {
            setPlayableUrl('');
            setVideoLoading(false);
            setVideoError('The published video stream is currently syncing from the studio.');
          }
        }
      })
      .catch((err) => {
        console.warn('Cross-device video stream resolution notice:', err);
        if (!isCancelled) {
          setPlayableUrl('');
          setVideoLoading(false);
          setVideoError('Unable to load video stream. Please verify your connection or try again.');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [video?.id, video?.videoUrl]);

  // 10-Second VIP Preview Countdown (Feature 4)
  useEffect(() => {
    if (!video || !isVipProtected) return;

    setPreviewSecondsLeft(10);
    setPreviewEnded(false);

    const interval = setInterval(() => {
      setPreviewSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setPreviewEnded(true);
          // Pause local video if playing
          if (videoElementRef.current) {
            videoElementRef.current.pause();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [video?.id, isVipProtected]);

  // Attempt smooth play across mobile browsers (iOS / Android) and desktop
  useEffect(() => {
    if (videoElementRef.current && playableUrl && !previewEnded) {
      const playPromise = videoElementRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Mobile browser autoplay policies may require user tap; video controls are visible and responsive
        });
      }
    }
  }, [playableUrl, previewEnded]);

  // Listen to video comments
  useEffect(() => {
    if (!video) return;
    const unsub = RecipeService.listenToVideoComments(video.id, (loaded) => {
      setComments(loaded);
    });
    return () => unsub();
  }, [video?.id]);

  if (!video) return null;

  const bookmarked = isVideoBookmarked(video.id);

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('youtube.com/watch?v=')) {
      const id = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    if (url.includes('youtube.com/embed/')) {
      return `${url}?autoplay=1`;
    }
    return url;
  };

  // Only pass valid playable web URLs to video or embed tags; never pass bare dellychow-video://
  const isCustomProtocol = video.videoUrl.startsWith('dellychow-video://');
  const currentSourceUrl = playableUrl || (!isCustomProtocol ? video.videoUrl : '');
  const embedUrl = getEmbedUrl(currentSourceUrl);
  const isDirectVideo = !embedUrl.includes('youtube.com') && !embedUrl.includes('youtu.be') && !embedUrl.includes('vimeo.com');

  // Gated like action
  const handleLike = async () => {
    if (!currentUser) {
      setPendingAction({
        type: 'like_video',
        videoId: video.id,
        videoTitle: video.title
      });
      if (onOpenAuthModal) onOpenAuthModal('login');
      return;
    }
    if (hasLiked) return;
    setHasLiked(true);
    setLikes(prev => prev + 1);
    await RecipeService.likeVideo(video.id, likes);
  };

  // Gated bookmark action
  const handleBookmark = async () => {
    if (!currentUser) {
      setPendingAction({
        type: 'bookmark_video',
        video
      });
      if (onOpenAuthModal) onOpenAuthModal('login');
      return;
    }
    await toggleVideoBookmark(video);
  };

  // Gated follow action
  const handleFollowChef = () => {
    if (!currentUser) {
      setPendingAction({
        type: 'follow_chef',
        chefId: video.authorId,
        chefName: video.authorName
      });
      if (onOpenAuthModal) onOpenAuthModal('login');
      return;
    }
    setIsFollowing(prev => !prev);
    if (onSelectChef) {
      onSelectChef(video.authorId);
      onClose();
    }
  };

  // Gated comment submission
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    if (!currentUser) {
      setPendingAction({
        type: 'comment_video',
        videoId: video.id,
        content: commentInput.trim(),
        targetTitle: video.title
      });
      if (onOpenAuthModal) onOpenAuthModal('login');
      return;
    }

    setCommentSubmitting(true);
    try {
      await RecipeService.addVideoComment(video.id, {
        videoId: video.id,
        userId: currentUser.uid,
        userName: userProfile?.displayName || currentUser.displayName || 'Food Explorer',
        userPhoto: userProfile?.photoURL || currentUser.photoURL || '',
        content: commentInput.trim()
      });

      setCommentInput('');
    } catch (err) {
      console.error('Failed to post video comment:', err);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.origin + '?video=' + video.id;
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          text: `Watch Chef ${video.authorName}'s cooking tutorial: ${video.title} on DellyChow!`,
          url: shareUrl
        });
      } catch {
        // Fallback
      }
    } else {
      navigator.clipboard?.writeText(shareUrl);
      setCopyNotice('Video link copied to clipboard!');
      setTimeout(() => setCopyNotice(null), 3000);
    }
  };

  const handleSubscribeClick = () => {
    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal('login');
      return;
    }
    if (onRequestSubscribe) {
      onRequestSubscribe(video.authorId, video.authorName);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-stone-950/85 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div 
        className="bg-stone-900 border border-stone-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl max-w-4xl w-full flex flex-col text-white my-auto max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-3 sm:p-4 md:px-6 flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <UserAvatar
              src={video.authorPhoto}
              seed={video.authorId}
              name={video.authorName}
              size="sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] sm:text-xs text-stone-400">Tutorial by {video.authorName}</p>
                <button
                  type="button"
                  onClick={handleFollowChef}
                  className={`text-[11px] font-semibold flex items-center gap-0.5 transition-colors ${
                    isFollowing ? 'text-emerald-400' : 'text-amber-400 hover:text-amber-300'
                  }`}
                >
                  <UserPlus className="w-3 h-3" />
                  <span>{isFollowing ? 'Following' : 'Follow Chef'}</span>
                </button>
              </div>
              <h3 className="font-serif-display text-sm sm:text-base font-bold text-white line-clamp-1">
                {video.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleShare}
              className="p-2 text-stone-400 hover:text-white rounded-full hover:bg-stone-800 transition-colors"
              title="Share video link"
              aria-label="Share video link"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white rounded-full hover:bg-stone-800 transition-colors"
              aria-label="Close video player"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feature 4: 10-Second VIP Live Session Preview Protection Banner */}
        {isVipProtected && (
          <div className="bg-amber-600 text-white px-4 py-2 flex flex-col sm:flex-row items-center justify-between text-xs gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              <span className="font-bold uppercase tracking-wider text-[11px]">VIP Live Session Preview</span>
              <span>·</span>
              <span>
                {previewEnded ? '10-Second Free Preview Completed' : `Preview Remaining: ${previewSecondsLeft}s`}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSubscribeClick}
              className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-amber-300 font-bold rounded-lg text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Unlock Full Masterclass</span>
            </button>
          </div>
        )}

        {/* Video Player Area with Tablet-Optimized Aspect Ratio */}
        <div className="relative aspect-16/9 bg-black w-full shrink-0 overflow-hidden">
          {previewEnded ? (
            /* Locked Overlay after 10-second preview expires */
            <div className="absolute inset-0 z-20 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in">
              <div className="w-14 h-14 rounded-2xl bg-amber-600/20 text-amber-500 ring-2 ring-amber-500/30 flex items-center justify-center shadow-lg">
                <Lock className="w-7 h-7" />
              </div>

              <div className="max-w-md space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-center gap-1">
                  <Crown className="w-3.5 h-3.5" />
                  VIP Live Session Access Restricted
                </span>
                <h4 className="font-serif-display text-xl sm:text-2xl font-bold text-white">
                  10-Second Free Preview Ended
                </h4>
                <p className="text-xs text-stone-300 leading-relaxed">
                  Join <strong className="text-white">{video.authorName}&apos;s</strong> VIP Kitchen Circle to unlock uninterrupted access to this live cooking masterclass, direct Q&A, and exclusive recipe books.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleSubscribeClick}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  <Crown className="w-4 h-4 text-amber-200" />
                  <span>{currentUser ? 'Join VIP Circle & Continue Watching' : 'Sign In to Subscribe'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs text-stone-400 hover:text-white transition-colors"
                >
                  Explore Other Tutorials
                </button>
              </div>
            </div>
          ) : (
            isDirectVideo ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                {(!embedUrl || videoLoading) && !videoError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 z-10 space-y-2 pointer-events-none">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                    <span className="text-xs text-stone-300 font-medium">Preparing video masterclass...</span>
                  </div>
                )}

                {videoError ? (
                  <div className="p-6 text-center space-y-3 max-w-md mx-auto z-10">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="text-xs text-stone-300 leading-relaxed">{videoError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoError(null);
                        setVideoLoading(true);
                        resolveVideoUrl(video.videoUrl, video.id).then((url) => {
                          setPlayableUrl(url);
                          setVideoLoading(false);
                          if (!url) {
                            setVideoError('Video stream could not be loaded. Please check back shortly.');
                          }
                        });
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition-colors"
                    >
                      Retry Playing Video
                    </button>
                  </div>
                ) : embedUrl ? (
                  <video 
                    ref={videoElementRef}
                    src={embedUrl} 
                    poster={video.thumbnailUrl}
                    controls 
                    playsInline
                    controlsList="nodownload"
                    preload="metadata"
                    onWaiting={() => setVideoLoading(true)}
                    onCanPlay={() => setVideoLoading(false)}
                    onLoadedData={() => setVideoLoading(false)}
                    onError={() => {
                      setVideoLoading(false);
                      setVideoError('Unable to play video stream. Please verify the video format or check back in a moment.');
                    }}
                    className="w-full h-full object-contain"
                  />
                ) : null}
              </div>
            ) : (
              <iframe
                src={embedUrl}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            )
          )}
        </div>

        {/* Feature 3: Interactive Video Engagement & Social Action Bar */}
        <div className="px-3 sm:px-6 py-2.5 bg-stone-900 border-b border-stone-800 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Like with real-time count */}
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                hasLiked
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-red-400 text-red-400' : ''}`} />
              <span className="tabular-nums">{likes} Likes</span>
            </button>

            {/* Bookmark */}
            <button
              type="button"
              onClick={handleBookmark}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                bookmarked
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-white' : ''}`} />
              <span>{bookmarked ? 'Saved' : 'Bookmark'}</span>
            </button>

            {/* Share */}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1 p-0.5 bg-stone-800/80 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'info' ? 'bg-stone-700 text-white font-semibold' : 'text-stone-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('comments')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                activeTab === 'comments' ? 'bg-stone-700 text-white font-semibold' : 'text-stone-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              <span>Comments ({comments.length})</span>
            </button>
          </div>
        </div>

        {copyNotice && (
          <div className="bg-amber-600 text-white text-xs py-1.5 px-4 text-center animate-in fade-in shrink-0">
            {copyNotice}
          </div>
        )}

        {/* Tab Content (Tablet-responsive scrollable area) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'info' ? (
            <div className="space-y-4">
              {/* Meta details */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    {video.durationMinutes} Minutes Technique
                  </span>
                  <span>·</span>
                  <span className="capitalize">{video.category}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-stone-400" />
                    {(video.viewCount || 100).toLocaleString()} views
                  </span>
                </div>

                {video.recipeId && onViewRecipe && (
                  <button
                    onClick={() => {
                      onViewRecipe(video.recipeId!);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-xs transition-colors"
                  >
                    View Ingredients & Recipe
                  </button>
                )}
              </div>

              {/* Video Description */}
              <div className="space-y-1">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-400">
                  Video Demonstration & Technique
                </h4>
                <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
                  {video.description}
                </p>
              </div>

              {/* Nutritional Information when available */}
              {video.nutritionInfo && (
                <div className="pt-2">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    <span>Estimated Nutritional Profile (Per Serving)</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {video.nutritionInfo.calories !== undefined && (
                      <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700/60 text-center">
                        <span className="text-[10px] uppercase text-stone-400 block">Calories</span>
                        <span className="text-base font-bold text-white tabular-nums">
                          {video.nutritionInfo.calories} <span className="text-[11px] font-normal text-stone-400">kcal</span>
                        </span>
                      </div>
                    )}
                    {video.nutritionInfo.protein && (
                      <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700/60 text-center">
                        <span className="text-[10px] uppercase text-stone-400 block">Protein</span>
                        <span className="text-base font-bold text-white tabular-nums">
                          {video.nutritionInfo.protein}
                        </span>
                      </div>
                    )}
                    {video.nutritionInfo.carbs && (
                      <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700/60 text-center">
                        <span className="text-[10px] uppercase text-stone-400 block">Carbs</span>
                        <span className="text-base font-bold text-white tabular-nums">
                          {video.nutritionInfo.carbs}
                        </span>
                      </div>
                    )}
                    {video.nutritionInfo.fat && (
                      <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700/60 text-center">
                        <span className="text-[10px] uppercase text-stone-400 block">Fats</span>
                        <span className="text-base font-bold text-white tabular-nums">
                          {video.nutritionInfo.fat}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Comments / Notes Tab */
            <div className="space-y-4">
              {/* Comment submission form */}
              <form onSubmit={handleSendComment} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder={currentUser ? "Share your thoughts or question for the chef..." : "Type your comment here. Click Send to post after signing in..."}
                    maxLength={500}
                    className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-2 text-xs text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={!commentInput.trim() || commentSubmitting}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
                {!currentUser && (
                  <p className="text-[11px] text-stone-400">
                    Guests can draft comments freely; clicking Send will open the sign-in modal and automatically publish your comment!
                  </p>
                )}
              </form>

              {/* Comments list */}
              <div className="space-y-3 pt-2">
                {comments.length === 0 ? (
                  <div className="text-center py-6 text-stone-500 text-xs">
                    No community comments on this tutorial yet. Be the first to ask a question!
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="p-3 bg-stone-800/60 rounded-xl border border-stone-700/60 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            src={c.userPhoto}
                            seed={c.userId || c.userName}
                            name={c.userName}
                            size="xs"
                            ring={false}
                          />
                          <span className="font-semibold text-stone-200">{c.userName}</span>
                        </div>
                        <span className="text-[10px] text-stone-400">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-stone-300 pl-7 leading-relaxed">
                        {c.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
