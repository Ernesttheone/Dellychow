import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChefHat, 
  Star, 
  Crown, 
  Bookmark, 
  Users, 
  Award, 
  MessageSquare, 
  Video, 
  UtensilsCrossed, 
  Check, 
  Heart,
  ShieldCheck,
  Send,
  Edit3,
  AlertCircle,
  Share2
} from 'lucide-react';
import { Recipe, CookingVideo, UserProfile, ChefReview } from '../types';
import { RecipeCard } from '../components/RecipeCard';
import { VideoCard } from '../components/VideoCard';
import { MobileYouTubeVideoCard } from '../components/MobileYouTubeVideoCard';
import { CommunityChat } from '../components/CommunityChat';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ASSET_IMAGES } from '../assets/images';
import { UserAvatar } from '../components/UserAvatar';
import { RecipeService } from '../services/recipeService';
import { ShareModal, ShareItem } from '../components/ShareModal';

interface ChefProfilePageProps {
  chefId: string;
  recipes: Recipe[];
  videos: CookingVideo[];
  onSelectRecipe: (recipe: Recipe) => void;
  onPlayVideo: (video: CookingVideo) => void;
  onRequestSubscribe: (chefId: string, chefName: string) => void;
  onOpenAuthModal?: (mode?: 'login' | 'signup', role?: any) => void;
}

export const ChefProfilePage: React.FC<ChefProfilePageProps> = ({
  chefId,
  recipes,
  videos,
  onSelectRecipe,
  onPlayVideo,
  onRequestSubscribe,
  onOpenAuthModal
}) => {
  const { currentUser, userProfile, isSubscribedToChef, setPendingAction } = useAuth();
  const [chefProfile, setChefProfile] = useState<UserProfile | null>(null);
  const [loadingChef, setLoadingChef] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'recipes' | 'videos' | 'community' | 'reviews'>('recipes');

  // Link Sharing System state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareItem, setShareItem] = useState<ShareItem | null>(null);

  // Feature 5: Chef Reviews & Ratings
  const [reviews, setReviews] = useState<ChefReview[]>([]);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewHeadline, setReviewHeadline] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState('');
  const [reviewErrorMsg, setReviewErrorMsg] = useState('');

  // Load chef profile from Firestore
  useEffect(() => {
    async function loadChef() {
      try {
        const chefDocRef = doc(db, 'users', chefId);
        const snap = await getDoc(chefDocRef);
        if (snap.exists()) {
          setChefProfile(snap.data() as UserProfile);
        } else {
          // Fallback chef data if exploring default featured chef
          setChefProfile({
            id: chefId,
            displayName: 'Chef David Chen',
            role: 'chef',
            bio: 'Executive Chef trained in Lyon and Milan. Dedicated to demystifying classical European pasta techniques and modern French bistro gastronomy.',
            specialty: 'Handmade Pasta & French Bistro Pastry',
            experienceYears: 16,
            photoURL: ASSET_IMAGES.chefAvatar,
            premiumPriceMonthly: 9.99,
            perks: 'Weekly video masterclasses, secret sauce chemistry notes, live Sunday cook-along, and direct Q&A in the VIP kitchen.',
            subscriberCount: 142,
            followerCount: 2840,
            createdAt: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error("Error loading chef profile:", err);
      } finally {
        setLoadingChef(false);
      }
    }
    loadChef();
  }, [chefId]);

  // Listen to reviews in real-time
  useEffect(() => {
    const unsub = RecipeService.listenToChefReviews(chefId, (loadedReviews) => {
      setReviews(loadedReviews);
      // Prepopulate if current user already reviewed
      if (currentUser) {
        const myReview = loadedReviews.find(r => r.userId === currentUser.uid);
        if (myReview) {
          setReviewRating(myReview.rating);
          setReviewHeadline(myReview.headline);
          setReviewComment(myReview.comment);
        }
      }
    });
    return () => unsub();
  }, [chefId, currentUser]);

  const isSubscribed = isSubscribedToChef(chefId);

  // Link Sharing System handlers
  const handleShareChefProfile = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    setShareItem({
      title: `${displayName} | Master Chef on DellyChow`,
      text: chefProfile?.bio || `Discover masterclasses and recipes by ${displayName} on DellyChow!`,
      url: `${origin}/?chef=${chefId}`,
      mediaType: 'chef',
      thumbnailUrl: avatarUrl
    });
    setShareModalOpen(true);
  };

  const handleShareVideo = (video: CookingVideo) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    setShareItem({
      title: `${video.title} | Chef ${video.authorName}`,
      text: video.description || `Watch this culinary masterclass on DellyChow!`,
      url: `${origin}/?video=${video.id}`,
      mediaType: 'video',
      thumbnailUrl: video.thumbnailUrl
    });
    setShareModalOpen(true);
  };

  // Filter recipes and videos authored by this chef
  const chefRecipes = recipes.filter(r => r.authorId === chefId);
  const chefVideos = videos.filter(v => v.authorId === chefId);

  const displayName = chefProfile?.displayName || 'Chef';
  const avatarUrl = chefProfile?.photoURL || ASSET_IMAGES.chefAvatar;

  // Calculate average rating
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 4.9;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Number((sum / reviews.length).toFixed(1));
  }, [reviews]);

  const userAlreadyReviewed = useMemo(() => {
    if (!currentUser) return false;
    return reviews.some(r => r.userId === currentUser.uid);
  }, [reviews, currentUser]);

  const toggleFollow = async () => {
    if (!currentUser) {
      setPendingAction({
        type: 'follow_chef',
        chefId,
        chefName: displayName
      });
      if (onOpenAuthModal) onOpenAuthModal('login', 'user');
      return;
    }
    if (!chefProfile) return;
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    try {
      const chefDocRef = doc(db, 'users', chefId);
      const newCount = (chefProfile.followerCount || 0) + (nextState ? 1 : -1);
      await updateDoc(chefDocRef, { followerCount: Math.max(0, newCount) });
      setChefProfile(prev => prev ? ({ ...prev, followerCount: Math.max(0, newCount) }) : null);
    } catch {
      // Continue
    }
  };

  // Submit or update chef review with anti-spam safeguards
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewErrorMsg('');
    setReviewSuccessMsg('');

    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal('login', 'user');
      return;
    }

    if (currentUser.uid === chefId) {
      setReviewErrorMsg('Chefs cannot write reviews for their own profile.');
      return;
    }

    if (!reviewHeadline.trim()) {
      setReviewErrorMsg('Please add a headline for your review.');
      return;
    }

    if (reviewComment.trim().length < 10) {
      setReviewErrorMsg('Please write at least 10 characters explaining your cooking experience with this chef.');
      return;
    }

    setReviewSubmitting(true);
    try {
      const result = await RecipeService.submitChefReview(chefId, {
        chefId,
        userId: currentUser.uid,
        userName: userProfile?.displayName || currentUser.displayName || 'Food Explorer',
        userPhoto: userProfile?.photoURL || currentUser.photoURL || '',
        rating: reviewRating,
        headline: reviewHeadline.trim(),
        comment: reviewComment.trim()
      });

      setReviewSuccessMsg(userAlreadyReviewed ? 'Your review has been updated!' : 'Thank you! Your verified review has been published.');
      setTimeout(() => setReviewSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error('Failed to submit chef review:', err);
      setReviewErrorMsg(err.message || 'Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 md:space-y-10">
      
      {/* Chef Profile Header Card with YouTube Channel Banner */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs relative overflow-hidden">
        {/* Channel Banner */}
        <div className="relative h-28 sm:h-40 bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute right-4 bottom-3 text-[11px] text-amber-200/70 font-semibold uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-xs px-2.5 py-1 rounded-full bg-black/30">
            <ChefHat className="w-3.5 h-3.5 text-amber-400" />
            <span>Verified Master Channel</span>
          </div>
        </div>

        <div className="p-6 sm:p-8 md:p-10 -mt-10 sm:-mt-12 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            
            {/* Avatar, Rating & Bio */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
              <UserAvatar
                src={chefProfile?.photoURL}
                seed={chefId}
                name={displayName}
                size="2xl"
                className="ring-4 ring-white shadow-md shrink-0 bg-stone-900"
              />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif-display text-2xl sm:text-3xl font-bold text-stone-900">
                  {displayName}
                </h1>
                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <ChefHat className="w-3.5 h-3.5" />
                  Verified Master Chef
                </span>
              </div>

              {/* Average Rating Badge */}
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center text-amber-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        Math.round(averageRating) >= star ? 'fill-amber-500 text-amber-500' : 'text-stone-300'
                      }`}
                    />
                  ))}
                </div>
                <strong className="text-stone-900 font-bold text-sm tabular-nums">{averageRating}</strong>
                <button
                  type="button"
                  onClick={() => setActiveTab('reviews')}
                  className="text-stone-500 hover:text-amber-700 underline text-xs"
                >
                  ({reviews.length} verified {reviews.length === 1 ? 'review' : 'reviews'})
                </button>
              </div>

              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                Specialty: {chefProfile?.specialty || 'Artisanal Culinary Arts'} · {chefProfile?.experienceYears || 10}+ Years Experience
              </p>

              <p className="text-xs sm:text-sm text-stone-600 max-w-2xl leading-relaxed">
                {chefProfile?.bio || 'Passionate culinary artist sharing culinary heritage and step-by-step master recipes.'}
              </p>

              {/* Stats Strip */}
              <div className="flex items-center gap-5 sm:gap-6 pt-1 text-xs text-stone-500 font-medium">
                <div>
                  <strong className="text-stone-900 text-sm tabular-nums">
                    {(chefProfile?.followerCount || 240) + (isFollowing ? 1 : 0)}
                  </strong> Followers
                </div>
                <div>
                  <strong className="text-stone-900 text-sm tabular-nums">
                    {chefProfile?.subscriberCount || 18}
                  </strong> VIP Members
                </div>
                <div>
                  <strong className="text-stone-900 text-sm tabular-nums">{chefRecipes.length}</strong> Recipes
                </div>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch md:items-center gap-3 w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={handleShareChefProfile}
              className="px-4 py-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold uppercase tracking-wider transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
              title="Share Chef Profile"
            >
              <Share2 className="w-4 h-4 text-stone-600" />
              <span>{currentUser?.uid === chefId ? 'Share My Profile' : 'Share Profile'}</span>
            </button>

            <button
              type="button"
              onClick={toggleFollow}
              className={`px-5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
                isFollowing
                  ? 'bg-stone-100 text-stone-800 hover:bg-stone-200'
                  : 'bg-stone-900 hover:bg-stone-800 text-white shadow-xs'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFollowing ? 'fill-red-500 text-red-500' : ''}`} />
              <span>{isFollowing ? 'Following Chef' : 'Follow Chef'}</span>
            </button>

            <button
              type="button"
              onClick={() => onRequestSubscribe(chefId, displayName)}
              className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Crown className="w-4 h-4 text-amber-200" />
              <span>{isSubscribed ? 'VIP Privileges Active' : `Join VIP Circle ($${chefProfile?.premiumPriceMonthly || 9.99}/mo)`}</span>
            </button>
          </div>

        </div>
      </div>
    </div>

      {/* Tabs navigation with Review tab */}
      <div className="flex items-center gap-2 border-b border-stone-200/80 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('recipes')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'recipes'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Published Recipes ({chefRecipes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('videos')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'videos'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Cooking Videos ({chefVideos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('community')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'community'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          <Crown className="w-4 h-4 text-amber-500" />
          <span>Chef Group Chat</span>
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'reviews'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>Reviews & Ratings ({reviews.length})</span>
        </button>
      </div>

      {/* Tab 1: Recipes */}
      {activeTab === 'recipes' && (
        <div>
          {chefRecipes.length === 0 ? (
            <div className="p-16 rounded-3xl bg-white border border-stone-200/80 text-center space-y-2 max-w-md mx-auto">
              <p className="font-serif-display text-base font-bold text-stone-800">No recipes posted yet</p>
              <p className="text-xs text-stone-500">Check back soon for new recipes by {displayName}.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {chefRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onSelect={onSelectRecipe}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Cooking Videos */}
      {activeTab === 'videos' && (
        <div>
          {chefVideos.length === 0 ? (
            <div className="p-16 rounded-3xl bg-white border border-stone-200/80 text-center space-y-2 max-w-md mx-auto">
              <p className="font-serif-display text-base font-bold text-stone-800">No video tutorials yet</p>
              <p className="text-xs text-stone-500">Video tutorials by {displayName} will be displayed here.</p>
            </div>
          ) : (
            <div>
              {/* Mobile YouTube-Style Video Feed */}
              <div className="block sm:hidden space-y-4">
                {chefVideos.map((video) => (
                  <MobileYouTubeVideoCard
                    key={video.id}
                    video={video}
                    onPlay={onPlayVideo}
                    onShare={handleShareVideo}
                    onSelectChef={() => {}}
                    onRequestSubscribe={onRequestSubscribe}
                  />
                ))}
              </div>

              {/* Tablet & Desktop Grid */}
              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {chefVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onPlay={onPlayVideo}
                    onShare={handleShareVideo}
                    onRequestSubscribe={onRequestSubscribe}
                    onOpenAuthModal={() => onOpenAuthModal?.('login', 'user')}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: VIP Community Group Chat */}
      {activeTab === 'community' && (
        <CommunityChat
          chefId={chefId}
          chefName={displayName}
          onRequestSubscribe={() => onRequestSubscribe(chefId, displayName)}
        />
      )}

      {/* Tab 4: Feature 5 - Chef Rating & Review System */}
      {activeTab === 'reviews' && (
        <div className="space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Overall Rating & Review Form (lg:col-span-5) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Rating Summary Card */}
              <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <h3 className="font-serif-display text-lg font-bold text-stone-900">
                    Chef Rating Overview
                  </h3>
                  <span className="text-xs text-stone-500">
                    Verified Food Lovers
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center p-4 bg-amber-50 rounded-2xl border border-amber-200/60 min-w-[100px]">
                    <span className="font-serif-display text-4xl font-bold text-stone-900 block tabular-nums">
                      {averageRating}
                    </span>
                    <div className="flex items-center justify-center text-amber-500 my-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-3.5 h-3.5 fill-amber-500" />
                      ))}
                    </div>
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">
                      Out of 5 Stars
                    </span>
                  </div>

                  <div className="flex-1 space-y-1.5 text-xs text-stone-600">
                    <p className="font-medium text-stone-900">
                      Based on {reviews.length} authentic {reviews.length === 1 ? 'review' : 'reviews'}
                    </p>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Every rating is verified and linked to a registered food lover account with anti-spam protection.
                    </p>
                  </div>
                </div>
              </div>

              {/* Write / Edit Review Form */}
              <form onSubmit={handleSubmitReview} className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <h4 className="font-serif-display text-base font-bold text-stone-900">
                    {userAlreadyReviewed ? 'Update Your Review' : 'Rate & Review This Chef'}
                  </h4>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded uppercase">
                    1 Review / Account
                  </span>
                </div>

                {reviewSuccessMsg && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-2 border border-emerald-200">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{reviewSuccessMsg}</span>
                  </div>
                )}

                {reviewErrorMsg && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{reviewErrorMsg}</span>
                  </div>
                )}

                {/* Interactive Star Picker */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                    Your Rating *
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-1 hover:scale-115 transition-transform focus:outline-none"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            reviewRating >= star ? 'fill-amber-500 text-amber-500' : 'text-stone-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-stone-800 ml-2">
                      {reviewRating === 5 && 'Outstanding (5/5)'}
                      {reviewRating === 4 && 'Very Good (4/5)'}
                      {reviewRating === 3 && 'Good Experience (3/5)'}
                      {reviewRating === 2 && 'Fair (2/5)'}
                      {reviewRating === 1 && 'Needs Improvement (1/5)'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Review Headline *
                  </label>
                  <input
                    type="text"
                    required
                    value={reviewHeadline}
                    onChange={(e) => setReviewHeadline(e.target.value)}
                    placeholder="e.g. Masterful handmade pasta guidance & clear techniques"
                    maxLength={100}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Written Review & Cooking Feedback *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Describe how the chef's recipes or video demonstrations improved your kitchen skills..."
                    maxLength={800}
                    className="w-full text-xs p-3.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{reviewSubmitting ? 'Publishing Review...' : userAlreadyReviewed ? 'Update My Review' : 'Submit Chef Review'}</span>
                </button>
              </form>

            </div>

            {/* Right: Reviews Feed (lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <h3 className="font-serif-display text-xl font-bold text-stone-900">
                  Community Reviews & Testimonials ({reviews.length})
                </h3>
                <span className="text-xs text-stone-500 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Spam Protection Active
                </span>
              </div>

              {reviews.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-white border border-stone-200/80 space-y-2">
                  <Star className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="font-serif-display text-base font-bold text-stone-800">No written reviews yet</p>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Have you cooked a recipe by {displayName}? Be the first to share your experience!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            src={rev.userPhoto}
                            seed={rev.userId || rev.userName}
                            name={rev.userName}
                            size="sm"
                          />
                          <div>
                            <p className="font-bold text-xs text-stone-900">{rev.userName}</p>
                            <span className="text-[10px] text-stone-400">
                              Verified Food Lover · {new Date(rev.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center text-amber-500">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                rev.rating >= s ? 'fill-amber-500 text-amber-500' : 'text-stone-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <h5 className="font-bold text-xs sm:text-sm text-stone-900 pt-1">
                        &quot;{rev.headline}&quot;
                      </h5>

                      <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                        {rev.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* Link Sharing Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        item={shareItem}
      />

    </div>
  );
};
