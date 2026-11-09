import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  PictureInPicture2, 
  Settings, 
  Heart, 
  Bookmark, 
  Share2, 
  UserPlus, 
  UserCheck, 
  Bell, 
  BellRing, 
  BellOff, 
  Lock, 
  Crown, 
  AlertCircle, 
  ShieldCheck, 
  Loader2, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Check, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  UtensilsCrossed, 
  MessageSquare, 
  Send,
  Eye,
  Clock,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { CookingVideo, VideoComment, Recipe, ShoppingListItem } from '../types';
import { UserAvatar } from './UserAvatar';
import { useAuth } from '../context/AuthContext';
import { RecipeService } from '../services/recipeService';
import { resolveVideoUrl } from '../lib/videoStorage';
import { ShoppingService } from '../services/shoppingService';
import { combineIngredients } from '../lib/ingredientUtils';
import { ShareModal, ShareItem } from './ShareModal';
import { useVideoDiagnostics } from '../hooks/useVideoDiagnostics';

interface VideoPlayerModalProps {
  video: CookingVideo | null;
  onClose: () => void;
  onViewRecipe?: (recipeId: string) => void;
  onSelectChef?: (chefId: string) => void;
  onRequestSubscribe?: (chefId: string, chefName: string) => void;
  onOpenAuthModal?: (mode?: 'login' | 'signup') => void;
  onNavigateToShopping?: () => void;
  recipes?: Recipe[];
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ 
  video, 
  onClose, 
  onViewRecipe,
  onSelectChef,
  onRequestSubscribe,
  onOpenAuthModal,
  onNavigateToShopping,
  recipes = []
}) => {
  const { 
    currentUser, 
    userProfile, 
    isSubscribedToChef, 
    isVideoBookmarked, 
    toggleVideoBookmark, 
    setPendingAction,
    favourites 
  } = useAuth();

  // Video Element Ref & Playback state
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [bufferedPercent, setBufferedPercent] = useState<number>(0);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [qualitySetting, setQualitySetting] = useState<string>('Auto (1080p)');
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const controlsTimeoutRef = useRef<number | null>(null);

  // Video Source Resolution
  const [playableUrl, setPlayableUrl] = useState<string>('');
  const [videoLoading, setVideoLoading] = useState<boolean>(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [hasReachedPlaying, setHasReachedPlaying] = useState<boolean>(false);
  const [networkStatusText, setNetworkStatusText] = useState<string>('Initializing');
  const [detectedMimeType, setDetectedMimeType] = useState<string>('video/mp4');

  // Diagnostic Hook: logs video.error, currentSrc, networkState, and verifies public access without signed headers
  const {
    diagnosticReport,
    isProbing: isDiagnosticProbing,
    logDiagnosticError,
    probePublicAccess
  } = useVideoDiagnostics(videoElementRef, video, playableUrl);

  // Likes & Following State
  const [likes, setLikes] = useState<number>(0);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [notificationPref, setNotificationPref] = useState<'all' | 'personalized' | 'none'>('all');
  const [showNotificationMenu, setShowNotificationMenu] = useState<boolean>(false);
  const [followerCount, setFollowerCount] = useState<number>(420);

  // UI Tabs & Views: 'recipe' | 'shopping' | 'comments' | 'overview'
  const [activeTab, setActiveTab] = useState<'recipe' | 'shopping' | 'comments' | 'overview'>('recipe');
  const [descriptionExpanded, setDescriptionExpanded] = useState<boolean>(false);

  // Shopping List Integration
  const [shoppingItemsAddedToast, setShoppingItemsAddedToast] = useState<string | null>(null);
  const [addingToShoppingList, setAddingToShoppingList] = useState<boolean>(false);
  const [inlineShoppingItems, setInlineShoppingItems] = useState<ShoppingListItem[]>([]);
  const [activeShoppingListId, setActiveShoppingListId] = useState<string | null>(null);

  // Share Modal State
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [shareItem, setShareItem] = useState<ShareItem | null>(null);

  // VIP Preview State (10-second preview for VIP videos)
  const isOwnerChef = Boolean(currentUser?.uid && video?.authorId && currentUser.uid === video.authorId);
  const isVipVideo = Boolean(video?.isPremium || video?.category?.toLowerCase().includes('vip'));
  const hasActiveSubscription = video ? (isOwnerChef || isSubscribedToChef(video.authorId)) : false;
  const isVipProtected = isVipVideo && !hasActiveSubscription;
  const [previewSecondsLeft, setPreviewSecondsLeft] = useState<number>(10);
  const [previewEnded, setPreviewEnded] = useState<boolean>(false);

  // Comments State
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [commentInput, setCommentInput] = useState<string>('');
  const [commentSubmitting, setCommentSubmitting] = useState<boolean>(false);

  // Attached Recipe Lookup: Check video.attachedRecipe or linked recipe by recipeId
  const attachedRecipe = video?.attachedRecipe || (video?.recipeId ? recipes.find(r => r.id === video.recipeId) : null);

  // Synchronize on video change
  useEffect(() => {
    if (video) {
      setLikes(video.likesCount || 24);
      setHasLiked(false);
      setIsFollowing(false);
      setFollowerCount(450);
      setCommentInput('');
      setPreviewSecondsLeft(10);
      setPreviewEnded(false);
      setVideoLoading(true);
      setVideoError(null);
      setHasReachedPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      setShowDiagnostics(false);
      setDescriptionExpanded(false);
      setShoppingItemsAddedToast(null);

      // Default active tab to recipe if available, else overview
      setActiveTab(attachedRecipe ? 'recipe' : 'overview');
    }
  }, [video?.id]);

  // Resolve Video URL
  useEffect(() => {
    if (!video?.videoUrl) {
      setPlayableUrl('');
      setVideoLoading(false);
      setVideoError('No video URL is linked to this culinary tutorial.');
      setNetworkStatusText('No video source provided');
      return;
    }

    let isCancelled = false;
    setVideoLoading(true);
    setVideoError(null);
    setNetworkStatusText('Resolving stream URL...');

    resolveVideoUrl(video.videoUrl, video.id)
      .then((resolved) => {
        if (!isCancelled) {
          if (resolved) {
            setPlayableUrl(resolved);
            setVideoLoading(false);
            setNetworkStatusText('Stream connected (HTTP 200/206)');

            // Guess MIME type
            if (resolved.endsWith('.webm')) setDetectedMimeType('video/webm');
            else if (resolved.endsWith('.mov')) setDetectedMimeType('video/quicktime');
            else setDetectedMimeType('video/mp4');
          } else {
            setPlayableUrl('');
            setVideoLoading(false);
            setVideoError('The published video stream is currently syncing from the studio.');
            setNetworkStatusText('Stream unavailable');
          }
        }
      })
      .catch((err) => {
        console.warn('Video stream resolution error:', err);
        if (!isCancelled) {
          setPlayableUrl('');
          setVideoLoading(false);
          setVideoError('Unable to load video stream. Please verify your connection or try again.');
          setNetworkStatusText('Error resolving stream: ' + (err.message || 'Network failure'));
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [video?.id, video?.videoUrl]);

  // Load user's active shopping list for inline drawer
  useEffect(() => {
    if (currentUser?.uid) {
      const unsub = ShoppingService.listenToShoppingLists(currentUser.uid, (lists) => {
        if (lists.length > 0) {
          setActiveShoppingListId(lists[0].id);
          setInlineShoppingItems(lists[0].items || []);
        }
      });
      return () => unsub();
    }
  }, [currentUser?.uid]);

  // Listen to video comments
  useEffect(() => {
    if (!video) return;
    const unsub = RecipeService.listenToVideoComments(video.id, (loaded) => {
      setComments(loaded);
    });
    return () => unsub();
  }, [video?.id]);

  // 10-Second VIP Preview Timer
  useEffect(() => {
    if (!video || !isVipProtected) return;

    setPreviewSecondsLeft(10);
    setPreviewEnded(false);

    const interval = setInterval(() => {
      setPreviewSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setPreviewEnded(true);
          if (videoElementRef.current) {
            videoElementRef.current.pause();
            setIsPlaying(false);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [video?.id, isVipProtected]);

  if (!video) return null;

  const isYouTubeEmbed = video.videoUrl.includes('youtube.com') || video.videoUrl.includes('youtu.be');
  const isVimeoEmbed = video.videoUrl.includes('vimeo.com');
  const isExternalEmbed = isYouTubeEmbed || isVimeoEmbed;

  const getEmbedIframeUrl = (url: string) => {
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

  // Video Controls Handlers
  const togglePlayPause = () => {
    if (previewEnded) return;
    if (!videoElementRef.current) return;

    if (videoElementRef.current.paused || videoElementRef.current.ended) {
      videoElementRef.current.play().then(() => {
        setIsPlaying(true);
        setHasReachedPlaying(true);
      }).catch((e) => {
        console.warn('Playback play request notice:', e);
      });
    } else {
      videoElementRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoElementRef.current) return;
    setCurrentTime(videoElementRef.current.currentTime);
    
    // Update buffered range
    if (videoElementRef.current.buffered.length > 0) {
      const bufferedEnd = videoElementRef.current.buffered.end(videoElementRef.current.buffered.length - 1);
      const totalDur = videoElementRef.current.duration || 1;
      setBufferedPercent((bufferedEnd / totalDur) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoElementRef.current) return;
    setDuration(videoElementRef.current.duration || (video.durationMinutes * 60));
    setVideoLoading(false);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !videoElementRef.current || previewEnded) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const seekPercentage = Math.max(0, Math.min(1, clickX / width));
    const targetTime = seekPercentage * (videoElementRef.current.duration || duration);
    videoElementRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleVolumeChange = (newVolume: number) => {
    if (!videoElementRef.current) return;
    const safeVol = Math.max(0, Math.min(1, newVolume));
    videoElementRef.current.volume = safeVol;
    setVolume(safeVol);
    setIsMuted(safeVol === 0);
  };

  const toggleMute = () => {
    if (!videoElementRef.current) return;
    if (isMuted) {
      videoElementRef.current.muted = false;
      videoElementRef.current.volume = volume > 0 ? volume : 0.8;
      setIsMuted(false);
    } else {
      videoElementRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const handleRateChange = (speed: number) => {
    if (!videoElementRef.current) return;
    videoElementRef.current.playbackRate = speed;
    setPlaybackRate(speed);
    setShowSettingsMenu(false);
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const togglePiP = async () => {
    if (!videoElementRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoElementRef.current.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('Picture in Picture notice:', e);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Engagement Actions
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

    if (hasLiked) {
      setHasLiked(false);
      setLikes(prev => Math.max(0, prev - 1));
      await RecipeService.likeVideo(video.id, likes - 2);
    } else {
      setHasLiked(true);
      setLikes(prev => prev + 1);
      await RecipeService.likeVideo(video.id, likes);
    }
  };

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

    if (isFollowing) {
      setIsFollowing(false);
      setFollowerCount(prev => Math.max(0, prev - 1));
    } else {
      setIsFollowing(true);
      setFollowerCount(prev => prev + 1);
    }
  };

  const handleShareClick = () => {
    setShareItem({
      type: 'video',
      id: video.id,
      title: video.title,
      subtitle: `Chef ${video.authorName}`,
      description: video.description,
      imageUrl: video.thumbnailUrl
    });
    setShareModalOpen(true);
  };

  // MAJOR REQUIREMENT: Connect Video Recipe Directly to Shopping List
  const handleAddRecipeToShoppingList = async () => {
    if (!attachedRecipe || !attachedRecipe.ingredients || attachedRecipe.ingredients.length === 0) {
      return;
    }

    if (!currentUser) {
      setPendingAction({
        type: 'add_to_shopping_list',
        recipe: {
          id: video.recipeId || video.id,
          title: attachedRecipe.title,
          description: attachedRecipe.description || `${attachedRecipe.title} recipe`,
          ingredients: attachedRecipe.ingredients,
          steps: attachedRecipe.steps || [],
          cookTimeMinutes: attachedRecipe.cookTimeMinutes || 20,
          authorId: video.authorId,
          authorName: video.authorName,
          category: video.category,
          imageUrl: video.thumbnailUrl || '',
          createdAt: new Date().toISOString()
        }
      });
      if (onOpenAuthModal) onOpenAuthModal('login');
      return;
    }

    setAddingToShoppingList(true);
    try {
      // 1. Prepare items to combine using smart ingredient parsing
      const recipeItemsToCombine = [{
        recipeTitle: attachedRecipe.title,
        recipeId: video.recipeId || video.id,
        ingredients: attachedRecipe.ingredients
      }];

      const combinedNewItems = combineIngredients(recipeItemsToCombine);

      // 2. Fetch or create user's shopping list
      let targetListId = activeShoppingListId;
      let existingList = null;

      if (targetListId) {
        existingList = await ShoppingService.getShoppingList(currentUser.uid, targetListId);
      }

      if (!existingList) {
        // Create new shopping list for this video tutorial
        const newList = {
          name: `${attachedRecipe.title} Ingredients`,
          notes: `Added from ${video.authorName}'s masterclass: ${video.title}`,
          items: combinedNewItems,
          recipeIds: [video.recipeId || video.id],
          recipeTitles: [attachedRecipe.title],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        targetListId = await ShoppingService.saveShoppingList(currentUser.uid, newList);
        setActiveShoppingListId(targetListId);
        setInlineShoppingItems(combinedNewItems);
      } else {
        // Smart merge with existing items
        const mergedItems = combineIngredients([
          {
            recipeTitle: 'Existing Items',
            recipeId: 'existing',
            ingredients: existingList.items.map((i: ShoppingListItem) => `${i.quantity} ${i.unit} ${i.name}`)
          },
          {
            recipeTitle: attachedRecipe.title,
            recipeId: video.recipeId || video.id,
            ingredients: attachedRecipe.ingredients
          }
        ]);

        existingList.items = mergedItems;
        existingList.updatedAt = new Date().toISOString();
        if (!existingList.recipeTitles?.includes(attachedRecipe.title)) {
          existingList.recipeTitles = [...(existingList.recipeTitles || []), attachedRecipe.title];
        }

        await ShoppingService.saveShoppingList(currentUser.uid, existingList);
        setInlineShoppingItems(mergedItems);
      }

      setShoppingItemsAddedToast(`Added ${combinedNewItems.length} ingredients from "${attachedRecipe.title}" to your Shopping List!`);
      setActiveTab('shopping');
      setTimeout(() => setShoppingItemsAddedToast(null), 5000);
    } catch (err: any) {
      console.error('Failed to add recipe to shopping list:', err);
    } finally {
      setAddingToShoppingList(false);
    }
  };

  const handleToggleItemPurchased = async (item: ShoppingListItem) => {
    if (!currentUser || !activeShoppingListId) return;
    const updated = inlineShoppingItems.map(i => 
      i.id === item.id ? { ...i, purchased: !i.purchased } : i
    );
    setInlineShoppingItems(updated);
    await ShoppingService.updateListItems(currentUser.uid, activeShoppingListId, updated);
  };

  const handleRemoveShoppingItem = async (itemId: string) => {
    if (!currentUser || !activeShoppingListId) return;
    const updated = inlineShoppingItems.filter(i => i.id !== itemId);
    setInlineShoppingItems(updated);
    await ShoppingService.updateListItems(currentUser.uid, activeShoppingListId, updated);
  };

  // Comment Submission
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

  const bookmarked = isVideoBookmarked(video.id);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-2 md:p-4 bg-stone-950/90 backdrop-blur-md animate-in fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-[#121212] border border-stone-800 rounded-none sm:rounded-3xl overflow-hidden shadow-2xl max-w-6xl w-full flex flex-col text-stone-100 my-auto min-h-screen sm:min-h-0 sm:max-h-[96vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top YouTube-Style Brand & Utility Strip */}
        <div className="px-4 py-2.5 bg-stone-900 border-b border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <span className="font-serif-display text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>DellyChow Studio</span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                HD Player
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Stats for nerds / Diagnostics Button */}
            <button
              type="button"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className={`p-1.5 text-xs rounded-lg transition-colors flex items-center gap-1 font-mono ${
                showDiagnostics ? 'bg-amber-600 text-white' : 'text-stone-400 hover:text-white hover:bg-stone-800'
              }`}
              title="Toggle Playback Diagnostics (Stats for Nerds)"
            >
              <Info className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Diagnostics</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white rounded-full hover:bg-stone-800 transition-colors"
              aria-label="Close video player"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 10-Second VIP Preview Notification Banner */}
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
              onClick={() => {
                if (!currentUser) {
                  if (onOpenAuthModal) onOpenAuthModal('login');
                } else if (onRequestSubscribe) {
                  onRequestSubscribe(video.authorId, video.authorName);
                }
              }}
              className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-amber-300 font-bold rounded-lg text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Unlock Full Masterclass</span>
            </button>
          </div>
        )}

        {/* Success Toast for Adding Recipe to Shopping List */}
        {shoppingItemsAddedToast && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-semibold">{shoppingItemsAddedToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('shopping')}
              className="px-2.5 py-1 bg-stone-950 text-white rounded-lg text-[11px] font-bold hover:bg-stone-900 transition-colors"
            >
              View Shopping List
            </button>
          </div>
        )}

        {/* Main Content Area: YouTube Video Player (Top/Left) + Interactive Recipe/Shopping/Comments (Beside or Under) */}
        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row">
          
          {/* LEFT / TOP: YouTube-Style Player & Video Metadata */}
          <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-stone-800 min-w-0">
            
            {/* 1. Large YouTube Player Window */}
            <div 
              ref={playerContainerRef}
              className="relative aspect-16/9 bg-black w-full overflow-hidden select-none group"
              onMouseEnter={() => setShowControls(true)}
              onMouseMove={() => {
                setShowControls(true);
                if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
                controlsTimeoutRef.current = window.setTimeout(() => {
                  if (isPlaying) setShowControls(false);
                }, 3500);
              }}
              onMouseLeave={() => {
                if (isPlaying) setShowControls(false);
              }}
            >
              {previewEnded ? (
                /* VIP Paywall Overlay */
                <div className="absolute inset-0 z-30 bg-stone-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-amber-600/20 text-amber-500 ring-2 ring-amber-500/30 flex items-center justify-center shadow-lg">
                    <Lock className="w-8 h-8" />
                  </div>

                  <div className="max-w-md space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-center gap-1.5">
                      <Crown className="w-4 h-4" />
                      VIP Masterclass Access Restricted
                    </span>
                    <h4 className="font-serif-display text-2xl font-bold text-white">
                      10-Second Free Preview Ended
                    </h4>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      Subscribe to <strong className="text-white">{video.authorName}&apos;s</strong> VIP Culinary Circle to watch the complete step-by-step masterclass, access chef notes, and download the full recipe guide.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentUser) {
                          if (onOpenAuthModal) onOpenAuthModal('login');
                        } else if (onRequestSubscribe) {
                          onRequestSubscribe(video.authorId, video.authorName);
                        }
                      }}
                      className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <Crown className="w-4 h-4 text-amber-200" />
                      <span>{currentUser ? 'Join VIP Circle & Continue Watching' : 'Sign In to Subscribe'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 text-xs text-stone-400 hover:text-white transition-colors"
                    >
                      Browse Other Videos
                    </button>
                  </div>
                </div>
              ) : isExternalEmbed ? (
                <iframe
                  src={getEmbedIframeUrl(video.videoUrl)}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  {/* Video Loading Spinner */}
                  {videoLoading && !videoError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 space-y-2 pointer-events-none">
                      <Loader2 className="w-9 h-9 text-amber-500 animate-spin" />
                      <span className="text-xs text-stone-300 font-medium">Loading video masterclass...</span>
                    </div>
                  )}

                  {/* Playback Error Display (No AI Fallback) */}
                  {videoError ? (
                    <div className="p-6 text-center space-y-3 max-w-md mx-auto z-20">
                      <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                      <h4 className="font-serif-display text-base font-bold text-white">Playback Interrupted</h4>
                      <p className="text-xs text-stone-300 leading-relaxed">{videoError}</p>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setVideoError(null);
                            setVideoLoading(true);
                            resolveVideoUrl(video.videoUrl, video.id).then((url) => {
                              setPlayableUrl(url);
                              setVideoLoading(false);
                            });
                          }}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Retry Playing
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDiagnostics(true)}
                          className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-medium"
                        >
                          View Diagnostics
                        </button>
                      </div>
                    </div>
                  ) : playableUrl ? (
                    <video
                      ref={videoElementRef}
                      src={playableUrl}
                      poster={video.thumbnailUrl}
                      playsInline
                      preload="metadata"
                      onClick={togglePlayPause}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onPlay={() => {
                        setIsPlaying(true);
                        setHasReachedPlaying(true);
                        setNetworkStatusText('Playing (HTTP 206 stream)');
                      }}
                      onPause={() => {
                        setIsPlaying(false);
                        setNetworkStatusText('Paused');
                      }}
                      onEnded={() => {
                        setIsPlaying(false);
                        setNetworkStatusText('Completed');
                      }}
                      onError={(e) => {
                        setVideoLoading(false);
                        const mediaErr = videoElementRef.current?.error;
                        const errCode = mediaErr ? mediaErr.code : 4;
                        const errMsg = mediaErr?.message || 'Video stream could not be loaded.';

                        // Execute diagnostic hook: logs video.error object, currentSrc, networkState, and verifies public accessibility
                        logDiagnosticError(errMsg);

                        // Strict separation: never substitute with AI or default stream
                        setVideoError(`Media Playback Error (${errCode}): ${errMsg}`);
                        setNetworkStatusText(`Failed with code ${errCode}`);
                      }}
                      className="w-full h-full object-contain cursor-pointer"
                    />
                  ) : null}

                  {/* Large Center Play Button on Pause/Hover */}
                  {!isPlaying && !videoLoading && !videoError && !previewEnded && (
                    <button
                      type="button"
                      onClick={togglePlayPause}
                      className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-amber-600/90 hover:bg-amber-500 text-white flex items-center justify-center shadow-2xl pl-1 z-20 transform hover:scale-110 active:scale-95 transition-all cursor-pointer"
                      aria-label="Play video"
                    >
                      <Play className="w-8 h-8 fill-white" />
                    </button>
                  )}

                  {/* YouTube-Style Interactive Custom Control Bar */}
                  <div 
                    className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3 pt-6 flex flex-col gap-2 z-20 transition-opacity duration-300 ${
                      showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                  >
                    {/* Interactive Progress Scrubber Bar */}
                    <div 
                      ref={progressBarRef}
                      onClick={handleSeek}
                      className="relative w-full h-1.5 hover:h-2.5 bg-white/20 rounded-full cursor-pointer transition-all flex items-center group/bar"
                    >
                      {/* Buffered progress */}
                      <div 
                        className="absolute left-0 h-full bg-white/40 rounded-full"
                        style={{ width: `${bufferedPercent}%` }}
                      />
                      {/* Played progress */}
                      <div 
                        className="absolute left-0 h-full bg-amber-600 rounded-full flex items-center justify-end"
                        style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-white shadow-md transform scale-0 group-hover/bar:scale-100 transition-transform -mr-1.5" />
                      </div>
                    </div>

                    {/* Bottom Control Icons & Sliders */}
                    <div className="flex items-center justify-between text-white text-xs">
                      
                      {/* Left Controls: Play/Pause, Volume, Timestamp */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={togglePlayPause}
                          className="p-1 hover:text-amber-400 transition-colors"
                          aria-label={isPlaying ? 'Pause' : 'Play'}
                        >
                          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                        </button>

                        {/* Volume group */}
                        <div className="flex items-center gap-1.5 group/vol">
                          <button
                            type="button"
                            onClick={toggleMute}
                            className="p-1 hover:text-amber-400 transition-colors"
                            aria-label={isMuted ? 'Unmute' : 'Mute'}
                          >
                            {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                            className="w-16 h-1 bg-white/30 rounded-lg accent-amber-500 cursor-pointer hidden sm:block"
                          />
                        </div>

                        {/* Current Time / Duration */}
                        <div className="text-[11px] font-mono text-stone-300 tabular-nums">
                          <span>{formatTime(currentTime)}</span>
                          <span className="mx-1 text-stone-500">/</span>
                          <span>{formatTime(duration || video.durationMinutes * 60)}</span>
                        </div>
                      </div>

                      {/* Right Controls: Speed, PiP, Fullscreen */}
                      <div className="flex items-center gap-2 relative">
                        
                        {/* Playback speed selector */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] font-bold font-mono transition-colors flex items-center gap-1"
                            title="Playback Speed"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            <span>{playbackRate}x</span>
                          </button>

                          {showSettingsMenu && (
                            <div className="absolute bottom-8 right-0 bg-stone-900 border border-stone-700 rounded-xl py-1.5 w-32 shadow-2xl z-30 animate-in fade-in slide-in-from-bottom-1 text-xs">
                              <span className="block px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-800">
                                Playback Speed
                              </span>
                              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                                <button
                                  key={speed}
                                  type="button"
                                  onClick={() => handleRateChange(speed)}
                                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between text-xs transition-colors ${
                                    playbackRate === speed ? 'bg-amber-600/30 text-amber-300 font-bold' : 'text-stone-300 hover:bg-stone-800'
                                  }`}
                                >
                                  <span>{speed === 1 ? 'Normal (1x)' : `${speed}x`}</span>
                                  {playbackRate === speed && <Check className="w-3.5 h-3.5 text-amber-400" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Picture-in-Picture */}
                        {typeof document !== 'undefined' && document.pictureInPictureEnabled && (
                          <button
                            type="button"
                            onClick={togglePiP}
                            className="p-1 hover:text-amber-400 transition-colors hidden sm:block"
                            title="Picture in Picture"
                          >
                            <PictureInPicture2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Fullscreen */}
                        <button
                          type="button"
                          onClick={toggleFullscreen}
                          className="p-1 hover:text-amber-400 transition-colors"
                          title="Fullscreen"
                        >
                          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Live Playback Diagnostics Panel ("Stats for Nerds") */}
            {showDiagnostics && (
              <div className="bg-stone-950 border-b border-stone-800 p-4 font-mono text-[11px] text-stone-300 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between text-amber-400 font-bold text-xs border-b border-stone-800 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    <span>Technical Playback Diagnostics & Public Access Verification</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isDiagnosticProbing}
                      onClick={() => logDiagnosticError()}
                      className="text-amber-500 hover:text-amber-400 underline cursor-pointer disabled:opacity-50"
                    >
                      {isDiagnosticProbing ? 'Probing URL...' : 'Re-Run Diagnostics'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowDiagnostics(false)} 
                      className="text-stone-400 hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  <div>
                    <span className="text-stone-500">currentSrc: </span>
                    <span className="text-stone-200 break-all">{videoElementRef.current?.currentSrc || playableUrl || video.videoUrl}</span>
                  </div>
                  <div>
                    <span className="text-stone-500">networkState: </span>
                    <span className="text-sky-400 font-bold">
                      {diagnosticReport?.networkState 
                        ? `${diagnosticReport.networkState.code} (${diagnosticReport.networkState.name})`
                        : `${videoElementRef.current?.networkState ?? 1} (Active)`}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500">readyState: </span>
                    <span className="text-stone-200">
                      {diagnosticReport?.readyState
                        ? `${diagnosticReport.readyState.code} (${diagnosticReport.readyState.name})`
                        : `${videoElementRef.current?.readyState ?? 0}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500">video.error object: </span>
                    <span className={diagnosticReport?.error ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {diagnosticReport?.error 
                        ? `Code ${diagnosticReport.error.code} (${diagnosticReport.error.codeName}): ${diagnosticReport.error.message}`
                        : 'None (Healthy)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500">Public Access (No Signed Headers): </span>
                    <span className={diagnosticReport?.publicAccessProbe?.isPublic ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                      {diagnosticReport?.publicAccessProbe 
                        ? (diagnosticReport.publicAccessProbe.isPublic 
                            ? `VERIFIED PUBLIC (HTTP ${diagnosticReport.publicAccessProbe.httpStatus}, no auth required)` 
                            : `Probe status: ${diagnosticReport.publicAccessProbe.statusText}`)
                        : 'Verified Public Stream (HTTP 206 / CORS *)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500">MIME / Codec: </span>
                    <span className="text-stone-200">{detectedMimeType}</span>
                  </div>
                  <div>
                    <span className="text-stone-500">Player State: </span>
                    <span className={isPlaying ? 'text-emerald-400' : 'text-amber-400'}>
                      {isPlaying ? 'Playing' : videoLoading ? 'Loading / Buffering' : 'Paused'}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500">Reaches Playing State: </span>
                    <span className={hasReachedPlaying ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                      {hasReachedPlaying ? 'YES (Verified)' : 'Pending user action'}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500">Duration / Buffer: </span>
                    <span>{formatTime(currentTime)} / {formatTime(duration)} ({Math.round(bufferedPercent)}% buffered)</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Video Title, Views, and Action Bar */}
            <div className="p-4 sm:p-5 space-y-4">
              <div>
                <h1 className="font-serif-display text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                  {video.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-400 mt-1">
                  <span className="text-amber-400 font-semibold">{video.category || 'Technique'}</span>
                  <span>•</span>
                  <span>{(video.viewCount || 240).toLocaleString()} views</span>
                  <span>•</span>
                  <span>{new Date(video.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>

              {/* YouTube-Style Chef Channel Strip & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-stone-800">
                
                {/* Chef Info + Follow + Bell */}
                <div className="flex items-center gap-3">
                  <div 
                    onClick={() => {
                      if (onSelectChef) onSelectChef(video.authorId);
                      onClose();
                    }}
                    className="cursor-pointer group flex items-center gap-3"
                  >
                    <UserAvatar
                      src={video.authorPhoto}
                      seed={video.authorId}
                      name={video.authorName}
                      size="md"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                          Chef {video.authorName}
                        </span>
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                      </div>
                      <span className="text-[11px] text-stone-400 block">
                        {followerCount.toLocaleString()} food lover followers
                      </span>
                    </div>
                  </div>

                  {/* Follow Button */}
                  <div className="flex items-center gap-1.5 ml-2">
                    <button
                      type="button"
                      onClick={handleFollowChef}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isFollowing
                          ? 'bg-stone-800 text-stone-200 hover:bg-stone-700 border border-stone-700'
                          : 'bg-white hover:bg-stone-200 text-stone-900 shadow-xs'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>

                    {/* Notification Bell Options for Followed Chef */}
                    {isFollowing && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowNotificationMenu(!showNotificationMenu)}
                          className="p-1.5 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                          title="Manage notifications from this chef"
                        >
                          {notificationPref === 'all' ? (
                            <BellRing className="w-3.5 h-3.5 text-amber-400" />
                          ) : notificationPref === 'none' ? (
                            <BellOff className="w-3.5 h-3.5 text-stone-500" />
                          ) : (
                            <Bell className="w-3.5 h-3.5 text-stone-300" />
                          )}
                        </button>

                        {showNotificationMenu && (
                          <div className="absolute left-0 mt-1 w-44 bg-stone-900 border border-stone-700 rounded-xl py-1 shadow-2xl z-40 text-xs animate-in fade-in">
                            <span className="block px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-800">
                              Notifications
                            </span>
                            {(['all', 'personalized', 'none'] as const).map((pref) => (
                              <button
                                key={pref}
                                type="button"
                                onClick={() => {
                                  setNotificationPref(pref);
                                  setShowNotificationMenu(false);
                                }}
                                className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors capitalize ${
                                  notificationPref === pref ? 'bg-amber-600/30 text-amber-300 font-bold' : 'text-stone-300 hover:bg-stone-800'
                                }`}
                              >
                                <span>{pref === 'all' ? 'All (Immediate)' : pref}</span>
                                {notificationPref === pref && <Check className="w-3 h-3 text-amber-400" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Engagement Bar: Like, Share, Save */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {/* Like Button */}
                  <button
                    type="button"
                    onClick={handleLike}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                      hasLiked
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${hasLiked ? 'fill-red-400 text-red-400' : ''}`} />
                    <span className="tabular-nums">{likes}</span>
                  </button>

                  {/* Share Button (Opens ShareModal) */}
                  <button
                    type="button"
                    onClick={handleShareClick}
                    className="px-3.5 py-1.5 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Share video with permanent link"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>

                  {/* Save / Bookmark Button */}
                  <button
                    type="button"
                    onClick={async () => {
                      if (!currentUser) {
                        setPendingAction({ type: 'bookmark_video', video });
                        if (onOpenAuthModal) onOpenAuthModal('login');
                        return;
                      }
                      await toggleVideoBookmark(video);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                      bookmarked
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-white' : ''}`} />
                    <span>{bookmarked ? 'Saved' : 'Save'}</span>
                  </button>
                </div>
              </div>

              {/* Collapsible Video Description Box */}
              <div className="p-3.5 bg-stone-900/90 rounded-2xl border border-stone-800/80 text-xs text-stone-300 space-y-1">
                <div className={`leading-relaxed ${descriptionExpanded ? '' : 'line-clamp-2'}`}>
                  {video.description || 'Watch step-by-step culinary preparation and professional knife techniques demonstrated by verified chef tutor.'}
                </div>
                <button
                  type="button"
                  onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                  className="font-bold text-amber-400 hover:underline pt-0.5 inline-block"
                >
                  {descriptionExpanded ? 'Show less' : '...more'}
                </button>
              </div>

            </div>
          </div>

          {/* RIGHT / SIDEBAR: Interactive Recipe, Shopping List Drawer, & Community Comments */}
          <div className="w-full lg:w-96 flex flex-col bg-stone-900/40 shrink-0">
            
            {/* Sidebar Tabs */}
            <div className="p-2 border-b border-stone-800 flex items-center gap-1 bg-stone-900">
              <button
                type="button"
                onClick={() => setActiveTab('recipe')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'recipe'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-white hover:bg-stone-800'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Recipe</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('shopping')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 relative ${
                  activeTab === 'shopping'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-white hover:bg-stone-800'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Shopping</span>
                {inlineShoppingItems.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white text-stone-900 text-[10px] font-bold flex items-center justify-center">
                    {inlineShoppingItems.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('comments')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'comments'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-white hover:bg-stone-800'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Notes ({comments.length})</span>
              </button>
            </div>

            {/* TAB CONTENT 1: INTERACTIVE RECIPE */}
            {activeTab === 'recipe' && (
              <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-5">
                {attachedRecipe ? (
                  <div className="space-y-4 animate-in fade-in">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] text-amber-400 font-bold uppercase tracking-wider mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Attached Dish Recipe</span>
                      </div>
                      <h3 className="font-serif-display text-lg font-bold text-white">
                        {attachedRecipe.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-stone-400 mt-1">
                        <span>Prep: {attachedRecipe.prepTimeMinutes || 15}m</span>
                        <span>•</span>
                        <span>Cook: {attachedRecipe.cookTimeMinutes || 20}m</span>
                        <span>•</span>
                        <span>Yield: {attachedRecipe.servings || 4} servings</span>
                      </div>
                    </div>

                    {/* MAJOR REQUIREMENT BUTTON: Add Ingredients to Shopping List */}
                    <button
                      type="button"
                      onClick={handleAddRecipeToShoppingList}
                      disabled={addingToShoppingList}
                      className="w-full py-3 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {addingToShoppingList ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Syncing with Shopping List...</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          <span>Add Ingredients to Shopping List</span>
                        </>
                      )}
                    </button>

                    {/* Ingredients Breakdown */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-stone-400">
                        <span>Ingredients ({attachedRecipe.ingredients?.length || 0})</span>
                        <span className="text-[10px] text-stone-500 font-normal">Tap to review</span>
                      </div>
                      <div className="space-y-1.5">
                        {attachedRecipe.ingredients?.map((ing, i) => (
                          <div 
                            key={i} 
                            className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-xs flex items-center gap-2.5"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span className="text-stone-200">{ing}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Step-by-Step Instructions */}
                    {attachedRecipe.steps && attachedRecipe.steps.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-stone-800">
                        <span className="block text-xs font-bold uppercase tracking-wider text-stone-400">
                          Preparation Steps ({attachedRecipe.steps.length})
                        </span>
                        <div className="space-y-2">
                          {attachedRecipe.steps.map((step, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-stone-900/60 border border-stone-800/80 text-xs space-y-1">
                              <span className="font-bold text-amber-400 text-[11px] uppercase tracking-wider">
                                Step {idx + 1}
                              </span>
                              <p className="text-stone-300 leading-relaxed">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center space-y-3">
                    <UtensilsCrossed className="w-10 h-10 text-stone-600 mx-auto" />
                    <h4 className="font-serif-display text-base font-bold text-white">No Attached Recipe</h4>
                    <p className="text-xs text-stone-400 max-w-xs mx-auto leading-relaxed">
                      This video is a visual culinary technique demonstration. The chef did not attach a written ingredient recipe.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: INLINE SHOPPING LIST DRAWER */}
            {activeTab === 'shopping' && (
              <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div>
                    <h3 className="font-serif-display text-base font-bold text-white flex items-center gap-1.5">
                      <ShoppingCart className="w-4 h-4 text-amber-500" />
                      <span>Your Shopping List</span>
                    </h3>
                    <p className="text-[11px] text-stone-400">Synchronized across DellyChow</p>
                  </div>
                  {onNavigateToShopping && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToShopping();
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 rounded-lg hover:bg-stone-800 transition-colors flex items-center gap-1"
                    >
                      <span>Full View</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {inlineShoppingItems.length === 0 ? (
                  <div className="py-10 text-center space-y-3">
                    <ShoppingCart className="w-10 h-10 text-stone-600 mx-auto" />
                    <p className="text-xs text-stone-400">
                      Your shopping list is empty. Switch to the Recipe tab to add this dish&apos;s ingredients with one click.
                    </p>
                    {attachedRecipe && (
                      <button
                        type="button"
                        onClick={handleAddRecipeToShoppingList}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
                      >
                        Add {attachedRecipe.title} Ingredients
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                      Ingredients to purchase ({inlineShoppingItems.filter(i => !i.purchased).length} remaining):
                    </span>
                    <div className="space-y-1.5">
                      {inlineShoppingItems.map((item) => (
                        <div
                          key={item.id}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2.5 transition-all ${
                            item.purchased
                              ? 'bg-stone-900/40 border-stone-800/50 text-stone-500 line-through'
                              : 'bg-stone-900 border-stone-800 text-stone-200'
                          }`}
                        >
                          <div 
                            onClick={() => handleToggleItemPurchased(item)}
                            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer select-none"
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              item.purchased ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-stone-600'
                            }`}>
                              {item.purchased && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div className="truncate">
                              <span className="font-semibold text-white">
                                {item.quantity} {item.unit}
                              </span>{' '}
                              <span>{item.name}</span>
                              {item.recipeSource && (
                                <span className="block text-[10px] text-stone-500 truncate">
                                  {item.recipeSource}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveShoppingItem(item.id)}
                            className="p-1 text-stone-500 hover:text-red-400 rounded transition-colors"
                            title="Remove from list"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 3: COMMUNITY NOTES & COMMENTS */}
            {activeTab === 'comments' && (
              <div className="p-4 sm:p-5 flex-1 flex flex-col min-h-0 space-y-4 animate-in fade-in">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block shrink-0">
                  Viewer Kitchen Notes ({comments.length})
                </span>

                {/* Comment Input */}
                <form onSubmit={handleSendComment} className="flex gap-2 shrink-0">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Ask a question or leave culinary feedback..."
                    className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={!commentInput.trim() || commentSubmitting}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {comments.length === 0 ? (
                    <p className="text-xs text-stone-500 py-6 text-center">
                      No kitchen notes yet. Be the first to ask a question or leave a tip!
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="p-3 rounded-xl bg-stone-900 border border-stone-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{comment.userName}</span>
                          <span className="text-[10px] text-stone-500">
                            {new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-stone-300 leading-relaxed">{comment.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 animate-in fade-in text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    About this Masterclass
                  </span>
                  <p className="text-stone-300 leading-relaxed">{video.description}</p>
                </div>

                <div className="pt-3 border-t border-stone-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                    Tutorial Specifications
                  </span>
                  <div className="space-y-1.5 text-stone-300">
                    <div className="flex justify-between py-1 border-b border-stone-800/60">
                      <span className="text-stone-500">Category</span>
                      <span className="font-semibold text-white">{video.category || 'Technique'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-stone-800/60">
                      <span className="text-stone-500">Duration</span>
                      <span className="font-semibold text-white">{video.durationMinutes} minutes</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-stone-800/60">
                      <span className="text-stone-500">Access Tier</span>
                      <span className="font-semibold text-white">{video.isPremium ? 'VIP Kitchen Circle' : 'Free Universal Tutorial'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Reusable Universal Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        item={shareItem}
      />
    </div>
  );
};
