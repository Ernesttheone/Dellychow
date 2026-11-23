import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChefHat, 
  UtensilsCrossed, 
  Video, 
  Users, 
  Star, 
  Plus, 
  Settings, 
  MessageSquare, 
  Trash2, 
  Edit3, 
  Crown,
  Eye,
  ArrowRight,
  AlertCircle,
  Loader2,
  X,
  Sliders,
  Film,
  Copy,
  Check,
  Clock,
  Send
} from 'lucide-react';
import { Recipe, CookingVideo, VideoStudioProject } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { RecipeService } from '../../services/recipeService';
import { VideoStudioService } from '../../services/videoStudioService';
import { UserAvatar } from '../../components/UserAvatar';
import { formatRecipeTotalTime } from '../../lib/recipeTime';

interface ChefDashboardProps {
  recipes: Recipe[];
  videos: CookingVideo[];
  onNavigate: (view: string, params?: any) => void;
  onEditRecipe: (recipe: Recipe) => void;
  onOpenVideoCleanup?: () => void;
}

export const ChefDashboard: React.FC<ChefDashboardProps> = ({
  recipes,
  videos,
  onNavigate,
  onEditRecipe,
  onOpenVideoCleanup
}) => {
  const { currentUser, userProfile } = useAuth();
  const [videoToDelete, setVideoToDelete] = useState<CookingVideo | null>(null);
  const [deletingVideo, setDeletingVideo] = useState(false);
  const [videoDeleteError, setVideoDeleteError] = useState('');

  const [recipeToDelete, setRecipeToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deletingRecipe, setDeletingRecipe] = useState(false);

  const [studioDrafts, setStudioDrafts] = useState<VideoStudioProject[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameDraftTitle, setRenameDraftTitle] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<VideoStudioProject | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [publishingVideoId, setPublishingVideoId] = useState<string | null>(null);

  const chefRecipes = recipes.filter(r => r.authorId === currentUser?.uid);
  const chefVideos = videos.filter(v => v.authorId === currentUser?.uid);

  const loadStudioDrafts = useCallback(async () => {
    if (!currentUser?.uid) return;
    setLoadingDrafts(true);
    try {
      const list = await VideoStudioService.listUserProjects(currentUser.uid);
      setStudioDrafts(list);
    } catch {
      // fallback already handled in service
    } finally {
      setLoadingDrafts(false);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    loadStudioDrafts();
  }, [loadStudioDrafts]);

  // Analytics
  const totalViews = chefVideos.reduce((acc, v) => acc + (v.viewCount || 0), 0);
  const avgRating = chefRecipes.length > 0
    ? (chefRecipes.reduce((acc, r) => acc + (r.ratingAverage || 5.0), 0) / chefRecipes.length).toFixed(1)
    : '5.0';

  const handleConfirmDeleteRecipe = async () => {
    if (!recipeToDelete || deletingRecipe) return;
    setDeletingRecipe(true);
    try {
      await RecipeService.deleteRecipe(recipeToDelete.id);
      setRecipeToDelete(null);
    } catch (err) {
      console.error("Error deleting recipe:", err);
    } finally {
      setDeletingRecipe(false);
    }
  };

  const handleConfirmDeleteVideo = async () => {
    if (!videoToDelete || deletingVideo) return;
    setDeletingVideo(true);
    setVideoDeleteError('');
    try {
      await RecipeService.deleteVideo(videoToDelete.id);
      setVideoToDelete(null);
    } catch (err: any) {
      console.error("Error deleting video:", err);
      setVideoDeleteError(err?.message || 'Could not delete video. Please try again.');
    } finally {
      setDeletingVideo(false);
    }
  };

  const handleSaveRenameProject = async (proj: VideoStudioProject) => {
    const clean = renameDraftTitle.trim();
    if (!clean) {
      setRenamingProjectId(null);
      return;
    }
    await VideoStudioService.renameProject(proj, clean);
    setRenamingProjectId(null);
    await loadStudioDrafts();
  };

  const handleDuplicateDraft = async (proj: VideoStudioProject) => {
    await VideoStudioService.duplicateProject(proj);
    await loadStudioDrafts();
  };

  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete || !currentUser?.uid || deletingProject) return;
    setDeletingProject(true);
    try {
      await VideoStudioService.deleteProject(currentUser.uid, projectToDelete);
      setProjectToDelete(null);
      await loadStudioDrafts();
    } finally {
      setDeletingProject(false);
    }
  };

  const handlePublishDraftVideo = async (video: CookingVideo) => {
    setPublishingVideoId(video.id);
    try {
      await RecipeService.updateVideo(video.id, { status: 'published' });
    } finally {
      setPublishingVideoId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-stone-200">
        <div className="flex items-center gap-4">
          <UserAvatar
            src={userProfile?.photoURL}
            seed={currentUser?.uid}
            name={userProfile?.displayName}
            size="xl"
            className="ring-4 ring-amber-500/20"
          />
          <div>
            <div className="flex items-center gap-2 text-xs text-amber-700 font-semibold uppercase tracking-wider mb-0.5">
              <ChefHat className="w-4 h-4" />
              <span>Chef Studio Control Room</span>
            </div>
            <h1 className="font-serif-display text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Chef {userProfile?.displayName || 'Studio'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              {userProfile?.specialty || 'Artisanal Culinary Arts'} · Manage your recipes, videos, and VIP kitchen circles.
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('chef-create-recipe')}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Recipe</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('chef-upload-video')}
            className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Video className="w-4 h-4 text-amber-400" />
            <span>Upload Video</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('chef-upload-video', { openStudio: true })}
            className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-amber-700" />
            <span>Video Editing Studio</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('chef-community')}
            className="px-4 py-2.5 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5"
          >
            <MessageSquare className="w-4 h-4 text-amber-600" />
            <span>VIP Chat Room</span>
          </button>

          {onOpenVideoCleanup && (
            <button
              type="button"
              onClick={onOpenVideoCleanup}
              className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Administrator Video Cleanup Tool"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>Video Cleanup</span>
            </button>
          )}
        </div>
      </div>

      {/* Analytics KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">My Recipes</span>
            <UtensilsCrossed className="w-4 h-4 text-amber-600" />
          </div>
          <p className="font-serif-display text-3xl font-bold text-stone-900 tabular-nums">
            {chefRecipes.length}
          </p>
          <span className="text-[11px] text-stone-400">Published to DellyChow</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Video Tutorials</span>
            <Video className="w-4 h-4 text-amber-600" />
          </div>
          <p className="font-serif-display text-3xl font-bold text-stone-900 tabular-nums">
            {chefVideos.length}
          </p>
          <span className="text-[11px] text-stone-400">{(totalViews).toLocaleString()} total video views</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">VIP Subscribers</span>
            <Crown className="w-4 h-4 text-amber-600" />
          </div>
          <p className="font-serif-display text-3xl font-bold text-stone-900 tabular-nums">
            {userProfile?.subscriberCount || 0}
          </p>
          <span className="text-[11px] text-stone-400">Paying member tier</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Rating</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <p className="font-serif-display text-3xl font-bold text-stone-900 tabular-nums">
            {avgRating} <span className="text-xs text-stone-400 font-normal">/ 5.0</span>
          </p>
          <span className="text-[11px] text-stone-400">Food lover reviews</span>
        </div>
      </div>

      {/* Manage Recipes Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif-display text-xl sm:text-2xl font-bold text-stone-900">
            My Published Recipes ({chefRecipes.length})
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('chef-my-recipes')}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors flex items-center gap-1"
            >
              <span>Manage All Recipes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {chefRecipes.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white border border-stone-200/80 text-center space-y-3">
            <p className="font-serif-display text-base font-bold text-stone-800">You haven&apos;t published any recipes yet.</p>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Share your favorite meals with ingredients and preparation steps to inspire food lovers worldwide.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('chef-create-recipe')}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
            >
              Add Recipe
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-stone-200/80 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Recipe</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Cook Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {chefRecipes.slice(0, 8).map((r) => (
                    <tr key={r.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-stone-900 flex items-center gap-3">
                        <img
                          src={r.imageUrl}
                          alt={r.title}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <span className="truncate max-w-[200px]">{r.title}</span>
                      </td>
                      <td className="py-3 px-4 text-stone-600 capitalize">{r.category}</td>
                      <td className="py-3 px-4 text-stone-600 tabular-nums">{formatRecipeTotalTime(r)}</td>
                      <td className="py-3 px-4">
                        {r.status === 'draft' ? (
                          <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Draft (Private)
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Published
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEditRecipe(r)}
                            className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100"
                            title="Edit Recipe"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setRecipeToDelete({ id: r.id, title: r.title })}
                            className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 cursor-pointer"
                            title="Delete Recipe"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Saved Video Editing Studio Drafts Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-serif-display text-xl sm:text-2xl font-bold text-stone-900">
              Video Studio Projects &amp; Drafts ({studioDrafts.length})
            </h2>
            <p className="text-xs text-stone-500">
              Multi-track timelines with cuts, captions, music, and AI edits saved automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('chef-upload-video', { openStudio: true })}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>New Studio Project</span>
          </button>
        </div>

        {loadingDrafts ? (
          <div className="p-6 rounded-2xl bg-white border border-stone-200 flex items-center gap-2 text-xs text-stone-500">
            <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
            <span>Loading studio drafts...</span>
          </div>
        ) : studioDrafts.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white border border-stone-200/80 text-center space-y-2">
            <Film className="w-6 h-6 text-amber-600 mx-auto" />
            <p className="text-xs text-stone-600">
              No saved video editing projects yet. Launch the Video Editing Studio to start editing with cuts, voiceovers, music, and captions.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {studioDrafts.map((proj) => (
              <div key={proj.id} className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    {renamingProjectId === proj.id ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="text"
                          value={renameDraftTitle}
                          onChange={(e) => setRenameDraftTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRenameProject(proj);
                            if (e.key === 'Escape') setRenamingProjectId(null);
                          }}
                          className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-amber-400 bg-stone-50 focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRenameProject(proj)}
                          className="p-1.5 rounded-lg bg-amber-600 text-white cursor-pointer"
                          title="Save title"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <h4 className="font-bold text-xs sm:text-sm text-stone-900 truncate flex-1">{proj.title}</h4>
                    )}

                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                      {proj.cropRatio || '16:9'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
                    <span>{proj.clips?.length || 0} clip(s)</span>
                    <span>&bull;</span>
                    <span>{proj.audioTracks?.length || 0} audio</span>
                    <span>&bull;</span>
                    <span>{proj.textOverlays?.length || 0} text</span>
                  </div>

                  <p className="text-[10px] text-stone-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Updated {new Date(proj.updatedAt).toLocaleDateString()}</span>
                  </p>
                </div>

                <div className="pt-2.5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => onNavigate('chef-upload-video', { studioProject: proj, openStudio: true })}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Edit in Studio</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingProjectId(proj.id);
                        setRenameDraftTitle(proj.title);
                      }}
                      className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg cursor-pointer"
                      title="Rename project"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateDraft(proj)}
                      className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg cursor-pointer"
                      title="Duplicate project"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setProjectToDelete(proj)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manage Videos Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif-display text-xl sm:text-2xl font-bold text-stone-900">
            My Cooking Videos ({chefVideos.length})
          </h2>
          <button
            onClick={() => onNavigate('chef-upload-video')}
            className="text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload New Tutorial</span>
          </button>
        </div>

        {chefVideos.length === 0 ? (
          <div className="p-10 rounded-3xl bg-white border border-stone-200/80 text-center space-y-2">
            <p className="text-xs text-stone-500">No cooking videos uploaded yet.</p>
            <button
              onClick={() => onNavigate('chef-upload-video')}
              className="text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
            >
              Post your first step-by-step video guide
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {chefVideos.map((video) => (
              <div key={video.id} className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-3">
                <div className="relative aspect-16/9 rounded-xl overflow-hidden bg-stone-900">
                  <img
                    src={video.thumbnailUrl || video.videoUrl}
                    alt={video.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="bg-stone-900/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                      {video.durationMinutes}m
                    </span>
                    {video.status === 'draft' && (
                      <span className="bg-amber-500 text-stone-950 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                        Draft
                      </span>
                    )}
                  </div>
                  {video.isPremium && (
                    <div className="absolute top-2 right-2 bg-amber-600 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                      VIP
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-stone-900 truncate">{video.title}</h4>
                  <p className="text-[11px] text-stone-500 line-clamp-1">{video.description}</p>
                </div>

                <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400">
                  <span>{(video.viewCount || 0).toLocaleString()} views</span>

                  <div className="flex items-center gap-2">
                    {video.status === 'draft' && (
                      <button
                        type="button"
                        disabled={publishingVideoId === video.id}
                        onClick={() => handlePublishDraftVideo(video)}
                        className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        <span>{publishingVideoId === video.id ? 'Publishing...' : 'Publish'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onNavigate('chef-upload-video', { editVideo: video, openStudio: true })}
                      className="text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>Edit in Studio</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setVideoDeleteError('');
                        setVideoToDelete(video);
                      }}
                      className="text-red-500 hover:text-red-700 font-medium cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* In-App Video Delete Confirmation Modal */}
      {videoToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => !deletingVideo && setVideoToDelete(null)}
        >
          <div
            className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-5 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              disabled={deletingVideo}
              onClick={() => setVideoToDelete(null)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors disabled:opacity-50 cursor-pointer"
              aria-label="Close delete confirmation"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1 pr-6">
                <h3 className="font-serif-display text-lg font-bold text-stone-900">
                  Delete Cooking Video?
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-semibold text-stone-800">&ldquo;{videoToDelete.title}&rdquo;</span>? This removes it from your profile and storage.
                </p>
              </div>
            </div>

            {videoDeleteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{videoDeleteError}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                disabled={deletingVideo}
                onClick={() => setVideoToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingVideo}
                onClick={handleConfirmDeleteVideo}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {deletingVideo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Video</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Studio Project Delete Confirmation Modal */}
      {projectToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => !deletingProject && setProjectToDelete(null)}
        >
          <div
            className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-5 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <h3 className="font-serif-display text-lg font-bold text-stone-900">Delete Studio Project?</h3>
              <p className="text-xs text-stone-500">
                Permanently delete &ldquo;{projectToDelete.title}&rdquo; and its cached studio timeline?
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={deletingProject}
                onClick={() => setProjectToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingProject}
                onClick={handleConfirmDeleteProject}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs cursor-pointer"
              >
                {deletingProject ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Recipe Delete Confirmation Modal */}
      {recipeToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => !deletingRecipe && setRecipeToDelete(null)}
        >
          <div
            className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-5 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <h3 className="font-serif-display text-lg font-bold text-stone-900">Delete Recipe?</h3>
              <p className="text-xs text-stone-500">
                Are you sure you want to permanently delete &ldquo;{recipeToDelete.title}&rdquo;?
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={deletingRecipe}
                onClick={() => setRecipeToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingRecipe}
                onClick={handleConfirmDeleteRecipe}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs cursor-pointer"
              >
                {deletingRecipe ? 'Deleting...' : 'Delete Recipe'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
