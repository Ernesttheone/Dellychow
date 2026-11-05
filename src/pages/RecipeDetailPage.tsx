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
  ShoppingCart
} from 'lucide-react';
import { Recipe, Comment } from '../types';
import { useAuth } from '../context/AuthContext';
import { RecipeService } from '../services/recipeService';
import { CookingTimer } from '../components/CookingTimer';
import { UserAvatar } from '../components/UserAvatar';
import { resolveVideoUrl } from '../lib/videoStorage';

interface RecipeDetailPageProps {
  recipe: Recipe;
  onBack: () => void;
  onSelectChef: (chefId: string) => void;
  onRequestSubscribe: (chefId: string, chefName: string) => void;
  onOpenAuthModal?: (mode?: 'login' | 'signup', role?: any) => void;
  onAddToShoppingList?: (recipe: Recipe) => void;
}

export const RecipeDetailPage: React.FC<RecipeDetailPageProps> = ({
  recipe,
  onBack,
  onSelectChef,
  onRequestSubscribe,
  onOpenAuthModal,
  onAddToShoppingList
}) => {
  const { currentUser, userProfile, isRecipeBookmarked, toggleBookmark, isSubscribedToChef, setPendingAction } = useAuth();
  
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [activeTimerMinutes, setActiveTimerMinutes] = useState<number | null>(null);

  // Rating state
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [hasRated, setHasRated] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string>('');

  // Resolve cooking video URL for all devices and users
  useEffect(() => {
    if (recipe.videoUrl) {
      resolveVideoUrl(recipe.videoUrl, recipe.id).then(setResolvedVideoUrl);
    } else {
      setResolvedVideoUrl('');
    }
  }, [recipe.videoUrl, recipe.id]);

  // Listen to comments in real-time
  useEffect(() => {
    const unsubscribe = RecipeService.listenToComments(recipe.id, (loadedComments) => {
      setComments(loadedComments);
    });
    return () => unsubscribe();
  }, [recipe.id]);

  const bookmarked = isRecipeBookmarked(recipe.id);
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
        type: 'like_recipe',
        recipeId: recipe.id,
        recipeTitle: recipe.title
      });
      if (onOpenAuthModal) onOpenAuthModal('login', 'user');
      return;
    }
    if (hasRated || ratingSubmitting) return;

    setUserRating(score);
    setRatingSubmitting(true);
    try {
      await RecipeService.submitRating(
        recipe.id,
        recipe.ratingAverage || 5.0,
        score,
        recipe.ratingCount || 1
      );
      setHasRated(true);
    } catch (err) {
      console.error("Failed to submit rating:", err);
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || commentSubmitting) return;

    if (!currentUser) {
      // Prompt sign in and hold comment pending as requested
      setPendingAction({
        type: 'comment_recipe',
        recipeId: recipe.id,
        content: commentInput.trim(),
        targetTitle: recipe.title
      });
      if (onOpenAuthModal) onOpenAuthModal('login', 'user');
      return;
    }

    setCommentSubmitting(true);
    try {
      await RecipeService.addComment(recipe.id, {
        recipeId: recipe.id,
        userId: currentUser.uid,
        userName: userProfile?.displayName || 'Food Explorer',
        userPhoto: userProfile?.photoURL || '',
        content: commentInput.trim()
      });
      setCommentInput('');
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setCommentSubmitting(false);
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="p-2.5 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors"
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
                  recipeTitle: recipe.title
                });
                if (onOpenAuthModal) onOpenAuthModal('login', 'user');
                return;
              }
              toggleBookmark(recipe);
            }}
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
              bookmarked
                ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-white' : ''}`} />
            <span>{bookmarked ? 'Saved in Favourites' : 'Save to Favourites'}</span>
          </button>
        </div>
      </div>

      {/* Recipe Header & Hero Picture */}
      <div className="space-y-6">
        <div>
          {/* Metadata */}
          <div className="flex items-center gap-2 text-xs text-stone-500 font-medium mb-2">
            <span className="text-amber-700 uppercase tracking-wider font-semibold">{recipe.cuisine} Cuisine</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{recipe.category}</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 font-semibold text-stone-800 tabular-nums">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              {(recipe.ratingAverage || 5.0).toFixed(1)} ({recipe.ratingCount || 1} ratings)
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
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 flex items-center justify-between shadow-2xs">
          <button
            onClick={() => onSelectChef(recipe.authorId)}
            className="flex items-center gap-3 text-left group"
          >
            <UserAvatar
              src={recipe.authorPhoto}
              seed={recipe.authorId}
              name={recipe.authorName}
              size="lg"
            />
            <div>
              <p className="text-xs text-stone-500 font-medium">Recipe created by</p>
              <p className="font-serif-display text-base font-bold text-stone-900 group-hover:text-amber-700 transition-colors">
                {recipe.authorName}
              </p>
            </div>
          </button>

          <button
            onClick={() => onSelectChef(recipe.authorId)}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-colors"
          >
            View Chef Profile
          </button>
        </div>

        {/* Hero Image */}
        <div className="relative aspect-16/9 rounded-3xl overflow-hidden bg-stone-100 shadow-md">
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          {recipe.isPremium && (
            <div className="absolute top-4 left-4 bg-amber-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>VIP Masterclass Recipe</span>
            </div>
          )}
        </div>
      </div>

      {/* Culinary Spec Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs text-center">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold block mb-1">
            Prep Time
          </span>
          <span className="font-serif-display text-xl font-bold text-stone-900 tabular-nums">
            {recipe.prepTimeMinutes || 15} mins
          </span>
        </div>
        <div className="border-l border-stone-100">
          <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold block mb-1">
            Cook Time
          </span>
          <span className="font-serif-display text-xl font-bold text-stone-900 tabular-nums">
            {recipe.cookTimeMinutes || 20} mins
          </span>
        </div>
        <div className="border-l border-stone-100">
          <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold block mb-1">
            Total Time
          </span>
          <span className="font-serif-display text-xl font-bold text-amber-700 tabular-nums">
            {(recipe.prepTimeMinutes || 15) + (recipe.cookTimeMinutes || 20)} mins
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
            initialMinutes={activeTimerMinutes || recipe.cookTimeMinutes || 10} 
            label="Active Cooking Step Timer"
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
            <h4 className="font-serif-display text-lg font-bold text-stone-900">
              Rate This Culinary Creation
            </h4>
            <p className="text-xs text-stone-500">
              Share your score with the chef and DellyChow cooking community:
            </p>

            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => handleRate(star)}
                  disabled={hasRated || !currentUser}
                  className="p-1 hover:scale-110 transition-transform focus:outline-none disabled:opacity-75"
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
                {hasRated ? 'Thank you for your rating!' : !currentUser ? 'Sign in to rate' : 'Tap a star'}
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
              <textarea
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder={currentUser ? "Share cooking tips, adjustments, or praise for the chef..." : "Type your cooking note or question... Click Send to post after signing in."}
                rows={3}
                className="w-full text-xs sm:text-sm p-4 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
                maxLength={1000}
              />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <button
                  type="submit"
                  disabled={!commentInput.trim() || commentSubmitting}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-2 disabled:opacity-40 self-start sm:self-auto"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post Cooking Note</span>
                </button>
                {!currentUser && (
                  <p className="text-[11px] text-stone-500">
                    Guests can draft questions or notes freely; clicking Post will prompt a quick sign in and immediately submit!
                  </p>
                )}
              </div>
            </form>


            {/* Comments List */}
            <div className="space-y-4 pt-2">
              {comments.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-4">
                  No cooking comments yet. Be the first to try this recipe!
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200/70 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          src={comment.userPhoto}
                          seed={comment.userId || comment.userName}
                          name={comment.userName}
                          size="xs"
                          ring={false}
                        />
                        <span className="font-semibold text-stone-800">{comment.userName}</span>
                      </div>
                      <span className="text-stone-400 text-[11px]">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-stone-700 pl-8 leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
