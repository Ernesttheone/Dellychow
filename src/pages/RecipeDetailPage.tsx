import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Users, 
  Bookmark, 
  Star, 
  PlayCircle, 
  Check, 
  Plus, 
  Minus, 
  ChefHat, 
  MessageSquare, 
  Share2,
  ArrowLeft,
  Lock,
  Send,
  Timer,
  ShoppingCart,
  Flag,
  Heart,
  CornerDownRight,
  X
} from 'lucide-react';
import { Recipe, RecipeRating, Comment, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { RecipeService } from '../services/recipeService';
import { CookingTimer } from '../components/CookingTimer';
import { UserAvatar } from '../components/UserAvatar';
import { resolveVideoUrl, checkServerStreamExists } from '../lib/videoStorage';
import { extractStepMinutes } from '../lib/recipeTimeUtils';
import { ReportTarget } from '../components/ReportContentModal';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface RecipeDetailPageProps {
  recipe: Recipe;
  creatorProfile?: UserProfile;
  onBack: () => void;
  onSelectChef: (chefId: string) => void;
  onRequestSubscribe: (chefId: string, chefName: string) => void;
  onOpenAuthModal?: (mode?: 'login' | 'signup', role?: any) => void;
  onAddToShoppingList?: (recipe: Recipe) => void;
  onReportContent?: (target: ReportTarget) => void;
}

export const RecipeDetailPage: React.FC<RecipeDetailPageProps> = ({
  recipe,
  creatorProfile,
  onBack,
  onSelectChef,
  onRequestSubscribe,
  onOpenAuthModal,
  onAddToShoppingList,
  onReportContent
}) => {
  const {
    currentUser,
    userProfile,
    isRecipeBookmarked,
    toggleBookmark,
    isRecipeLiked,
    toggleLikeRecipe,
    isSubscribedToChef,
    setPendingAction,
    blockedUserIds
  } = useAuth();
  
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [activeTimerMinutes, setActiveTimerMinutes] = useState<number | null>(null);
  const [activeTimerLabel, setActiveTimerLabel] = useState<string>('Chef Stated Timer');

  // Live recipe & rating state
  const [liveRecipe, setLiveRecipe] = useState<Recipe>(recipe);
  const [recipeRatings, setRecipeRatings] = useState<RecipeRating[]>([]);
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [hasRated, setHasRated] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Comments & image state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string>('');
  const [heroImageError, setHeroImageError] = useState(false);

  // Resolve cooking video URL for all devices and users
  useEffect(() => {
    let isMounted = true;
    if (recipe.videoUrl) {
      resolveVideoUrl(recipe.videoUrl, recipe.id).then(async (url) => {
        if (!isMounted) return;
        if (url && url.startsWith('/api/videos/stream/')) {
          const exists = await checkServerStreamExists(url);
          if (isMounted) setResolvedVideoUrl(exists ? url : '');
        } else if (isMounted) {
          setResolvedVideoUrl(url);
        }
      });
    } else {
      setResolvedVideoUrl('');
    }
    return () => { isMounted = false; };
  }, [recipe.videoUrl, recipe.id]);

  // Sync live recipe document (for real-time ratingAverage / ratingCount / likesCount updates)
  useEffect(() => {
    setLiveRecipe(recipe);
    setHeroImageError(false);
    const unsubDoc = onSnapshot(doc(db, 'recipes', recipe.id), (snap) => {
      if (snap.exists()) {
        setLiveRecipe({ id: snap.id, ...(snap.data() as Omit<Recipe, 'id'>) });
      }
    }, () => {});
    return () => unsubDoc();
  }, [recipe]);

  // Listen to per-user recipe ratings in real time
  useEffect(() => {
    const unsubRatings = RecipeService.listenToRecipeRatings(recipe.id, (loadedRatings) => {
      setRecipeRatings(loadedRatings);
    });
    return () => unsubRatings();
  }, [recipe.id]);

  // Sync current authenticated user's saved rating for this recipe
  useEffect(() => {
    if (!currentUser) {
      setUserRating(0);
      setHasRated(false);
      return;
    }
    const fromSub = recipeRatings.find((r) => r.userId === currentUser.uid)?.rating;
    const fromProfile = userProfile?.recipeRatings?.[recipe.id];
    const resolvedScore = fromSub || fromProfile || 0;
    if (resolvedScore > 0) {
      setUserRating(resolvedScore);
      setHasRated(true);
    } else {
      setUserRating(0);
      setHasRated(false);
    }
  }, [currentUser, recipeRatings, userProfile?.recipeRatings, recipe.id]);

  // Listen to comments in real-time
  useEffect(() => {
    const unsubscribe = RecipeService.listenToComments(recipe.id, (loadedComments) => {
      setComments(loadedComments);
    });
    return () => unsubscribe();
  }, [recipe.id]);

  const ratingCount = recipeRatings.length > 0
    ? recipeRatings.length
    : (typeof liveRecipe.ratingCount === 'number' ? liveRecipe.ratingCount : 0);

  const averageRating = recipeRatings.length > 0
    ? Number((recipeRatings.reduce((sum, r) => sum + r.rating, 0) / recipeRatings.length).toFixed(1))
    : (ratingCount > 0 && typeof liveRecipe.ratingAverage === 'number' ? liveRecipe.ratingAverage : 0);

  const bookmarked = isRecipeBookmarked(recipe.id);
  const liked = isRecipeLiked(recipe.id);
  const hasHeroImage = Boolean(liveRecipe.imageUrl && liveRecipe.imageUrl.trim().length > 0) && !heroImageError;
  const authorName = creatorProfile?.displayName || liveRecipe.authorName || recipe.authorName;
  const authorPhoto = creatorProfile?.photoURL || liveRecipe.authorPhoto || recipe.authorPhoto;
  const authorFollowers = creatorProfile?.followerCount ?? 0;
  const isPremiumLocked = recipe.isPremium && !isSubscribedToChef(recipe.authorId);

  const baseServings = recipe.servings || 4;
  const currentServings = Math.max(1, Math.round(baseServings * servingsMultiplier));

  const toggleIngredient = (index: number) => {
    setCheckedIngredients(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleStep = (index: number) => {
    setCompletedSteps(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleRate = async (score: number) => {
    if (!currentUser) {
      setPendingAction({
        type: 'rate_recipe',
        recipeId: recipe.id,
        rating: score,
        recipeTitle: recipe.title
      });
      if (onOpenAuthModal) onOpenAuthModal('login', 'user');
      return;
    }
    if (ratingSubmitting) return;

    const clamped = Math.min(5, Math.max(1, Math.round(score)));
    setUserRating(clamped);
    setRatingSubmitting(true);
    try {
      const result = await RecipeService.rateRecipe(
        recipe.id,
        currentUser.uid,
        clamped,
        userProfile?.displayName || currentUser.displayName || 'Food Explorer'
      );
      setLiveRecipe((prev) => ({
        ...prev,
        ratingAverage: result.average,
        ratingCount: result.count,
      }));
      setHasRated(true);
    } catch (err) {
      console.error("Failed to submit rating:", err);
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = commentInput.trim();
    if (!trimmed || commentSubmitting) return;

    const parentId = replyingTo ? (replyingTo.parentId || replyingTo.id) : undefined;
    const replyToUserId = replyingTo?.userId;
    const replyToUserName = replyingTo?.userName;

    if (!currentUser) {
      // Prompt sign in and hold comment pending as requested
      setPendingAction({
        type: 'comment_recipe',
        recipeId: recipe.id,
        content: trimmed,
        targetTitle: recipe.title,
        parentId,
        replyToUserId,
        replyToUserName,
        authorId: liveRecipe.authorId,
      });
      if (onOpenAuthModal) onOpenAuthModal('login', 'user');
      return;
    }

    const actorName = userProfile?.displayName || currentUser.displayName || 'Food Explorer';
    const actorPhoto = userProfile?.photoURL || currentUser.photoURL || '';

    setCommentSubmitting(true);
    try {
      await RecipeService.addComment(recipe.id, {
        recipeId: recipe.id,
        userId: currentUser.uid,
        userName: actorName,
        userPhoto: actorPhoto,
        authorRole: userProfile?.role || 'user',
        parentId,
        replyToUserId,
        replyToUserName,
        content: trimmed,
      });

      if (replyingTo && replyingTo.userId && replyingTo.userId !== currentUser.uid) {
        RecipeService.createNotification(replyingTo.userId, {
          type: 'comment_reply',
          title: `${actorName} replied to your comment`,
          message: trimmed,
          actorId: currentUser.uid,
          actorName,
          actorPhoto,
          targetId: recipe.id,
          targetType: 'recipe',
          link: `recipe:${recipe.id}`,
        }).catch(() => {});
      }

      if (
        liveRecipe.authorId &&
        liveRecipe.authorId !== currentUser.uid &&
        liveRecipe.authorId !== replyingTo?.userId
      ) {
        RecipeService.createNotification(liveRecipe.authorId, {
          type: 'new_comment',
          title: `${actorName} commented on "${recipe.title}"`,
          message: trimmed,
          actorId: currentUser.uid,
          actorName,
          actorPhoto,
          targetId: recipe.id,
          targetType: 'recipe',
          link: `recipe:${recipe.id}`,
        }).catch(() => {});
      }

      setCommentInput('');
      setReplyingTo(null);
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleToggleLike = async () => {
    if (!currentUser) {
      setPendingAction({
        type: 'like_recipe',
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        authorId: liveRecipe.authorId,
      });
      if (onOpenAuthModal) onOpenAuthModal('login', 'user');
      return;
    }
    try {
      await toggleLikeRecipe(liveRecipe);
    } catch (err) {
      console.warn('Could not toggle recipe like:', err);
    }
  };


  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe.title,
          text: `Check out this recipe for ${recipe.title} on DellyChow!`,
          url: window.location.href,
        });
      } catch {
        // Fallback
      }
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('Recipe URL copied to clipboard!');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      {/* Back & Actions Strip */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to recipes</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={handleToggleLike}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              liked
                ? 'bg-red-50 border-red-200 text-red-600'
                : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
            aria-label={liked ? 'Unlike recipe' : 'Like recipe'}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
            <span className="tabular-nums">{liveRecipe.likesCount || 0}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="p-2.5 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors cursor-pointer"
            title="Share recipe"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (!currentUser) {
                setPendingAction({
                  type: 'like_recipe',
                  recipeId: recipe.id,
                  recipeTitle: recipe.title,
                  authorId: liveRecipe.authorId,
                });
                if (onOpenAuthModal) onOpenAuthModal('login', 'user');
                return;
              }
              toggleBookmark(recipe);
            }}
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              bookmarked
                ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-white' : ''}`} />
            <span>{bookmarked ? 'Saved in Favourites' : 'Save to Favourites'}</span>
          </button>

          {onReportContent && (
            <button
              type="button"
              onClick={() =>
                onReportContent({
                  targetType: 'recipe',
                  targetId: recipe.id,
                  targetTitle: recipe.title,
                  targetAuthorId: recipe.authorId,
                  targetAuthorName: recipe.authorName,
                })
              }
              className="p-2.5 rounded-xl border border-stone-200 text-stone-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Report recipe or copyright issue"
              aria-label="Report recipe"
            >
              <Flag className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Recipe Header & Hero Picture */}
      <div className="space-y-6">
        <div>
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 font-medium mb-2">
            {recipe.isPremium && !hasHeroImage && (
              <span className="bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md inline-flex items-center gap-1 mr-1">
                <Lock className="w-3 h-3" />
                <span>VIP Masterclass Recipe</span>
              </span>
            )}
            <span className="text-amber-700 uppercase tracking-wider font-semibold">{recipe.cuisine} Cuisine</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{recipe.category}</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 font-semibold text-stone-800 tabular-nums">
              <Star className={`w-3.5 h-3.5 ${ratingCount > 0 ? 'text-amber-500 fill-amber-500' : 'text-stone-400'}`} />
              {ratingCount > 0
                ? `${averageRating.toFixed(1)} (${ratingCount} ${ratingCount === 1 ? 'rating' : 'ratings'})`
                : '0.0 (No ratings yet)'}
            </span>
          </div>

          <h1 className="font-serif-display text-3xl sm:text-5xl font-bold text-stone-900 tracking-tight leading-tight">
            {recipe.title}
          </h1>

          <p className="text-stone-600 text-sm sm:text-base leading-relaxed mt-3 max-w-3xl">
            {recipe.description}
          </p>
        </div>

        {/* Chef Credit Banner */}
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 flex items-center justify-between gap-3 shadow-2xs">
          <div
            onClick={() => onSelectChef(recipe.authorId)}
            className="flex items-center gap-3.5 text-left group cursor-pointer min-w-0"
          >
            <UserAvatar
              src={authorPhoto}
              seed={recipe.authorId}
              name={authorName}
              size="lg"
              showFollowButton
              creatorId={recipe.authorId}
              creatorName={authorName}
              creatorPhoto={authorPhoto}
              onRequireAuth={() => onOpenAuthModal?.('login', 'user')}
            />
            <div className="min-w-0">
              <p className="text-xs text-stone-500 font-medium">Recipe created by</p>
              <p className="font-serif-display text-base font-bold text-stone-900 group-hover:text-amber-700 transition-colors truncate">
                {authorName}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-stone-500">
                {creatorProfile?.username && <span>@{creatorProfile.username}</span>}
                {creatorProfile?.username && <span aria-hidden="true">·</span>}
                <span className="tabular-nums font-medium">
                  {authorFollowers.toLocaleString()} {authorFollowers === 1 ? 'follower' : 'followers'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectChef(recipe.authorId)}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-colors shrink-0 cursor-pointer"
          >
            View Chef Profile
          </button>
        </div>

        {/* Hero Image (Completely omitted from DOM if creator uploaded no image) */}
        {hasHeroImage && (
          <div className="relative aspect-16/9 rounded-3xl overflow-hidden bg-stone-100 shadow-md">
            <img
              src={liveRecipe.imageUrl}
              alt={recipe.title}
              referrerPolicy="no-referrer"
              onError={() => setHeroImageError(true)}
              className="w-full h-full object-cover"
            />
            {recipe.isPremium && (
              <div className="absolute top-4 left-4 bg-amber-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>VIP Masterclass Recipe</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Culinary Spec Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs text-center">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold block mb-1">
            Prep Time
          </span>
          <span className="font-serif-display text-xl font-bold text-stone-900 tabular-nums">
            {recipe.prepTimeMinutes ? `${recipe.prepTimeMinutes} mins` : 'Chef Guided'}
          </span>
        </div>
        <div className="border-l border-stone-100">
          <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold block mb-1">
            Cook Time
          </span>
          <span className="font-serif-display text-xl font-bold text-stone-900 tabular-nums">
            {recipe.cookTimeMinutes ? `${recipe.cookTimeMinutes} mins` : 'Chef Guided'}
          </span>
        </div>
        <div className="border-l border-stone-100">
          <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold block mb-1">
            Total Time
          </span>
          <span className="font-serif-display text-xl font-bold text-amber-700 tabular-nums">
            {((recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0)) > 0 
              ? `${(recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0)} mins`
              : 'As Guided by Chef'}
          </span>
        </div>
        <div className="border-l border-stone-100">
          <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold block mb-1">
            Yield
          </span>
          <span className="font-serif-display text-xl font-bold text-stone-900 tabular-nums">
            {currentServings} Servings
          </span>
        </div>
      </div>

      {/* Video Demonstration Section if available */}
      {recipe.videoUrl && (
        <div className="p-6 sm:p-8 rounded-3xl bg-stone-900 text-white space-y-4">
          <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold uppercase tracking-wider">
            <PlayCircle className="w-4 h-4" />
            <span>Chef Cooking Video Tutorial</span>
          </div>
          <h3 className="font-serif-display text-2xl font-bold">Watch The Step-by-Step Preparation</h3>
          <div className="relative aspect-16/9 rounded-2xl overflow-hidden bg-black shadow-inner">
            {(() => {
              const videoSrc = resolvedVideoUrl || recipe.videoUrl;
              return videoSrc.includes('youtube.com') || videoSrc.includes('youtu.be') || videoSrc.includes('vimeo.com') ? (
                <iframe
                  src={
                    videoSrc.includes('embed') 
                      ? videoSrc 
                      : videoSrc.includes('youtube.com') 
                        ? `https://www.youtube.com/embed/${videoSrc.split('v=')[1]?.split('&')[0] || ''}`
                        : videoSrc.includes('youtu.be')
                          ? `https://www.youtube.com/embed/${videoSrc.split('youtu.be/')[1]?.split('?')[0] || ''}`
                          : videoSrc
                  }
                  title="Cooking video"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : (
                <video
                  src={videoSrc}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* Main Content: Split Columns (Ingredients Left, Preparation Steps Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Ingredients (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          
          <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
              <h3 className="font-serif-display text-xl font-bold text-stone-900">
                Ingredients
              </h3>

              <div className="flex items-center gap-2">
                {onAddToShoppingList && (
                  <button
                    type="button"
                    onClick={() => onAddToShoppingList(recipe)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                    title="Add ingredients to shopping list"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Add to List</span>
                  </button>
                )}

                {/* Servings Adjuster */}
                <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setServingsMultiplier(m => Math.max(0.5, m - 0.5))}
                    className="p-1 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-white"
                    title="Decrease servings"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-semibold text-stone-800 px-1 tabular-nums">
                    {currentServings}p
                  </span>
                  <button
                    type="button"
                    onClick={() => setServingsMultiplier(m => m + 0.5)}
                    className="p-1 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-white"
                    title="Increase servings"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 italic">
              Tap ingredients as you measure them in your kitchen:
            </p>

            <ul className="space-y-3">
              {recipe.ingredients.map((ing, i) => {
                const isChecked = !!checkedIngredients[i];
                return (
                  <li 
                    key={i}
                    onClick={() => toggleIngredient(i)}
                    className="flex items-start gap-3 cursor-pointer group text-xs sm:text-sm"
                  >
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isChecked 
                        ? 'bg-emerald-600 border-emerald-600 text-white' 
                        : 'border-stone-300 group-hover:border-amber-600 bg-white'
                    }`}>
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span className={`leading-relaxed transition-all ${
                      isChecked ? 'line-through text-stone-400' : 'text-stone-800'
                    }`}>
                      {ing}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Kitchen Timer Widget */}
          <CookingTimer 
            initialMinutes={activeTimerMinutes || recipe.cookTimeMinutes || 5} 
            label={activeTimerLabel}
          />
        </div>

        {/* Right Column: Step-by-Step Instructions (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-6">
            <div className="pb-3 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="font-serif-display text-xl sm:text-2xl font-bold text-stone-900">
                  Preparation Instructions
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Follow each chef-guided technique step in sequence
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {recipe.steps.map((step, idx) => {
                const isDone = !!completedSteps[idx];
                return (
                  <div 
                    key={idx}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isDone 
                        ? 'bg-stone-50/60 border-stone-200 text-stone-400' 
                        : 'bg-white border-stone-200/80 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          isDone 
                            ? 'bg-stone-200 text-stone-600' 
                            : 'bg-amber-600 text-white'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                          Step {idx + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {(() => {
                          const stepMinutes = extractStepMinutes(step);
                          if (!stepMinutes) return null;
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTimerMinutes(stepMinutes);
                                setActiveTimerLabel(`Step ${idx + 1} (${stepMinutes}m)`);
                              }}
                              className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80 cursor-pointer"
                              title={`Set cooking timer to ${stepMinutes} minutes as specified by the chef in this step`}
                            >
                              <Timer className="w-3.5 h-3.5 text-amber-600" />
                              <span>{stepMinutes}m Step Timer</span>
                            </button>
                          );
                        })()}

                        <button
                          type="button"
                          onClick={() => toggleStep(idx)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                            isDone
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isDone ? 'Completed' : 'Mark Done'}</span>
                        </button>
                      </div>
                    </div>

                    <p className={`text-xs sm:text-sm leading-relaxed pl-9 ${
                      isDone ? 'line-through text-stone-400' : 'text-stone-700'
                    }`}>
                      {step}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Rating Section */}
          <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
              <div>
                <h4 className="font-serif-display text-lg font-bold text-stone-900">
                  Rate This Culinary Creation
                </h4>
                <p className="text-xs text-stone-500">
                  Share your 1 to 5 star score with the chef and DellyChow cooking community:
                </p>
              </div>

              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-50 border border-amber-200/70 shrink-0">
                <Star className={`w-4 h-4 ${ratingCount > 0 ? 'text-amber-500 fill-amber-500' : 'text-stone-400'}`} />
                <span className="text-sm font-bold text-stone-900 tabular-nums">
                  {ratingCount > 0 ? averageRating.toFixed(1) : '0.0'}
                </span>
                <span className="text-xs text-stone-500 tabular-nums">
                  / 5 ({ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'})
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => handleRate(star)}
                  disabled={ratingSubmitting}
                  aria-label={`Rate ${star} out of 5 stars`}
                  className="p-1 hover:scale-110 transition-transform focus:outline-none disabled:opacity-60 cursor-pointer"
                >
                  <Star 
                    className={`w-7 h-7 ${
                      (hoverRating || userRating || 0) >= star
                        ? 'text-amber-500 fill-amber-500'
                        : 'text-stone-300'
                    }`} 
                  />
                </button>
              ))}
              <span className="text-xs font-semibold text-stone-700 ml-2">
                {ratingSubmitting
                  ? 'Saving your rating...'
                  : hasRated
                  ? `You rated this ${userRating}/5 stars (tap a star to update)`
                  : !currentUser
                  ? 'Sign in to rate (1–5 stars)'
                  : 'Tap a star to rate (1–5)'}
              </span>
            </div>
          </div>

          {/* Real-Time Comments Section */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-600" />
                <h4 className="font-serif-display text-xl font-bold text-stone-900">
                  Cooking Notes & Comments ({comments.length})
                </h4>
              </div>
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="space-y-3">
              {replyingTo && (
                <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900">
                  <span className="flex items-center gap-1.5 font-medium truncate">
                    <CornerDownRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      Replying to <strong>{replyingTo.userName}</strong>
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="p-1 rounded-lg hover:bg-amber-100 text-amber-800 cursor-pointer shrink-0"
                    aria-label="Cancel reply"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <textarea
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder={
                  replyingTo
                    ? `Write a reply to ${replyingTo.userName}...`
                    : currentUser
                    ? "Ask the chef a question, share tips, or discuss this recipe..."
                    : "Type your cooking note or question... Click Post to sign in and submit."
                }
                rows={3}
                className="w-full text-xs sm:text-sm p-4 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
                maxLength={1000}
              />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <button
                  type="submit"
                  disabled={!commentInput.trim() || commentSubmitting}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-2 disabled:opacity-40 self-start sm:self-auto cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{replyingTo ? 'Post Reply' : 'Post Cooking Note'}</span>
                </button>
                {!currentUser && (
                  <p className="text-[11px] text-stone-500">
                    Guests can draft questions or notes freely; clicking Post will prompt a quick sign in and immediately submit!
                  </p>
                )}
              </div>
            </form>

            {/* Comments List (Filtered for blocked users & grouped into threaded replies) */}
            {(() => {
              const visibleComments = comments.filter((c) => !blockedUserIds.includes(c.userId));
              const topLevelComments = visibleComments.filter((c) => !c.parentId);
              const repliesByParent: Record<string, Comment[]> = {};
              visibleComments
                .filter((c) => Boolean(c.parentId))
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                .forEach((reply) => {
                  const key = reply.parentId!;
                  if (!repliesByParent[key]) repliesByParent[key] = [];
                  repliesByParent[key].push(reply);
                });

              if (visibleComments.length === 0) {
                return (
                  <p className="text-xs text-stone-400 text-center py-4">
                    No cooking comments yet. Be the first to ask the chef a question or share feedback!
                  </p>
                );
              }

              return (
                <div className="space-y-4 pt-2">
                  {topLevelComments.map((comment) => {
                    const isRecipeChef = comment.authorRole === 'chef' || comment.userId === liveRecipe.authorId;
                    const childReplies = repliesByParent[comment.id] || [];
                    return (
                      <div key={comment.id} className="space-y-2">
                        <div className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200/70 space-y-2">
                          <div className="flex items-center justify-between text-xs gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <UserAvatar
                                src={comment.userPhoto}
                                seed={comment.userId || comment.userName}
                                name={comment.userName}
                                size="xs"
                                ring={false}
                              />
                              <span className="font-semibold text-stone-800 truncate">{comment.userName}</span>
                              {isRecipeChef && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider shrink-0">
                                  Chef
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-stone-400 text-[11px]">
                                {new Date(comment.createdAt).toLocaleDateString()}
                              </span>
                              {onReportContent && comment.userId !== currentUser?.uid && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onReportContent({
                                      targetType: 'recipe_comment',
                                      targetId: comment.id,
                                      targetTitle: `Recipe comment by ${comment.userName}`,
                                      targetAuthorId: comment.userId,
                                      targetAuthorName: comment.userName,
                                    })
                                  }
                                  className="text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                                  title="Report comment or block user"
                                  aria-label="Report comment"
                                >
                                  <Flag className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-xs sm:text-sm text-stone-700 pl-8 leading-relaxed">
                            {comment.content}
                          </p>

                          <div className="pl-8 flex items-center gap-3 pt-0.5">
                            <button
                              type="button"
                              onClick={() => setReplyingTo(comment)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-amber-700 transition-colors cursor-pointer"
                            >
                              <CornerDownRight className="w-3 h-3" />
                              <span>Reply</span>
                            </button>
                            {childReplies.length > 0 && (
                              <span className="text-[11px] text-stone-400">
                                {childReplies.length} {childReplies.length === 1 ? 'reply' : 'replies'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Nested Replies */}
                        {childReplies.length > 0 && (
                          <div className="pl-5 sm:pl-8 space-y-2 border-l-2 border-amber-200/70 ml-4">
                            {childReplies.map((reply) => {
                              const isReplyChef = reply.authorRole === 'chef' || reply.userId === liveRecipe.authorId;
                              return (
                                <div key={reply.id} className="p-3.5 rounded-2xl bg-white border border-stone-200/70 space-y-1.5">
                                  <div className="flex items-center justify-between text-xs gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <UserAvatar
                                        src={reply.userPhoto}
                                        seed={reply.userId || reply.userName}
                                        name={reply.userName}
                                        size="xs"
                                        ring={false}
                                      />
                                      <span className="font-semibold text-stone-800 truncate">{reply.userName}</span>
                                      {isReplyChef && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider shrink-0">
                                          Chef
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-stone-400 text-[11px]">
                                        {new Date(reply.createdAt).toLocaleDateString()}
                                      </span>
                                      {onReportContent && reply.userId !== currentUser?.uid && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onReportContent({
                                              targetType: 'recipe_comment',
                                              targetId: reply.id,
                                              targetTitle: `Recipe reply by ${reply.userName}`,
                                              targetAuthorId: reply.userId,
                                              targetAuthorName: reply.userName,
                                            })
                                          }
                                          className="text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                                          title="Report reply"
                                          aria-label="Report reply"
                                        >
                                          <Flag className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-xs sm:text-sm text-stone-700 pl-8 leading-relaxed">
                                    {reply.replyToUserName && (
                                      <span className="text-amber-700 font-semibold mr-1.5">
                                        @{reply.replyToUserName}
                                      </span>
                                    )}
                                    {reply.content}
                                  </p>
                                  <div className="pl-8">
                                    <button
                                      type="button"
                                      onClick={() => setReplyingTo(reply)}
                                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-amber-700 transition-colors cursor-pointer"
                                    >
                                      <CornerDownRight className="w-3 h-3" />
                                      <span>Reply</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

        </div>

      </div>

    </div>
  );
};
