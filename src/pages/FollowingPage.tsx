import React, { useEffect, useState } from 'react';
import {
  UserCheck,
  ChefHat,
  Crown,
  UtensilsCrossed,
  Video,
  UserPlus,
  HeartOff,
  Compass,
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { CookingVideo, Recipe, UserProfile } from '../types';
import { UserAvatar } from '../components/UserAvatar';
import { RecipeCard } from '../components/RecipeCard';
import { VideoCard } from '../components/VideoCard';
import { DUMMY_ACCOUNT_NAMES, isDummyOrAiAccountId } from '../data/starterRecipes';

interface FollowingPageProps {
  recipes: Recipe[];
  videos: CookingVideo[];
  creatorsMap?: Record<string, UserProfile>;
  onSelectRecipe: (recipe: Recipe) => void;
  onPlayVideo: (video: CookingVideo) => void;
  onSelectChef: (chefId: string) => void;
  onRequestSubscribe: (chefId: string, chefName: string) => void;
  onNavigate: (view: string, params?: any) => void;
  onOpenAuthModal: (mode?: 'login' | 'signup') => void;
  onShareVideo?: (video: CookingVideo) => void;
  onShareRecipe?: (recipe: Recipe) => void;
  onCommentVideo?: (video: CookingVideo) => void;
  onReportVideo?: (video: CookingVideo) => void;
}

export const FollowingPage: React.FC<FollowingPageProps> = ({
  recipes,
  videos,
  creatorsMap,
  onSelectRecipe,
  onPlayVideo,
  onSelectChef,
  onRequestSubscribe,
  onNavigate,
  onOpenAuthModal,
  onShareVideo,
  onShareRecipe,
  onCommentVideo,
  onReportVideo,
}) => {
  const {
    currentUser,
    followedChefs,
    isFollowingChef,
    toggleFollowChef,
    unfollowChef,
    isSubscribedToChef,
  } = useAuth();

  const [discoverChefs, setDiscoverChefs] = useState<UserProfile[]>([]);

  useEffect(() => {
    let active = true;
    getDocs(query(collection(db, 'users'), where('role', '==', 'chef')))
      .then((snap) => {
        if (!active) return;
        const loaded: UserProfile[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as UserProfile & { isDummy?: boolean; isAiAccount?: boolean };
          if (
            docSnap.id === currentUser?.uid ||
            isDummyOrAiAccountId(docSnap.id) ||
            data?.isDummy ||
            data?.isAiAccount ||
            DUMMY_ACCOUNT_NAMES.has((data?.displayName || '').trim())
          ) {
            return;
          }
          loaded.push({ ...data, id: docSnap.id });
        });
        setDiscoverChefs(loaded);
      })
      .catch(() => {
        if (active) setDiscoverChefs([]);
      });
    return () => {
      active = false;
    };
  }, [currentUser?.uid]);

  if (!currentUser) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
          <UserCheck className="w-8 h-8" />
        </div>
        <h1 className="font-serif-display text-3xl font-bold text-stone-900">
          Following Chefs
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
          Sign in to follow culinary creators, see updates from chefs you follow, and automatically follow your VIP masterclass chefs.
        </p>
        <button
          type="button"
          onClick={() => onOpenAuthModal('login')}
          className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
        >
          Sign In to View Following
        </button>
      </div>
    );
  }

  const followedIds = new Set(followedChefs.map((f) => f.chefId));
  const followedRecipes = recipes.filter((r) => followedIds.has(r.authorId));
  const followedVideos = videos.filter((v) => followedIds.has(v.authorId));
  const unfollowedChefs = discoverChefs.filter((c) => !followedIds.has(c.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-amber-700 font-semibold uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4" />
            <span>Your Culinary Circle</span>
          </div>
          <h1 className="font-serif-display text-3xl font-bold text-stone-900 tracking-tight">
            Following ({followedChefs.length})
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Chefs you follow and creators whose VIP classes you have joined.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('premium')}
          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs inline-flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Crown className="w-4 h-4 text-amber-200" />
          <span>Explore VIP Classes</span>
        </button>
      </div>

      {/* Followed Chefs Grid */}
      {followedChefs.length === 0 ? (
        <div className="p-10 rounded-3xl bg-white border border-stone-200/80 text-center space-y-4">
          <ChefHat className="w-10 h-10 text-amber-600 mx-auto" />
          <div className="space-y-1">
            <h2 className="font-serif-display text-xl font-bold text-stone-900">
              You Are Not Following Any Chefs Yet
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
              Follow chefs to see their latest recipes and cooking classes here. Joining any chef&apos;s VIP classes automatically follows them for you.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('explore')}
              className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Recipes</span>
            </button>
          </div>
        </div>
      ) : (
        <section className="space-y-4">
          <h2 className="font-serif-display text-xl font-bold text-stone-900">
            Chefs You Follow
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {followedChefs.map((chef) => {
              const isVip = isSubscribedToChef(chef.chefId);
              return (
                <div
                  key={chef.chefId}
                  className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <button
                      type="button"
                      onClick={() => onSelectChef(chef.chefId)}
                      className="shrink-0 cursor-pointer"
                    >
                      <UserAvatar
                        src={chef.chefPhoto}
                        seed={chef.chefId}
                        name={chef.chefName || 'Chef'}
                        size="lg"
                        className="ring-2 ring-amber-500/20"
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectChef(chef.chefId)}
                          className="font-serif-display text-base font-bold text-stone-900 hover:text-amber-700 transition-colors truncate cursor-pointer text-left"
                        >
                          {chef.chefName || 'Chef'}
                        </button>
                        {isVip && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                            <Crown className="w-3 h-3" />
                            <span>VIP</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-amber-700 font-medium truncate mt-0.5">
                        {chef.chefSpecialty || 'Artisanal Culinary Arts'}
                      </p>
                      <p className="text-[11px] text-stone-400 mt-1">
                        Following since {new Date(chef.followedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => onSelectChef(chef.chefId)}
                      className="flex-1 py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      View Kitchen
                    </button>
                    <button
                      type="button"
                      onClick={() => unfollowChef(chef.chefId)}
                      className="py-2 px-3 rounded-xl border border-stone-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-stone-600 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      title="Unfollow chef"
                    >
                      <HeartOff className="w-3.5 h-3.5" />
                      <span>Unfollow</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Latest Recipes from Followed Chefs */}
      {followedRecipes.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-stone-200/80">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-amber-600" />
            <h2 className="font-serif-display text-2xl font-bold text-stone-900">
              Recipes From Followed Chefs ({followedRecipes.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {followedRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                creatorProfile={creatorsMap?.[recipe.authorId]}
                onSelect={onSelectRecipe}
                onSelectChef={onSelectChef}
                onOpenAuthModal={() => onOpenAuthModal('login')}
                onShare={onShareRecipe}
              />
            ))}
          </div>
        </section>
      )}

      {/* Latest Videos from Followed Chefs */}
      {followedVideos.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-stone-200/80">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-amber-600" />
            <h2 className="font-serif-display text-2xl font-bold text-stone-900">
              Cooking Videos From Followed Chefs ({followedVideos.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {followedVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                creatorProfile={creatorsMap?.[video.authorId]}
                onSelectChef={onSelectChef}
                onPlay={onPlayVideo}
                onShare={onShareVideo}
                onCommentClick={onCommentVideo}
                onReport={onReportVideo}
                onRequestSubscribe={onRequestSubscribe}
                onOpenAuthModal={() => onOpenAuthModal('login')}
              />
            ))}
          </div>
        </section>
      )}

      {/* Discover Chefs to Follow */}
      {unfollowedChefs.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-stone-200/80">
          <h2 className="font-serif-display text-xl font-bold text-stone-900">
            Chefs You Can Follow
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {unfollowedChefs.map((chef) => {
              const following = isFollowingChef(chef.id);
              return (
                <div
                  key={chef.id}
                  className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => onSelectChef(chef.id)}
                    className="flex items-center gap-3 min-w-0 text-left cursor-pointer"
                  >
                    <UserAvatar
                      src={chef.photoURL}
                      seed={chef.id}
                      name={chef.displayName}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="font-serif-display text-sm font-bold text-stone-900 truncate">
                        {chef.displayName}
                      </p>
                      <p className="text-[11px] text-amber-700 font-medium truncate">
                        {chef.specialty || 'Artisanal Culinary Arts'}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      toggleFollowChef(chef.id, {
                        name: chef.displayName,
                        photo: chef.photoURL,
                        specialty: chef.specialty,
                      })
                    }
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 inline-flex items-center gap-1.5 cursor-pointer ${
                      following
                        ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    {following ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                    <span>{following ? 'Following' : 'Follow'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
