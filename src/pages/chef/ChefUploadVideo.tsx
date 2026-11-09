import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Video, 
  Save, 
  Upload, 
  Sparkles, 
  Lock, 
  Clock,
  Camera,
  Play,
  Pause,
  Square,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Film,
  Check,
  Loader2,
  FlipHorizontal,
  Globe,
  Link as LinkIcon
} from 'lucide-react';
import { Recipe, CookingVideo } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { RecipeService } from '../../services/recipeService';
import { ASSET_IMAGES } from '../../assets/images';
import { extractVideoMetadataAndThumbnail, uploadVideoToServer, validateVideoFile } from '../../lib/videoStorage';

interface ChefUploadVideoProps {
  recipes: Recipe[];
  onBack: () => void;
  onSuccess: () => void;
}

export const ChefUploadVideo: React.FC<ChefUploadVideoProps> = ({
  recipes,
  onBack,
  onSuccess
}) => {
  const { currentUser, userProfile } = useAuth();

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState(ASSET_IMAGES.trufflePasta);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [category, setCategory] = useState('Technique');
  const [recipeId, setRecipeId] = useState('');
  const [isPremium, setIsPremium] = useState(false);

  // Nutritional Information (optional)
  const [calories, setCalories] = useState<number | ''>('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  // Video Submission State (Recorded, Uploaded, or Web URL)
  const [videoSourceType, setVideoSourceType] = useState<'none' | 'record' | 'upload' | 'url'>('none');
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [videoFileSizeMB, setVideoFileSizeMB] = useState<string | null>(null);

  // Camera & Recording State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [supportsPause, setSupportsPause] = useState(true);

  // Submission & Progress State
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressStatusText, setProgressStatusText] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Refs
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Chef's own published recipes to link to
  const myRecipes = recipes.filter(r => r.authorId === currentUser?.uid);

  // Cleanup camera stream and timers on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
      if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, []);

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // 1. OPTION 1: RECORD A VIDEO
  const handleStartCamera = async (facing: 'user' | 'environment' = cameraFacingMode) => {
    setCameraError(null);
    setErrorMsg('');
    stopCameraStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera recording is not supported by your browser.');
      }

      // Request camera and microphone access strictly when user chooses to record
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });

      mediaStreamRef.current = stream;
      setIsCameraActive(true);
      setRecordingState('idle');
      setRecordingSeconds(0);
      setVideoSourceType('record');

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play().catch(() => {
          // Play was prevented or user switched tab
        });
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let message = 'Unable to access camera or microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera and microphone permission was denied. Please allow camera and mic permissions in your browser or device settings to record.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No camera or microphone was found on your device.';
      } else if (err.name === 'NotReadableError') {
        message = 'Camera is already in use by another application.';
      }
      setCameraError(message);
      setIsCameraActive(false);
    }
  };

  const handleToggleCameraFacing = () => {
    const nextFacing = cameraFacingMode === 'user' ? 'environment' : 'user';
    setCameraFacingMode(nextFacing);
    if (isCameraActive && recordingState === 'idle') {
      handleStartCamera(nextFacing);
    }
  };

  const startRecording = () => {
    if (!mediaStreamRef.current) return;
    recordedChunksRef.current = [];

    // Determine supported mimeType
    let mimeType = 'video/webm;codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      } else {
        mimeType = '';
      }
    }

    try {
      const recorder = mimeType 
        ? new MediaRecorder(mediaStreamRef.current, { mimeType })
        : new MediaRecorder(mediaStreamRef.current);

      setSupportsPause(typeof recorder.pause === 'function');

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const finalBlob = new Blob(recordedChunksRef.current, { 
          type: recorder.mimeType || 'video/webm' 
        });
        const preview = URL.createObjectURL(finalBlob);

        setVideoBlob(finalBlob);
        setVideoPreviewUrl(preview);
        setVideoFileName(`Chef_Cooking_Recording_${new Date().toISOString().slice(0, 10)}.webm`);
        setVideoFileSizeMB((finalBlob.size / (1024 * 1024)).toFixed(1));
        setRecordingState('stopped');
        stopCameraStream();

        // Automatically extract thumbnail and duration from recorded clip
        try {
          const { durationMinutes: autoDuration, thumbnailUrl: autoThumb } = 
            await extractVideoMetadataAndThumbnail(finalBlob);
          if (autoDuration) setDurationMinutes(autoDuration);
          if (autoThumb) setThumbnailUrl(autoThumb);
        } catch {
          // Fallback to defaults
        }
      };

      recorder.start(1000); // 1-second timeslices
      mediaRecorderRef.current = recorder;
      setRecordingState('recording');
      setRecordingSeconds(0);

      // Duration timer
      if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Failed to start MediaRecorder:', err);
      setCameraError('Failed to initialize video recording on this device.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.pause();
        setRecordingState('paused');
        if (timerIntervalRef.current) {
          window.clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      } catch (err) {
        console.warn('Pause error:', err);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      try {
        mediaRecorderRef.current.resume();
        setRecordingState('recording');
        timerIntervalRef.current = window.setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        console.warn('Resume error:', err);
      }
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleRetakeRecording = () => {
    if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoBlob(null);
    setVideoPreviewUrl(null);
    setVideoFileName(null);
    setVideoFileSizeMB(null);
    setRecordingState('idle');
    setRecordingSeconds(0);
    handleStartCamera(cameraFacingMode);
  };

  // 2. OPTION 2: UPLOAD AN EXISTING VIDEO FROM DEVICE
  const handleTriggerFileInput = () => {
    setCameraError(null);
    setErrorMsg('');
    stopCameraStream();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleDeviceFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Unsupported video file format.');
      return;
    }

    try {
      if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreviewUrl);
      }

      const preview = URL.createObjectURL(file);
      setVideoBlob(file);
      setVideoPreviewUrl(preview);
      setVideoFileName(file.name);
      setVideoFileSizeMB((file.size / (1024 * 1024)).toFixed(1));
      setVideoSourceType('upload');
      setErrorMsg('');

      // Extract duration and thumbnail
      const { durationMinutes: autoDuration, thumbnailUrl: autoThumb } = 
        await extractVideoMetadataAndThumbnail(file);
      if (autoDuration) setDurationMinutes(autoDuration);
      if (autoThumb) setThumbnailUrl(autoThumb);

    } catch (err: any) {
      console.warn('Metadata extraction notice:', err);
      // Still allow upload even if browser metadata preview was partial
    }
  };

  const handleRemoveVideo = () => {
    if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoBlob(null);
    setVideoPreviewUrl(null);
    setVideoFileName(null);
    setVideoFileSizeMB(null);
    setCustomVideoUrl('');
    setVideoSourceType('none');
    setRecordingState('idle');
    stopCameraStream();
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Form Submission Validation
  const handleOpenConfirmModal = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const hasVideo = videoBlob || (videoSourceType === 'url' && customVideoUrl.trim());
    if (!hasVideo) {
      setErrorMsg('Please record a video, select a video file, or enter a video URL.');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Please enter a video tutorial title.');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Please enter a summary of what viewers will learn.');
      return;
    }

    // Do not automatically publish without user confirmation modal
    setShowConfirmModal(true);
  };

  // Final Confirmed Publish Handler
  const handleConfirmPublish = async () => {
    if (!currentUser) return;
    const isUrlSource = videoSourceType === 'url' && customVideoUrl.trim();
    if (!videoBlob && !isUrlSource) return;

    setShowConfirmModal(false);
    setSubmitting(true);
    setUploadProgress(10);
    setProgressStatusText('Preparing video for universal cross-device playback...');

    try {
      // 1. Generate unique video ID
      const newVideoId = RecipeService.generateVideoId();
      let finalPublicUrl = '';

      if (isUrlSource) {
        finalPublicUrl = customVideoUrl.trim();
        setUploadProgress(70);
        setProgressStatusText('Linking web video tutorial...');
      } else if (videoBlob) {
        const ext = videoBlob.type.includes('webm') ? '.webm' : videoBlob.type.includes('mov') ? '.mov' : '.mp4';
        const filename = videoFileName || `video_${newVideoId}${ext}`;

        // 2. Upload video binary directly to server so all food lovers on all devices have permanent streaming access
        setProgressStatusText('Uploading video masterclass to server...');
        const uploadResult = await uploadVideoToServer(videoBlob, filename, newVideoId, (pct) => {
          setUploadProgress(15 + Math.round(pct * 0.75)); // 15% to 90%
          setProgressStatusText(`Streaming video to server (${pct}%)...`);
        });

        if (!uploadResult?.url) {
          throw new Error('Video upload failed: server did not return a valid stream URL.');
        }

        finalPublicUrl = uploadResult.url;
      }

      setProgressStatusText('Publishing masterclass to your chef profile...');
      setUploadProgress(95);

      // 5. Build clean video payload with public streaming URL
      const videoData: Omit<CookingVideo, 'id' | 'createdAt'> = {
        authorId: currentUser.uid,
        authorName: userProfile?.displayName || 'Chef',
        authorPhoto: userProfile?.photoURL || ASSET_IMAGES.chefAvatar,
        title: title.trim(),
        description: description.trim(),
        videoUrl: finalPublicUrl,
        thumbnailUrl: thumbnailUrl.trim() || ASSET_IMAGES.trufflePasta,
        durationMinutes: Number(durationMinutes) || 15,
        category: category.trim(),
        isPremium,
        viewCount: 1,
        likesCount: 0
      };

      if (recipeId && recipeId.trim()) {
        videoData.recipeId = recipeId.trim();
        const linkedRecipe = recipes.find(r => r.id === recipeId.trim());
        if (linkedRecipe) {
          videoData.attachedRecipe = {
            id: linkedRecipe.id,
            title: linkedRecipe.title,
            description: linkedRecipe.description,
            servings: linkedRecipe.servings || 4,
            cookTimeMinutes: linkedRecipe.cookTimeMinutes || 30,
            ingredients: linkedRecipe.ingredients || [],
            steps: linkedRecipe.steps || []
          };
        }
      }

      if (calories || protein.trim() || carbs.trim() || fat.trim()) {
        const nut: any = {};
        if (calories) nut.calories = Number(calories);
        if (protein.trim()) nut.protein = protein.trim();
        if (carbs.trim()) nut.carbs = carbs.trim();
        if (fat.trim()) nut.fat = fat.trim();
        videoData.nutritionInfo = nut;
      }

      await RecipeService.createVideo(videoData, newVideoId);

      setUploadProgress(100);
      setProgressStatusText('Published successfully! Redirecting...');
      setTimeout(() => {
        onSuccess();
      }, 700);

    } catch (err: any) {
      console.error('Video upload error:', err);
      setErrorMsg(err.message || 'Failed to publish video. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Hidden Native File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleDeviceFileSelected}
        accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/*"
        className="hidden"
      />

      {/* Top Navigation */}
      <div>
        <button
          onClick={() => {
            stopCameraStream();
            onBack();
          }}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to studio</span>
        </button>
      </div>

      <div>
        <h1 className="font-serif-display text-3xl font-bold text-stone-900 tracking-tight">
          Submit Cooking Video Tutorial
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Record a new culinary tutorial directly using your device camera, or upload an existing video from your device.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Progress Bar (displayed during upload) */}
      {submitting && (
        <div className="bg-white rounded-3xl border border-amber-200 p-6 shadow-md space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-900 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
              <span>{progressStatusText}</span>
            </span>
            <span className="font-semibold text-amber-700 tabular-nums">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-amber-600 h-full rounded-full transition-all duration-300 ease-out shadow-xs"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      <form onSubmit={handleOpenConfirmModal} className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-8 shadow-xs space-y-8">
        
        {/* SECTION: VIDEO SELECTION / RECORDING */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider">
                Video Submission *
              </label>
              <p className="text-xs text-stone-500 mt-0.5">
                Choose between recording live with your camera, uploading a video file, or pasting a web video link.
              </p>
            </div>
            {(videoBlob || (videoSourceType === 'url' && customVideoUrl.trim())) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Video Ready</span>
              </span>
            )}
          </div>

          {/* Option Selector Buttons */}
          {!videoBlob && !isCameraActive && videoSourceType !== 'url' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Option 1 Button: Record a Video */}
              <button
                type="button"
                onClick={() => handleStartCamera()}
                aria-label="Record a Video"
                className="p-5 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-500 transition-all text-left flex flex-col justify-between gap-3 group focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif-display text-sm font-bold text-stone-900 group-hover:text-amber-800 transition-colors">
                      Record Live
                    </h4>
                    <p className="text-[10px] text-stone-500">
                      Camera & mic
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Film your cooking tutorial directly using your mobile or computer camera.
                </p>

                <div className="w-full py-2 px-3 rounded-xl bg-amber-600 group-hover:bg-amber-700 text-white text-[11px] font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1.5 transition-colors shadow-xs">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Record</span>
                </div>
              </button>

              {/* Option 2 Button: Upload from Device */}
              <button
                type="button"
                onClick={handleTriggerFileInput}
                aria-label="Upload from Device"
                className="p-5 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50/60 hover:bg-stone-50 hover:border-stone-500 transition-all text-left flex flex-col justify-between gap-3 group focus:outline-none focus:ring-2 focus:ring-stone-500 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                    <Upload className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-serif-display text-sm font-bold text-stone-900 group-hover:text-stone-700 transition-colors">
                      Upload File
                    </h4>
                    <p className="text-[10px] text-stone-500">
                      MP4, MOV, WebM
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Choose an existing video file saved in your gallery or device folders.
                </p>

                <div className="w-full py-2 px-3 rounded-xl bg-stone-900 group-hover:bg-stone-800 text-white text-[11px] font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1.5 transition-colors shadow-xs">
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Upload</span>
                </div>
              </button>

              {/* Option 3 Button: Video URL */}
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setVideoSourceType('url');
                }}
                aria-label="Paste Video URL"
                className="p-5 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-500 transition-all text-left flex flex-col justify-between gap-3 group focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif-display text-sm font-bold text-stone-900 group-hover:text-blue-800 transition-colors">
                      Video URL
                    </h4>
                    <p className="text-[10px] text-stone-500">
                      YouTube, Vimeo, MP4
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Link an online tutorial from YouTube, Vimeo, or a public direct video stream.
                </p>

                <div className="w-full py-2 px-3 rounded-xl bg-blue-600 group-hover:bg-blue-700 text-white text-[11px] font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1.5 transition-colors shadow-xs">
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Enter Link</span>
                </div>
              </button>

            </div>
          )}

          {/* Option 3 UI: Video URL Input Card */}
          {videoSourceType === 'url' && (
            <div className="bg-stone-900 rounded-2xl p-5 text-white border border-stone-800 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Online Video Link
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveVideo}
                  className="text-stone-400 hover:text-white text-xs font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Change Source</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] text-stone-300 mb-1.5 font-medium">
                  Direct Video URL or Embed Link (YouTube, Vimeo, or hosted MP4):
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customVideoUrl}
                    onChange={(e) => setCustomVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or https://example.com/video.mp4"
                    className="flex-1 text-xs px-4 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {customVideoUrl.trim() && (
                <div className="pt-2 border-t border-stone-800 space-y-2">
                  <p className="text-[11px] text-stone-400">Stream preview:</p>
                  <div className="aspect-16/9 bg-black rounded-xl overflow-hidden border border-stone-800 max-h-56">
                    {customVideoUrl.includes('youtube.com') || customVideoUrl.includes('youtu.be') ? (
                      <iframe
                        src={customVideoUrl.includes('watch?v=') 
                          ? `https://www.youtube.com/embed/${customVideoUrl.split('watch?v=')[1]?.split('&')[0]}`
                          : customVideoUrl.includes('youtu.be/')
                          ? `https://www.youtube.com/embed/${customVideoUrl.split('youtu.be/')[1]?.split('?')[0]}`
                          : customVideoUrl}
                        title="URL Preview"
                        className="w-full h-full border-0"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={customVideoUrl}
                        controls
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Camera Error Message */}
          {cameraError && (
            <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-start justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
              <button
                type="button"
                onClick={() => setCameraError(null)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Live Camera Viewfinder & Controls (Active during recording mode) */}
          {isCameraActive && (
            <div className="rounded-2xl overflow-hidden bg-black border border-stone-800 shadow-lg space-y-0 relative animate-in fade-in">
              
              {/* Live Video Viewfinder */}
              <div className="relative aspect-16/9 bg-stone-950 flex items-center justify-center">
                <video
                  ref={liveVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraFacingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />

                {/* Recording Duration Indicator Overlay */}
                {recordingState !== 'idle' && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-stone-950/80 backdrop-blur-xs text-white px-3 py-1.5 rounded-full text-xs font-bold border border-white/10 shadow-lg">
                    <span className={`w-2.5 h-2.5 rounded-full ${recordingState === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} />
                    <span className="tabular-nums tracking-wider">{formatTimer(recordingSeconds)}</span>
                    <span className="text-[10px] text-stone-400 uppercase font-medium">
                      {recordingState === 'recording' ? 'REC' : 'PAUSED'}
                    </span>
                  </div>
                )}

                {/* Flip Camera Button (mobile/tablet front & back camera switch) */}
                {recordingState === 'idle' && (
                  <button
                    type="button"
                    onClick={handleToggleCameraFacing}
                    className="absolute top-4 right-4 p-2 bg-stone-900/80 hover:bg-stone-800 text-white rounded-full backdrop-blur-xs transition-colors flex items-center gap-1.5 text-xs font-semibold border border-white/10 shadow-md"
                    title="Flip camera"
                  >
                    <FlipHorizontal className="w-4 h-4" />
                    <span className="hidden sm:inline">Flip Camera</span>
                  </button>
                )}
              </div>

              {/* Viewfinder Action Toolbar */}
              <div className="p-4 bg-stone-900 text-white flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-stone-300">
                  {recordingState === 'idle' && 'Position your camera and click "Start Recording" when ready.'}
                  {recordingState === 'recording' && 'Recording tutorial audio and video...'}
                  {recordingState === 'paused' && 'Recording paused. Click "Resume" to continue.'}
                </div>

                <div className="flex items-center gap-2">
                  {recordingState === 'idle' && (
                    <>
                      <button
                        type="button"
                        onClick={stopCameraStream}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={startRecording}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center gap-2"
                      >
                        <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
                        <span>Start Recording</span>
                      </button>
                    </>
                  )}

                  {recordingState === 'recording' && (
                    <>
                      {supportsPause && (
                        <button
                          type="button"
                          onClick={pauseRecording}
                          className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center gap-2"
                      >
                        <Square className="w-3.5 h-3.5 fill-white" />
                        <span>Stop & Preview</span>
                      </button>
                    </>
                  )}

                  {recordingState === 'paused' && (
                    <>
                      <button
                        type="button"
                        onClick={resumeRecording}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Resume</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center gap-2"
                      >
                        <Square className="w-3.5 h-3.5 fill-white" />
                        <span>Finish Recording</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Video Preview Player & Actions (When video has been recorded or selected) */}
          {videoBlob && videoPreviewUrl && (
            <div className="bg-stone-900 rounded-2xl overflow-hidden border border-stone-800 shadow-md space-y-0 text-white animate-in fade-in">
              <div className="relative aspect-16/9 bg-black">
                <video
                  src={videoPreviewUrl}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Preview Footer Strip */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900 border-t border-stone-800">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-amber-400 shrink-0" />
                    <p className="text-xs font-bold text-white truncate max-w-sm">
                      {videoFileName || 'Selected Video'}
                    </p>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    {videoFileSizeMB ? `${videoFileSizeMB} MB · ` : ''}
                    {videoSourceType === 'record' ? 'Camera recording' : 'Device file'} · Ready for submission
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {videoSourceType === 'record' ? (
                    <button
                      type="button"
                      onClick={handleRetakeRecording}
                      className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retake Video</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleTriggerFileInput}
                      className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>Replace Video</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    className="px-3 py-1.5 bg-stone-800 hover:bg-red-950/60 hover:text-red-300 text-stone-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                    title="Remove selected video"
                    aria-label="Remove selected video"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-stone-400" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION: TITLE & DESCRIPTION */}
        <div className="space-y-4 pt-4 border-t border-stone-100">
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
              Video Tutorial Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Masterclass: Rolling Fresh Tagliatelle Without a Machine"
              required
              maxLength={140}
              className="w-full text-xs sm:text-sm px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
              Video Summary / What Viewers Will Learn *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key techniques demonstrated, pan temperatures, chef tips..."
              required
              rows={3}
              maxLength={500}
              className="w-full text-xs sm:text-sm p-4 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
            />
          </div>
        </div>

        {/* SECTION: THUMBNAIL PREVIEW */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
            Video Thumbnail Image
          </label>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {thumbnailUrl && (
              <div className="w-28 h-18 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                <img
                  src={thumbnailUrl}
                  alt="Video thumbnail"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 w-full space-y-2">
              <input
                type="text"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="Thumbnail image URL (automatically extracted from video)"
                className="w-full text-xs px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
              />
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span className="font-medium text-[11px]">Or select a preset poster:</span>
                <button
                  type="button"
                  onClick={() => setThumbnailUrl(ASSET_IMAGES.trufflePasta)}
                  className="text-amber-700 hover:underline text-[11px]"
                >
                  Truffle Pasta
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setThumbnailUrl(ASSET_IMAGES.salmonBowl)}
                  className="text-amber-700 hover:underline text-[11px]"
                >
                  Salmon Bowl
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION: METADATA (CATEGORY & DURATION) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
              Video Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
            >
              <option value="Technique">Technique</option>
              <option value="VIP Masterclass">VIP Masterclass</option>
              <option value="Baking & Pastry">Baking & Pastry</option>
              <option value="Knife Skills">Knife Skills</option>
              <option value="Sauce Emulsions">Sauce Emulsions</option>
              <option value="Plating & Styling">Plating & Styling</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
              Duration (Minutes)
            </label>
            <input
              type="number"
              min={1}
              max={240}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              required
              className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50 tabular-nums"
            />
          </div>
        </div>

        {/* SECTION: LINKED RECIPE */}
        {myRecipes.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
              Link to Existing Published Recipe (Optional)
            </label>
            <select
              value={recipeId}
              onChange={(e) => setRecipeId(e.target.value)}
              className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
            >
              <option value="">None (Standalone Video Tutorial)</option>
              {myRecipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.category})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* SECTION: NUTRITIONAL PROFILE */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
          <div>
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Nutritional Profile per Serving (Optional)
            </h4>
            <p className="text-[11px] text-stone-500">
              Provide estimated macros and calorie count to help health-conscious food lovers.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-stone-600 uppercase mb-1">Calories (kcal)</label>
              <input
                type="number"
                min={0}
                max={5000}
                value={calories}
                onChange={(e) => setCalories(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 480"
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-stone-600 uppercase mb-1">Protein</label>
              <input
                type="text"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="e.g. 38g"
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-stone-600 uppercase mb-1">Carbs</label>
              <input
                type="text"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="e.g. 45g"
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-stone-600 uppercase mb-1">Fat</label>
              <input
                type="text"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="e.g. 22g"
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION: VIP EXCLUSIVE TOGGLE */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-700" />
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                VIP Subscriber Exclusive
              </span>
            </div>
            <p className="text-[11px] text-amber-800">
              Only paying subscribers to your VIP kitchen circle will have full access to this video masterclass.
            </p>
          </div>

          <input
            type="checkbox"
            checked={isPremium}
            onChange={(e) => setIsPremium(e.target.checked)}
            className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
          />
        </div>

        {/* SECTION: ACTIONS */}
        <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              onBack();
            }}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-semibold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting || (!videoBlob && !(videoSourceType === 'url' && customVideoUrl.trim()))}
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Proceed to Submit</span>
          </button>
        </div>

      </form>

      {/* CONFIRMATION MODAL (Strict requirement: do not automatically publish without user confirmation) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif-display text-xl font-bold text-stone-900">
                  Confirm Video Publication
                </h3>
                <p className="text-xs text-stone-500">
                  Please review and confirm publishing this video tutorial to DellyChow.
                </p>
              </div>
            </div>

            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span className="font-medium">Title:</span>
                <span className="font-bold text-stone-900 truncate max-w-[200px]">{title}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span className="font-medium">Category:</span>
                <span className="font-semibold text-stone-800">{category}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span className="font-medium">Duration:</span>
                <span className="font-semibold text-stone-800">{durationMinutes} minutes</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span className="font-medium">Access Tier:</span>
                <span className={`font-bold ${isPremium ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {isPremium ? 'VIP Subscribers Only' : 'Free Tutorial for All Food Lovers'}
                </span>
              </div>
              <div className="flex justify-between text-stone-600 pt-1 border-t border-stone-200">
                <span className="font-medium">Source:</span>
                <span className="text-stone-700">
                  {videoSourceType === 'record' ? 'Camera Recording' : videoSourceType === 'url' ? 'Web Video URL' : videoFileName || 'Device File'}
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              Once published, this video will be securely stored and linked to your chef profile. You can edit or delete this video at any time from your Chef Studio dashboard.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-semibold text-xs transition-colors"
              >
                Review Details
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-sm flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Publish</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
