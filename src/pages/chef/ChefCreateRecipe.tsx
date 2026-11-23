import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, 
  Upload, 
  Image as ImageIcon, 
  Video, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  FileText, 
  Clock, 
  Tag, 
  PlayCircle,
  X
} from 'lucide-react';
import { Recipe } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { RecipeService } from '../../services/recipeService';
import { ASSET_IMAGES } from '../../assets/images';
import { processDeviceImage } from '../../lib/imageUtils';
import { uploadVideoToFirebaseStorage, validateVideoFile } from '../../lib/videoStorage';
import { formatMinutesLabel } from '../../lib/recipeTime';

interface ChefCreateRecipeProps {
  recipeToEdit?: Recipe | null;
  onBack: () => void;
  onSuccess: () => void;
}

const CATEGORY_OPTIONS = [
  'Rice',
  'Soups',
  'Snacks',
  'Drinks',
  'Breakfast',
  'Lunch',
  'Dinner',
  'Desserts'
];

export const ChefCreateRecipe: React.FC<ChefCreateRecipeProps> = ({
  recipeToEdit,
  onBack,
  onSuccess
}) => {
  const { currentUser, userProfile } = useAuth();
  const isEditing = !!recipeToEdit;

  // 1. Recipe Name
  const [recipeName, setRecipeName] = useState(recipeToEdit?.title || '');

  // 2. Recipe Image
  const [imageUrl, setImageUrl] = useState(recipeToEdit?.imageUrl || '');
  const [imageProcessing, setImageProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 3. Description
  const [description, setDescription] = useState(recipeToEdit?.description || '');

  // 4. Ingredients
  const [ingredients, setIngredients] = useState<string[]>(
    recipeToEdit?.ingredients || [
      '2 cups long-grain rice',
      '4 fresh plum tomatoes & 2 bell peppers',
      '2 tbsp vegetable oil',
      '1 tsp thyme & curry powder'
    ]
  );
  const [newIngredient, setNewIngredient] = useState('');

  // 5. Cooking Instructions
  const [steps, setSteps] = useState<string[]>(
    recipeToEdit?.steps || [
      'Blend the tomatoes, peppers, and onions until smooth.',
      'Heat oil in a medium saucepan and sauté seasoned paste until fragrant.',
      'Stir in the washed rice, season to taste, and simmer covered on low heat until tender.'
    ]
  );
  const [newStep, setNewStep] = useState('');

  // 6. Preparation Time & Cooking Time (in minutes - optional, Total Time auto-calculated)
  const [prepTime, setPrepTime] = useState<number | string>(
    recipeToEdit?.prepTimeMinutes && recipeToEdit.prepTimeMinutes > 0 ? recipeToEdit.prepTimeMinutes : ''
  );
  const [cookingTime, setCookingTime] = useState<number | string>(
    recipeToEdit?.cookTimeMinutes && recipeToEdit.cookTimeMinutes > 0 ? recipeToEdit.cookTimeMinutes : ''
  );

  // 7. Food Category (e.g. Rice, Soups, Snacks, Drinks)
  const [category, setCategory] = useState<string>(recipeToEdit?.category || 'Rice');
  const [customCategory, setCustomCategory] = useState('');

  // 8. Cooking Video (optional video upload or video link)
  const [videoUrl, setVideoUrl] = useState(recipeToEdit?.videoUrl || '');
  const [videoFileName, setVideoFileName] = useState('');
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [savingAction, setSavingAction] = useState<'draft' | 'published' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle local device picture upload with compression
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImageProcessing(true);
      setErrorMsg('');
      const compressedUrl = await processDeviceImage(file, 960, 0.85);
      setImageUrl(compressedUrl);
    } catch (err: any) {
      console.error('Image compression failed:', err);
      setErrorMsg(err.message || 'Unable to process image from device.');
    } finally {
      setImageProcessing(false);
    }
  };

  // Handle local device video selection (uploaded to Firebase Storage on save)
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Please select a valid video file (MP4, WebM, MOV).');
      return;
    }

    setErrorMsg('');
    setSelectedVideoFile(file);
    setVideoFileName(file.name);
    // Create preview object URL for the local video
    const localVideoUrl = URL.createObjectURL(file);
    setVideoUrl(localVideoUrl);
  };

  // Add ingredient item
  const handleAddIngredient = () => {
    if (newIngredient.trim()) {
      setIngredients([...ingredients, newIngredient.trim()]);
      setNewIngredient('');
    }
  };

  const handleRemoveIngredient = (idx: number) => {
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };

  // Add instruction step
  const handleAddStep = () => {
    if (newStep.trim()) {
      setSteps([...steps, newStep.trim()]);
      setNewStep('');
    }
  };

  const handleRemoveStep = (idx: number) => {
    setSteps(steps.filter((_, i) => i !== idx));
  };

  // Save recipe either as draft or published
  const handleSave = async (targetStatus: 'draft' | 'published') => {
    if (!currentUser) {
      setErrorMsg('You must be signed in as a chef to save recipes.');
      return;
    }

    if (!recipeName.trim()) {
      setErrorMsg('Please enter a Recipe Name for this meal.');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Please enter a short Description for the recipe.');
      return;
    }

    if (ingredients.length === 0) {
      setErrorMsg('Please add at least one ingredient.');
      return;
    }

    if (steps.length === 0) {
      setErrorMsg('Please add at least one cooking instruction step.');
      return;
    }

    const parsedPrepTime =
      prepTime === '' || prepTime === null ? 0 : Math.round(Number(prepTime));
    const parsedCookTime =
      cookingTime === '' || cookingTime === null ? 0 : Math.round(Number(cookingTime));

    if (
      (prepTime !== '' && (!Number.isFinite(parsedPrepTime) || parsedPrepTime < 0)) ||
      (cookingTime !== '' && (!Number.isFinite(parsedCookTime) || parsedCookTime < 0))
    ) {
      setErrorMsg('Preparation Time and Cooking Time must be valid non-negative minutes.');
      return;
    }

    setSubmitting(true);
    setSavingAction(targetStatus);
    setErrorMsg('');

    // Image is optional: if none uploaded, save empty string so UI adapts cleanly without stock fallback
    const finalImageUrl = imageUrl.trim();
    const finalCategory = (customCategory.trim() || category || 'Rice').trim();

    try {
      let finalVideoUrl = videoUrl.trim();

      if (selectedVideoFile) {
        setVideoUploadProgress(0);
        const videoAssetId = recipeToEdit?.id || `recipe_vid_${Date.now()}`;
        const uploadResult = await uploadVideoToFirebaseStorage(
          selectedVideoFile,
          selectedVideoFile.name,
          videoAssetId,
          currentUser.uid,
          (pct) => setVideoUploadProgress(pct)
        );
        finalVideoUrl = uploadResult.url;
        setVideoUploadProgress(null);
      } else if (finalVideoUrl.startsWith('blob:')) {
        throw new Error('Please re-select the video file so it can be uploaded to Firebase Storage.');
      }

      if (isEditing && recipeToEdit) {
        await RecipeService.updateRecipe(recipeToEdit.id, {
          title: recipeName.trim(),
          description: description.trim(),
          category: finalCategory,
          prepTimeMinutes: parsedPrepTime > 0 ? parsedPrepTime : 0,
          cookTimeMinutes: parsedCookTime > 0 ? parsedCookTime : 0,
          ingredients,
          steps,
          imageUrl: finalImageUrl,
          videoUrl: finalVideoUrl || undefined,
          status: targetStatus
        });
      } else {
        await RecipeService.createRecipe({
          authorId: currentUser.uid,
          authorName: userProfile?.displayName || 'Chef Tutor',
          authorPhoto: userProfile?.photoURL || ASSET_IMAGES.chefAvatar,
          title: recipeName.trim(),
          description: description.trim(),
          category: finalCategory,
          cuisine: finalCategory === 'Rice' ? 'African / Continental' : 'Specialty',
          prepTimeMinutes: parsedPrepTime > 0 ? parsedPrepTime : undefined,
          cookTimeMinutes: parsedCookTime > 0 ? parsedCookTime : undefined,
          servings: 4,
          ingredients,
          steps,
          imageUrl: finalImageUrl,
          videoUrl: finalVideoUrl || undefined,
          status: targetStatus,
          ratingAverage: 5.0,
          ratingCount: 1
        });
      }

      onSuccess();
    } catch (err: any) {
      console.error('Failed to save recipe:', err);
      setErrorMsg(err.message || 'Failed to save recipe. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
      setSavingAction(null);
      setVideoUploadProgress(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header & Back Button */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-200">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Chef Studio</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Chef Studio Recipe Editor</span>
        </div>
      </div>

      <div>
        <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
          {isEditing ? `Edit Recipe: ${recipeToEdit?.title}` : 'Add New Recipe'}
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Complete the recipe details below to save as draft or publish to DellyChow food lovers worldwide.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-700 text-xs sm:text-sm rounded-2xl border border-red-200 flex items-start gap-2">
          <span className="font-bold">Error:</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form Containing Only The 8 Requested Fields */}
      <div className="space-y-6">

        {/* 1. Recipe Name */}
        <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-7 shadow-2xs space-y-2">
          <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
            1. Recipe Name *
          </label>
          <p className="text-xs text-stone-500">The title or name of the meal.</p>
          <input
            type="text"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder="e.g. Smoky Party Jollof Rice with Fried Plantains"
            maxLength={120}
            className="w-full text-sm sm:text-base px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50 font-medium text-stone-900"
          />
        </div>

        {/* 2. Recipe Image */}
        <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-7 shadow-2xs space-y-3">
          <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
            2. Recipe Image (Optional)
          </label>
          <p className="text-xs text-stone-500">
            Upload a picture of the meal from your device, or leave empty if you prefer a text-only recipe post.
          </p>

          <div className="space-y-4">
            {/* Device Upload Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={imageProcessing}
                className="w-full md:w-auto px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
              >
                <Upload className="w-4 h-4" />
                <span>{imageProcessing ? 'Processing Image...' : 'Upload Picture From Device'}</span>
              </button>

              <span className="hidden md:inline text-xs text-stone-400 text-left">or enter photo link:</span>

              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://... photo URL"
                className="hidden md:block flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
              />
            </div>

            {/* Image Preview */}
            {imageUrl ? (
              <div className="relative aspect-16/9 max-w-md rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 shadow-inner group">
                <img
                  src={imageUrl}
                  alt="Meal preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-stone-900/80 text-white hover:bg-red-600 transition-colors"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-stone-200 hover:border-amber-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-stone-50/50"
              >
                <ImageIcon className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-stone-700">No meal picture uploaded (optional)</p>
                <p className="text-[11px] text-stone-400 mt-0.5">Click to choose a photo, or leave empty to publish without a cover image</p>
              </div>
            )}
          </div>
        </div>

        {/* 3. Description */}
        <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-7 shadow-2xs space-y-2">
          <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
            3. Description *
          </label>
          <p className="text-xs text-stone-500">A short explanation of the recipe.</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A rich, mouthwatering West African classic made with infused tomato paste, aromatic herbs, and long-grain rice..."
            rows={3}
            maxLength={600}
            className="w-full text-xs sm:text-sm p-4 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50 leading-relaxed"
          />
        </div>

        {/* 4. Ingredients */}
        <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-7 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                4. Ingredients * ({ingredients.length})
              </label>
              <p className="text-xs text-stone-500 mt-0.5">List the ingredients needed for this meal.</p>
            </div>
          </div>

          <div className="space-y-2">
            {ingredients.map((ing, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs sm:text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                  <span className="text-stone-800 font-medium">{ing}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveIngredient(idx)}
                  className="p-1 text-stone-400 hover:text-red-600 transition-colors"
                  title="Remove ingredient"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={newIngredient}
              onChange={(e) => setNewIngredient(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddIngredient();
                }
              }}
              placeholder="e.g. 1 tbsp ground ginger or 2 fresh habanero peppers"
              className="flex-1 text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
            />
            <button
              type="button"
              onClick={handleAddIngredient}
              className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* 5. Cooking Instructions */}
        <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-7 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                5. Cooking Instructions * ({steps.length} steps)
              </label>
              <p className="text-xs text-stone-500 mt-0.5">Simple, step-by-step preparation instructions.</p>
            </div>
          </div>

          <div className="space-y-3">
            {steps.map((st, idx) => (
              <div 
                key={idx}
                className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs sm:text-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-stone-800 leading-relaxed">{st}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveStep(idx)}
                  className="p-1 text-stone-400 hover:text-red-600 transition-colors shrink-0"
                  title="Remove step"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-1">
            <textarea
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              placeholder="Describe the next preparation step..."
              rows={2}
              className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
            />
            <button
              type="button"
              onClick={handleAddStep}
              className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Step</span>
            </button>
          </div>
        </div>

        {/* 6. Preparation & Cooking Time */}
        <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-7 shadow-2xs space-y-5">
          <div>
            <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
              6. Preparation &amp; Cooking Time (Optional)
            </label>
            <p className="text-xs text-stone-500 mt-0.5">
              Enter Preparation Time and Cooking Time in minutes. Total time is calculated automatically, or leave blank to show &quot;Time not specified&quot;.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Preparation Time */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-stone-50/80 border border-stone-200/70">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="recipe-prep-time" className="text-xs font-bold text-stone-800">
                  Preparation Time
                </label>
                {prepTime !== '' && (
                  <button
                    type="button"
                    onClick={() => setPrepTime('')}
                    className="text-[11px] font-semibold text-stone-500 hover:text-amber-700 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="recipe-prep-time"
                  type="number"
                  min={0}
                  max={480}
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  placeholder="e.g. 10"
                  className="w-full text-base font-semibold px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white pr-14 tabular-nums"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-medium">
                  mins
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[5, 10, 15, 20, 30].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPrepTime(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      Number(prepTime) === t
                        ? 'bg-amber-600 text-white'
                        : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {t}m
                  </button>
                ))}
              </div>
            </div>

            {/* Cooking Time */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-stone-50/80 border border-stone-200/70">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="recipe-cook-time" className="text-xs font-bold text-stone-800">
                  Cooking Time
                </label>
                {cookingTime !== '' && (
                  <button
                    type="button"
                    onClick={() => setCookingTime('')}
                    className="text-[11px] font-semibold text-stone-500 hover:text-amber-700 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="recipe-cook-time"
                  type="number"
                  min={0}
                  max={480}
                  value={cookingTime}
                  onChange={(e) => setCookingTime(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  placeholder="e.g. 20"
                  className="w-full text-base font-semibold px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white pr-14 tabular-nums"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-medium">
                  mins
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[15, 20, 30, 45, 60].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCookingTime(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      Number(cookingTime) === t
                        ? 'bg-amber-600 text-white'
                        : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {t}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Calculated Total Time */}
          {(() => {
            const p = prepTime !== '' && Number(prepTime) > 0 ? Math.round(Number(prepTime)) : 0;
            const c = cookingTime !== '' && Number(cookingTime) > 0 ? Math.round(Number(cookingTime)) : 0;
            const total = p + c;
            return (
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs">
                <div className="flex items-center gap-2 font-semibold text-stone-800">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Total Time (Prep + Cooking):</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-800 tabular-nums">
                    {total > 0 ? formatMinutesLabel(total) : 'Time not specified'}
                  </span>
                  {p > 0 && c > 0 && (
                    <span className="text-[11px] text-stone-500 tabular-nums">
                      ({p} mins prep + {c} mins cook)
                    </span>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* 7. Food Category */}
        <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-7 shadow-2xs space-y-3">
          <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
            7. Food Category *
          </label>
          <p className="text-xs text-stone-500">e.g., Rice, Soups, Snacks, or Drinks.</p>

          {/* Quick Select Buttons */}
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategory(cat);
                  setCustomCategory('');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  category === cat && !customCategory
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="pt-2">
            <input
              type="text"
              value={customCategory}
              onChange={(e) => {
                setCustomCategory(e.target.value);
                if (e.target.value) setCategory(e.target.value);
              }}
              placeholder="Or enter a custom category (e.g. Seafood, Pasta, Salads)..."
              className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
            />
          </div>
        </div>

        {/* 8. Cooking Video */}
        <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-7 shadow-2xs space-y-3">
          <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
            8. Cooking Video (Optional)
          </label>
          <p className="text-xs text-stone-500">
            Upload a video or provide a video link showing your preparation steps.
          </p>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs transition-colors flex items-center justify-center gap-2 border border-stone-200 cursor-pointer"
              >
                <Video className="w-4 h-4 text-amber-600" />
                <span>Choose Video File</span>
              </button>

              <span className="text-xs text-stone-400 text-center sm:text-left">or video URL:</span>

              <input
                type="url"
                value={videoUrl}
                onChange={(e) => {
                  setSelectedVideoFile(null);
                  setVideoFileName('');
                  setVideoUrl(e.target.value);
                }}
                placeholder="https://www.youtube.com/watch?v=... or direct MP4 link"
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
              />
            </div>

            {videoFileName && (
              <p className="text-xs text-amber-700 font-medium">
                Selected video: {videoFileName}
              </p>
            )}

            {videoUploadProgress !== null && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-700">
                  <span>Uploading video to Firebase Storage...</span>
                  <span className="tabular-nums">{videoUploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-600 transition-all duration-200"
                    style={{ width: `${videoUploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Video Preview */}
            {videoUrl && (
              <div className="relative aspect-16/9 max-w-md rounded-2xl overflow-hidden bg-black shadow-md">
                {videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
                  <iframe
                    src={videoUrl.includes('embed') ? videoUrl : `https://www.youtube.com/embed/${videoUrl.split('v=')[1]?.split('&')[0] || ''}`}
                    title="Video preview"
                    className="w-full h-full border-0"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (videoUrl.startsWith('blob:')) {
                      URL.revokeObjectURL(videoUrl);
                    }
                    setSelectedVideoFile(null);
                    setVideoUrl('');
                    setVideoFileName('');
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-stone-900/80 text-white hover:bg-red-600 transition-colors"
                  title="Remove video"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Action Buttons: Save as Draft and Publish Recipe */}
      <div className="pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-3 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-semibold text-xs uppercase tracking-wider transition-colors text-center order-3 sm:order-1"
        >
          Cancel
        </button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 order-1 sm:order-2">
          {/* Save as Draft Button */}
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSave('draft')}
            className="px-6 py-3 rounded-xl border border-amber-600 text-amber-800 bg-amber-50 hover:bg-amber-100 font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-2xs disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-amber-700" />
            <span>{submitting && savingAction === 'draft' ? 'Saving Draft...' : 'Save as Draft'}</span>
          </button>

          {/* Publish Recipe Button */}
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSave('published')}
            className="px-7 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting && savingAction === 'published' ? 'Publishing...' : isEditing ? 'Update Recipe' : 'Publish Recipe'}</span>
          </button>
        </div>
      </div>

    </div>
  );
};
