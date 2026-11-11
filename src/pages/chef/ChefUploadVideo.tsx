import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  Video, 
  Upload, 
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
  Share2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  Eye,
  Plus,
  Mic,
  MicOff,
  Volume2,
  Grid3X3,
  FileText,
  Sliders,
  Radio,
  ImageIcon
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
  onPlayVideo?: (video: CookingVideo) => void;
}

export const ChefUploadVideo: React.FC<ChefUploadVideoProps> = ({
  recipes,
  onBack,
  onSuccess,
  onPlayVideo
}) => {
  const { currentUser, userProfile } = useAuth();

  // Wizard Step: 1 = Video, 2 = Details, 3 = Visibility, 4 = Publish / Complete
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState(ASSET_IMAGES.trufflePasta);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(10);
  const [hasManuallySetDuration, setHasManuallySetDuration] = useState(false);
  const [category, setCategory] = useState('Technique');
  const [recipeId, setRecipeId] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [confirmedOwnership, setConfirmedOwnership] = useState(true);

  // Nutritional Information (optional)
  const [calories, setCalories] = useState<number | ''>('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  // Primary Mode Selector in Step 1: 'record' (Live Camera Studio) | 'upload' (Device File) | 'url' (Web Link)
  const [activeMode, setActiveMode] = useState<'record' | 'upload' | 'url'>('record');
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [videoFileSizeMB, setVideoFileSizeMB] = useState<string | null>(null);

  // Live Camera & Recording State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<'idle' | 'countdown' | 'recording' | 'paused' | 'stopped'>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [supportsPause, setSupportsPause] = useState(true);

  // Enhanced Live Video Studio Controls
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const [videoResolution, setVideoResolution] = useState<'1080p' | '720p'>('1080p');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showChefNotes, setShowChefNotes] = useState(false);
  const [chefNotesText, setChefNotesText] = useState('');
  const [selectedNotesRecipeId, setSelectedNotesRecipeId] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);
  const [flashActive, setFlashActive] = useState(false);

  // Submission & Progress State
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressStatusText, setProgressStatusText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [publishedVideo, setPublishedVideo] = useState<CookingVideo | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Refs
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);

  // Web Audio Analyser Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Chef's own published recipes to link to
  const myRecipes = recipes.filter(r => r.authorId === currentUser?.uid);

  // Enumerate connected cameras & microphones
  const loadMediaDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      const audioDevices = devices.filter(d => d.kind === 'audioinput');
      setAvailableCameras(videoDevices);
      setAvailableMics(audioDevices);
      if (videoDevices.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoDevices[0].deviceId);
      }
      if (audioDevices.length > 0 && !selectedMicId) {
        setSelectedMicId(audioDevices[0].deviceId);
      }
    } catch (err) {
      console.warn('Device enumeration notice:', err);
    }
  }, [selectedCameraId, selectedMicId]);

  // Audio VU Meter loop
  const startAudioAnalyser = (stream: MediaStream) => {
    try {
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      const ctx = new AudioCtxClass();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(normalized);
        animFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };

      updateAudioLevel();
    } catch (err) {
      console.warn('Audio analyser notice:', err);
    }
  };

  const stopAudioAnalyser = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  };

  const stopCameraStream = () => {
    stopAudioAnalyser();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
      if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
      if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
      if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, []);

  // Update chef notes when a recipe is selected in teleprompter
  useEffect(() => {
    if (selectedNotesRecipeId) {
      const rec = recipes.find(r => r.id === selectedNotesRecipeId);
      if (rec) {
        const ingredientsList = rec.ingredients?.map(i => `• ${i}`).join('\n') || '';
        const stepsList = rec.steps?.map((s, idx) => `${idx + 1}. ${s}`).join('\n') || '';
        const formatted = `RECIPE: ${rec.title}\nPrep: ${rec.prepTimeMinutes || 10}m | Cook: ${rec.cookTimeMinutes || 20}m\n\nINGREDIENTS:\n${ingredientsList}\n\nKEY STEPS:\n${stepsList}`;
        setChefNotesText(formatted);
      }
    }
  }, [selectedNotesRecipeId, recipes]);

  // LIVE VIDEO RECORDING: Initialize Camera & Microphone Stream
  const handleStartCamera = async (
    facing: 'user' | 'environment' = cameraFacingMode,
    cameraId?: string,
    micId?: string
  ) => {
    setCameraError(null);
    setErrorMsg('');
    stopCameraStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Live camera recording is not supported on this browser or device.');
      }

      const is1080p = videoResolution === '1080p';
      const videoConstraints: MediaTrackConstraints = {
        facingMode: facing,
        width: { ideal: is1080p ? 1920 : 1280 },
        height: { ideal: is1080p ? 1080 : 720 },
        frameRate: { ideal: 30 }
      };

      if (cameraId) {
        videoConstraints.deviceId = { exact: cameraId };
      }

      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };

      if (micId) {
        audioConstraints.deviceId = { exact: micId };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints
      });

      mediaStreamRef.current = stream;
      setIsCameraActive(true);
      setRecordingState('idle');
      setRecordingSeconds(0);
      setIsMicMuted(false);

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play().catch(() => {});
      }

      // Start live audio VU meter & refresh devices list
      startAudioAnalyser(stream);
      loadMediaDevices();

    } catch (err: any) {
      console.warn('Camera access error:', err);
      let message = 'Unable to access camera or microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera and microphone access was denied. Please allow permissions in your browser or device settings, or upload an existing video file below.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No camera or microphone found. Please connect an input device or choose file upload.';
      } else if (err.name === 'NotReadableError') {
        message = 'Camera is already in use by another application. Please close other video apps and retry.';
      }
      setCameraError(message);
      setIsCameraActive(false);
    }
  };

  // Flip Camera between front (user) and kitchen (environment)
  const handleToggleCameraFacing = () => {
    const nextFacing = cameraFacingMode === 'user' ? 'environment' : 'user';
    setCameraFacingMode(nextFacing);
    if (isCameraActive && recordingState === 'idle') {
      handleStartCamera(nextFacing, selectedCameraId, selectedMicId);
    }
  };

  // Live Microphone Mute / Unmute
  const handleToggleMicMute = () => {
    if (!mediaStreamRef.current) return;
    const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicMuted(!audioTrack.enabled);
    }
  };

  // Live Snapshot / Thumbnail Grabber from Camera Feed
  const handleCaptureSnapshot = () => {
    if (!liveVideoRef.current) return;
    try {
      setFlashActive(true);
      setTimeout(() => setFlashActive(false), 300);

      const video = liveVideoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // If mirroring front camera, mirror canvas horizontally
        if (cameraFacingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setThumbnailUrl(dataUrl);
        setSnapshotToast('Captured live snapshot for masterclass thumbnail!');
        setTimeout(() => setSnapshotToast(null), 3500);
      }
    } catch (err) {
      console.warn('Snapshot capture notice:', err);
    }
  };

  // Start 3.. 2.. 1.. Countdown before recording begins
  const handleStartCountdown = () => {
    if (recordingState === 'countdown') return;
    setRecordingState('countdown');
    setCountdown(3);

    let current = 3;
    if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = window.setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCountdown(current);
      } else {
        if (countdownIntervalRef.current) {
          window.clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setCountdown(null);
        startActualRecording();
      }
    }, 1000);
  };

  // Start MediaRecorder
  const startActualRecording = () => {
    if (!mediaStreamRef.current) return;
    recordedChunksRef.current = [];

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
        const ext = finalBlob.type.includes('mp4') ? 'mp4' : 'webm';
        setVideoFileName(`Chef_Masterclass_${new Date().toISOString().slice(0, 10)}_${Date.now().toString().slice(-4)}.${ext}`);
        setVideoFileSizeMB((finalBlob.size / (1024 * 1024)).toFixed(1));
        setRecordingState('stopped');
        stopCameraStream();

        try {
          const { durationMinutes: autoDuration, thumbnailUrl: autoThumb } = 
            await extractVideoMetadataAndThumbnail(finalBlob);
          if (autoDuration && !hasManuallySetDuration) setDurationMinutes(autoDuration);
          if (autoThumb && thumbnailUrl === ASSET_IMAGES.trufflePasta) setThumbnailUrl(autoThumb);
        } catch {
          // Fallback to defaults
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setRecordingState('recording');
      setRecordingSeconds(0);

      if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.warn('Failed to start MediaRecorder:', err);
      setCameraError('Failed to initialize video recording on this device.');
      setRecordingState('idle');
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
    handleStartCamera(cameraFacingMode, selectedCameraId, selectedMicId);
  };

  // UPLOAD FILE FROM DEVICE
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
      setErrorMsg('');

      // Auto-populate title if empty from clean file name
      if (!title) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const cap = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
        setTitle(cap);
      }

      // Extract duration and thumbnail
      const { durationMinutes: autoDuration, thumbnailUrl: autoThumb } = 
        await extractVideoMetadataAndThumbnail(file);
      if (autoDuration && !hasManuallySetDuration) setDurationMinutes(autoDuration);
      if (autoThumb) setThumbnailUrl(autoThumb);

    } catch (err: any) {
      console.warn('Metadata extraction notice:', err);
    }
  };

  const handleCustomThumbnailSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvt) => {
      if (uploadEvt.target?.result) {
        setThumbnailUrl(uploadEvt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
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
    setRecordingState('idle');
    stopCameraStream();
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Step 1 Validation
  const canProceedToStep2 = Boolean(videoBlob || (activeMode === 'url' && customVideoUrl.trim()));

  // Step 2 Validation
  const canProceedToStep3 = title.trim().length > 0 && description.trim().length > 0;

  // Step 3 Validation
  const canProceedToStep4 = confirmedOwnership;

  // Final Confirmed Publish Handler
  const handleConfirmPublish = async () => {
    if (!currentUser) return;
    const isUrlSource = activeMode === 'url' && customVideoUrl.trim();
    if (!videoBlob && !isUrlSource) return;

    setSubmitting(true);
    setUploadProgress(10);
    setProgressStatusText('Preparing video for universal cross-device playback...');
    setErrorMsg('');

    try {
      const newVideoId = RecipeService.generateVideoId();
      let finalPublicUrl = '';

      if (isUrlSource) {
        finalPublicUrl = customVideoUrl.trim();
        setUploadProgress(70);
        setProgressStatusText('Linking web video tutorial...');
      } else if (videoBlob) {
        const ext = videoBlob.type.includes('webm') ? '.webm' : videoBlob.type.includes('mov') ? '.mov' : '.mp4';
        const filename = videoFileName || `video_${newVideoId}${ext}`;

        setProgressStatusText('Uploading video masterclass to server...');
        const uploadResult = await uploadVideoToServer(videoBlob, filename, newVideoId, (pct) => {
          setUploadProgress(15 + Math.round(pct * 0.75));
          setProgressStatusText(`Streaming video to server (${pct}%)...`);
        });

        if (!uploadResult?.url) {
          throw new Error('Video upload failed: server did not return a valid stream URL.');
        }

        finalPublicUrl = uploadResult.url;
      }

      setProgressStatusText('Publishing masterclass to your chef profile...');
      setUploadProgress(95);

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

      const created: CookingVideo = {
        ...videoData,
        id: newVideoId,
        createdAt: new Date().toISOString()
      };

      setPublishedVideo(created);
      setUploadProgress(100);
      setProgressStatusText('Published successfully!');
      setSubmitting(false);

    } catch (err: any) {
      console.error('Video upload error:', err);
      setErrorMsg(err.message || 'Failed to publish video. Please try again.');
      setSubmitting(false);
    }
  };

  const handleSharePublishedVideo = async () => {
    if (!publishedVideo) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/?video=${publishedVideo.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${publishedVideo.title} | DellyChow Masterclass`,
          text: `Watch my cooking masterclass on DellyChow!`,
          url: shareUrl
        });
        return;
      } catch {
        // Fall back to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Ignore
    }
  };

  const handleResetForAnotherUpload = () => {
    handleRemoveVideo();
    setTitle('');
    setDescription('');
    setThumbnailUrl(ASSET_IMAGES.trufflePasta);
    setDurationMinutes(15);
    setCategory('Technique');
    setRecipeId('');
    setIsPremium(false);
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setPublishedVideo(null);
    setUploadProgress(0);
    setCurrentStep(1);
    setActiveMode('record');
  };

  // Step labels for YouTube Studio Stepper
  const stepsMeta = [
    { num: 1, title: 'Video Source', desc: 'Live camera or file' },
    { num: 2, title: 'Video Details', desc: 'Title, thumb & tags' },
    { num: 3, title: 'Visibility', desc: 'Audience & recipe' },
    { num: 4, title: 'Publish', desc: 'Upload & preview' }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">
      
      {/* Hidden Native File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleDeviceFileSelected}
        accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/*"
        className="hidden"
      />
      <input
        type="file"
        ref={thumbnailInputRef}
        onChange={handleCustomThumbnailSelected}
        accept="image/*"
        className="hidden"
      />

      {/* Top Header & Back Button */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => {
            stopCameraStream();
            onBack();
          }}
          className="inline-flex items-center gap-1.5 sm:gap-2 text-xs font-semibold uppercase tracking-wider text-stone-600 hover:text-stone-900 transition-colors cursor-pointer py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Studio</span>
        </button>

        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
          Chef Studio · Masterclass Publishing
        </span>
      </div>

      {/* Studio Title */}
      <div>
        <h1 className="font-serif-display text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
          Publish Culinary Masterclass
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1 leading-relaxed">
          Record live cooking tutorials with camera & audio controls, or upload pre-recorded videos to stream worldwide.
        </p>
      </div>

      {/* 4-Step Progress Stepper (Responsive for Mobile, Tablet, and Desktop) */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-3 sm:p-4 shadow-2xs">
        {/* Mobile Compact Progress Bar */}
        <div className="block sm:hidden">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-amber-700 font-bold">
              Step {currentStep} of 4: <span className="text-stone-900">{stepsMeta[currentStep - 1].title}</span>
            </span>
            <span className="text-stone-400 text-[11px] tabular-nums">
              {Math.round((currentStep / 4) * 100)}%
            </span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-amber-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Tablet / Desktop Stepper */}
        <div className="hidden sm:grid grid-cols-4 gap-2">
          {stepsMeta.map((s) => {
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (s.num === 1) setCurrentStep(1);
                  else if (s.num === 2 && canProceedToStep2) setCurrentStep(2);
                  else if (s.num === 3 && canProceedToStep2 && canProceedToStep3) setCurrentStep(3);
                  else if (s.num === 4 && canProceedToStep2 && canProceedToStep3 && canProceedToStep4) setCurrentStep(4);
                }}
                disabled={submitting || (s.num > currentStep && (!canProceedToStep2 || (s.num > 2 && !canProceedToStep3)))}
                className={`p-2.5 rounded-xl text-left transition-all flex items-center gap-2.5 border ${
                  isCurrent
                    ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold shadow-2xs'
                    : isCompleted
                    ? 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100 cursor-pointer'
                    : 'bg-transparent border-transparent text-stone-400 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  isCurrent 
                    ? 'bg-amber-600 text-white' 
                    : isCompleted 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-stone-200 text-stone-500'
                }`}>
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.num}
                </div>
                <div className="min-w-0">
                  <p className="text-xs truncate font-semibold leading-tight">{s.title}</p>
                  <p className="text-[10px] text-stone-400 truncate">{s.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ========================================================
          STEP 1: SELECT VIDEO / LIVE RECORDING STUDIO
         ======================================================== */}
      {currentStep === 1 && (
        <div className="bg-white rounded-3xl border border-stone-200/80 p-4 sm:p-7 shadow-2xs space-y-6 animate-in fade-in">
          
          {/* Header & Feature Intro */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-serif-display text-xl font-bold text-stone-900 flex items-center gap-2">
                <Film className="w-5 h-5 text-amber-600" />
                <span>Step 1: Video Source & Recording</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Record live in-browser with your camera & mic, or choose a pre-recorded cooking video.
              </p>
            </div>

            {/* Live Camera State Indicator */}
            {isCameraActive && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-semibold shrink-0">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                <span>Live Studio On-Air</span>
              </div>
            )}
          </div>

          {/* Prominent Mode Switcher Tab Bar */}
          {!videoBlob && (
            <div className="grid grid-cols-3 p-1 bg-stone-100 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveMode('record');
                  if (!isCameraActive) {
                    handleStartCamera(cameraFacingMode, selectedCameraId, selectedMicId);
                  }
                }}
                className={`py-2.5 px-2 sm:px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
                  activeMode === 'record'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                <Camera className="w-4 h-4 shrink-0" />
                <span className="truncate">Record Live Video</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setActiveMode('upload');
                  handleTriggerFileInput();
                }}
                className={`py-2.5 px-2 sm:px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
                  activeMode === 'upload'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                <Upload className="w-4 h-4 shrink-0" />
                <span className="truncate">Upload Video File</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setActiveMode('url');
                }}
                className={`py-2.5 px-2 sm:px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
                  activeMode === 'url'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                <Globe className="w-4 h-4 shrink-0" />
                <span className="truncate">Web Video Link</span>
              </button>
            </div>
          )}

          {/* Camera Error Alert */}
          {cameraError && (
            <div className="p-4 bg-amber-50 text-amber-900 text-xs rounded-2xl border border-amber-200 flex items-start justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span className="leading-relaxed">{cameraError}</span>
              </div>
              <button
                type="button"
                onClick={() => setCameraError(null)}
                className="text-amber-800 hover:underline font-bold shrink-0 text-xs"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Live Snapshot Captured Toast */}
          {snapshotToast && (
            <div className="p-3 bg-emerald-600 text-white text-xs font-semibold rounded-2xl shadow-md flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{snapshotToast}</span>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* SECTION A: LIVE CAMERA RECORDING STUDIO             */}
          {/* ---------------------------------------------------- */}
          {activeMode === 'record' && !videoBlob && (
            <div className="space-y-4">
              
              {/* Camera Start Button if Camera Not Active */}
              {!isCameraActive ? (
                <div className="p-8 sm:p-12 rounded-3xl border-2 border-dashed border-amber-300 bg-amber-50/40 text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div className="max-w-md space-y-1">
                    <h3 className="font-serif-display text-lg font-bold text-stone-900">
                      In-Browser Live Recording Studio
                    </h3>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Record your cooking technique directly from your phone, tablet, or desktop webcam with live audio metering, recipe cues, and high-definition video capture.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartCamera()}
                    className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Launch Camera & Microphone</span>
                  </button>
                </div>
              ) : (
                /* Active Studio Viewfinder Container */
                <div className="rounded-3xl overflow-hidden bg-black border border-stone-800 shadow-xl space-y-0 relative">
                  
                  {/* Camera Shutter Flash Effect */}
                  {flashActive && (
                    <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-out fade-out duration-300" />
                  )}

                  {/* Top Studio Bar: Quality, Grid, Teleprompter, Audio Meter, Flip */}
                  <div className="bg-stone-950 px-3 py-2.5 border-b border-stone-800/80 flex flex-wrap items-center justify-between gap-2 text-white text-xs">
                    
                    {/* Left: Device Info & Quality */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800 text-[11px] font-mono">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{videoResolution === '1080p' ? '1080p Full HD' : '720p HD'}</span>
                      </div>

                      {/* Live Audio VU Level Indicator */}
                      <div 
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800 text-[11px] font-mono"
                        title={`Live Mic Level: ${audioLevel}%`}
                      >
                        {isMicMuted ? (
                          <MicOff className="w-3.5 h-3.5 text-red-400" />
                        ) : (
                          <Mic className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <div className="w-12 h-2 bg-stone-800 rounded-full overflow-hidden flex items-center p-0.5">
                          <div 
                            className={`h-full rounded-full transition-all duration-75 ${
                              isMicMuted 
                                ? 'w-0' 
                                : audioLevel > 70 
                                ? 'bg-red-500' 
                                : audioLevel > 30 
                                ? 'bg-amber-400' 
                                : 'bg-emerald-400'
                            }`}
                            style={{ width: `${isMicMuted ? 0 : audioLevel}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right: Studio Utility Controls */}
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      
                      {/* Toggle Rule of Thirds Grid */}
                      <button
                        type="button"
                        onClick={() => setShowGrid(!showGrid)}
                        className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                          showGrid ? 'bg-amber-600 text-white' : 'bg-stone-900 hover:bg-stone-800 text-stone-300'
                        }`}
                        title="Composition Grid (Rule of Thirds)"
                      >
                        <Grid3X3 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Grid</span>
                      </button>

                      {/* Toggle Teleprompter / Chef Notes */}
                      <button
                        type="button"
                        onClick={() => setShowChefNotes(!showChefNotes)}
                        className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                          showChefNotes ? 'bg-amber-600 text-white' : 'bg-stone-900 hover:bg-stone-800 text-stone-300'
                        }`}
                        title="Teleprompter & Recipe Notes"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Notes</span>
                      </button>

                      {/* Mic Mute Toggle */}
                      <button
                        type="button"
                        onClick={handleToggleMicMute}
                        className={`p-1.5 rounded-lg text-xs transition-colors ${
                          isMicMuted ? 'bg-red-600 text-white' : 'bg-stone-900 hover:bg-stone-800 text-stone-300'
                        }`}
                        title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                      >
                        {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      </button>

                      {/* Flip Camera (Front vs Back) */}
                      <button
                        type="button"
                        onClick={handleToggleCameraFacing}
                        disabled={recordingState !== 'idle'}
                        className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                        title="Flip Camera (Front / Rear)"
                      >
                        <FlipHorizontal className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Flip</span>
                      </button>
                    </div>
                  </div>

                  {/* Main Live Viewfinder Frame */}
                  <div className="relative aspect-16/9 max-h-[62vh] sm:max-h-[70vh] bg-stone-950 flex items-center justify-center overflow-hidden">
                    <video
                      ref={liveVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${cameraFacingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                    />

                    {/* Rule of Thirds Grid Overlay */}
                    {showGrid && (
                      <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10">
                        <div className="border-r border-b border-white/25" />
                        <div className="border-r border-b border-white/25" />
                        <div className="border-b border-white/25" />
                        <div className="border-r border-b border-white/25" />
                        <div className="border-r border-b border-white/25" />
                        <div className="border-b border-white/25" />
                        <div className="border-r border-white/25" />
                        <div className="border-r border-white/25" />
                        <div />
                      </div>
                    )}

                    {/* 3.. 2.. 1.. Animated Countdown Overlay */}
                    {countdown !== null && (
                      <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center z-30 animate-in fade-in">
                        <div className="w-24 h-24 rounded-full border-4 border-amber-500 flex items-center justify-center animate-ping">
                          <span className="font-serif-display text-5xl font-bold text-white tabular-nums">
                            {countdown}
                          </span>
                        </div>
                        <p className="text-amber-400 font-bold text-xs uppercase tracking-widest mt-4">
                          Get Ready...
                        </p>
                      </div>
                    )}

                    {/* Teleprompter / Chef Notes Overlay Drawer */}
                    {showChefNotes && (
                      <div className="absolute top-3 left-3 bottom-3 w-72 sm:w-80 bg-stone-950/90 backdrop-blur-md rounded-2xl border border-stone-700/80 p-3.5 text-white z-20 flex flex-col shadow-2xl animate-in slide-in-from-left-2">
                        <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
                            <FileText className="w-3.5 h-3.5" />
                            <span>Teleprompter Cue</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowChefNotes(false)}
                            className="text-stone-400 hover:text-white text-xs font-bold"
                          >
                            Close
                          </button>
                        </div>

                        {/* Quick Recipe Selector */}
                        {myRecipes.length > 0 && (
                          <div className="py-2">
                            <select
                              value={selectedNotesRecipeId}
                              onChange={(e) => setSelectedNotesRecipeId(e.target.value)}
                              className="w-full text-xs bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-stone-200 focus:outline-none"
                            >
                              <option value="">-- Load recipe steps --</option>
                              {myRecipes.map((r) => (
                                <option key={r.id} value={r.id}>{r.title}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <textarea
                          value={chefNotesText}
                          onChange={(e) => setChefNotesText(e.target.value)}
                          placeholder="Type notes or bullet points to glance at while cooking..."
                          className="flex-1 w-full bg-stone-900/60 border border-stone-800 rounded-xl p-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-mono resize-none leading-relaxed mt-1"
                        />
                      </div>
                    )}

                    {/* Top Left Status Badge (REC or PAUSED) */}
                    {recordingState === 'recording' && (
                      <div className="absolute top-4 left-4 flex items-center gap-2 bg-stone-950/85 backdrop-blur-xs text-white px-3.5 py-1.5 rounded-full text-xs font-bold border border-red-500/40 shadow-xl z-20">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-red-400 font-mono text-[11px] uppercase tracking-wider">REC</span>
                        <span className="tabular-nums font-mono tracking-wider">{formatTimer(recordingSeconds)}</span>
                      </div>
                    )}

                    {recordingState === 'paused' && (
                      <div className="absolute top-4 left-4 flex items-center gap-2 bg-stone-950/85 backdrop-blur-xs text-white px-3.5 py-1.5 rounded-full text-xs font-bold border border-amber-500/40 shadow-xl z-20">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <span className="text-amber-400 font-mono text-[11px] uppercase tracking-wider">PAUSED</span>
                        <span className="tabular-nums font-mono tracking-wider">{formatTimer(recordingSeconds)}</span>
                      </div>
                    )}

                    {/* Snapshot / Capture Thumbnail Button in Viewfinder */}
                    <button
                      type="button"
                      onClick={handleCaptureSnapshot}
                      className="absolute bottom-4 right-4 p-2.5 bg-stone-900/80 hover:bg-amber-600 text-white rounded-full backdrop-blur-xs transition-all flex items-center gap-1.5 text-xs font-semibold border border-white/20 shadow-lg cursor-pointer z-20"
                      title="Snap live frame as video thumbnail"
                    >
                      <ImageIcon className="w-4 h-4 text-amber-300" />
                      <span className="hidden sm:inline text-[11px]">Snap Poster</span>
                    </button>
                  </div>

                  {/* Bottom Studio Action Control Bar */}
                  <div className="p-4 bg-stone-900 text-white flex flex-wrap items-center justify-between gap-3 border-t border-stone-800">
                    <div className="text-xs text-stone-300">
                      {recordingState === 'idle' && 'Position your cookware and click "Start Recording" when ready.'}
                      {recordingState === 'countdown' && 'Starting recording in a moment...'}
                      {recordingState === 'recording' && 'Recording live audio & video. Speak clearly into the mic.'}
                      {recordingState === 'paused' && 'Recording paused. Click "Resume" to continue.'}
                    </div>

                    <div className="flex items-center gap-2">
                      {recordingState === 'idle' && (
                        <>
                          <button
                            type="button"
                            onClick={stopCameraStream}
                            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-300 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleStartCountdown}
                            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
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
                              className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Pause className="w-3.5 h-3.5" />
                              <span>Pause</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
                          >
                            <Square className="w-3.5 h-3.5 fill-white" />
                            <span>Stop & Review</span>
                          </button>
                        </>
                      )}

                      {recordingState === 'paused' && (
                        <>
                          <button
                            type="button"
                            onClick={resumeRecording}
                            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Resume</span>
                          </button>
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer"
                          >
                            <Square className="w-3.5 h-3.5 fill-white" />
                            <span>Finish Recording</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Device Configuration Drawer (if multiple cameras or microphones available) */}
                  {(availableCameras.length > 1 || availableMics.length > 1) && recordingState === 'idle' && (
                    <div className="p-3 bg-stone-950 border-t border-stone-800/80 flex flex-wrap items-center gap-3 text-xs text-stone-300">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Inputs:</span>
                      {availableCameras.length > 1 && (
                        <div className="flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-stone-400" />
                          <select
                            value={selectedCameraId}
                            onChange={(e) => {
                              setSelectedCameraId(e.target.value);
                              handleStartCamera(cameraFacingMode, e.target.value, selectedMicId);
                            }}
                            className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-xs text-stone-200"
                          >
                            {availableCameras.map((c, idx) => (
                              <option key={c.deviceId} value={c.deviceId}>
                                {c.label || `Camera ${idx + 1}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {availableMics.length > 1 && (
                        <div className="flex items-center gap-1.5">
                          <Mic className="w-3.5 h-3.5 text-stone-400" />
                          <select
                            value={selectedMicId}
                            onChange={(e) => {
                              setSelectedMicId(e.target.value);
                              handleStartCamera(cameraFacingMode, selectedCameraId, e.target.value);
                            }}
                            className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-xs text-stone-200"
                          >
                            {availableMics.map((m, idx) => (
                              <option key={m.deviceId} value={m.deviceId}>
                                {m.label || `Microphone ${idx + 1}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* SECTION B: UPLOAD FILE FROM DEVICE                  */}
          {/* ---------------------------------------------------- */}
          {activeMode === 'upload' && !videoBlob && (
            <div
              onClick={handleTriggerFileInput}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTriggerFileInput(); }}
              className="p-8 sm:p-14 rounded-3xl border-2 border-dashed border-stone-300 hover:border-amber-500 bg-stone-50/70 hover:bg-amber-50/40 transition-all text-center flex flex-col items-center justify-center gap-3 group cursor-pointer"
            >
              <div className="w-16 h-16 rounded-2xl bg-stone-900 text-white flex items-center justify-center shadow-md group-hover:scale-105 group-hover:bg-amber-600 transition-all">
                <Upload className="w-8 h-8 text-amber-400 group-hover:text-white" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="font-serif-display text-lg font-bold text-stone-900 group-hover:text-amber-900 transition-colors">
                  Select Video File from Device
                </h3>
                <p className="text-xs text-stone-500">
                  Browse phone gallery, tablet storage, or computer files. Supports MP4, WebM, QuickTime (MOV), and M4V.
                </p>
              </div>
              <div className="px-5 py-2.5 rounded-xl bg-stone-900 group-hover:bg-amber-600 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-400 group-hover:text-white" />
                <span>Choose Cooking Video</span>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* SECTION C: WEB VIDEO URL                            */}
          {/* ---------------------------------------------------- */}
          {activeMode === 'url' && (
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
                  className="text-stone-400 hover:text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear URL</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] text-stone-300 mb-1.5 font-medium">
                  Direct Video URL or Embed Link:
                </label>
                <input
                  type="url"
                  value={customVideoUrl}
                  onChange={(e) => setCustomVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or https://example.com/cooking.mp4"
                  className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
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

          {/* ---------------------------------------------------- */}
          {/* SECTION D: RECORDED / SELECTED VIDEO REVIEW PLAYER   */}
          {/* ---------------------------------------------------- */}
          {videoBlob && videoPreviewUrl && (
            <div className="bg-stone-900 rounded-3xl overflow-hidden border border-stone-800 shadow-xl space-y-0 text-white animate-in fade-in">
              <div className="relative aspect-16/9 max-h-[60vh] bg-black">
                <video
                  src={videoPreviewUrl}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900 border-t border-stone-800">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <p className="text-xs sm:text-sm font-bold text-white truncate max-w-sm">
                      {videoFileName || 'Recorded Cooking Tutorial'}
                    </p>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    {videoFileSizeMB ? `${videoFileSizeMB} MB · ` : ''}
                    {durationMinutes ? `${durationMinutes}m duration · ` : ''}
                    {activeMode === 'record' ? 'Studio Camera Recording' : 'Uploaded File'} · Ready for details
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeMode === 'record' ? (
                    <button
                      type="button"
                      onClick={handleRetakeRecording}
                      className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Retake Video</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleTriggerFileInput}
                      className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>Replace File</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    className="px-3.5 py-2 bg-stone-800 hover:bg-red-950/60 hover:text-red-300 text-stone-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Remove selected video"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-stone-400" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 1 Actions */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => {
                if (canProceedToStep2) setCurrentStep(2);
              }}
              disabled={!canProceedToStep2}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Next: Video Details</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          STEP 2: VIDEO DETAILS
         ======================================================== */}
      {currentStep === 2 && (
        <div className="bg-white rounded-3xl border border-stone-200/80 p-4 sm:p-7 shadow-2xs space-y-6 animate-in fade-in">
          <div>
            <h2 className="font-serif-display text-xl font-bold text-stone-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <span>Step 2: Title, Description & Thumbnail</span>
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Add clear video information and custom thumbnail poster for food lovers.
            </p>
          </div>

          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider">
                Video Title *
              </label>
              <span className={`text-[11px] font-semibold tabular-nums ${
                title.length > 120 ? 'text-amber-700' : 'text-stone-400'
              }`}>
                {title.length} / 140
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Masterclass: Rolling Fresh Tagliatelle Without a Machine"
              maxLength={140}
              required
              className="w-full text-xs sm:text-sm px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
            />
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider">
                Description / What Viewers Will Learn *
              </label>
              <span className={`text-[11px] font-semibold tabular-nums ${
                description.length > 450 ? 'text-amber-700' : 'text-stone-400'
              }`}>
                {description.length} / 500
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain key knife grips, pan temperatures, chef tips, and timing..."
              rows={3}
              maxLength={500}
              required
              className="w-full text-xs sm:text-sm p-4 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
            />
          </div>

          {/* Thumbnail Selection */}
          <div>
            <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider mb-2">
              Thumbnail Poster
            </label>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="w-36 h-22 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0 shadow-2xs relative group">
                <img
                  src={thumbnailUrl}
                  alt="Thumbnail preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] font-semibold cursor-pointer"
                >
                  <Upload className="w-4 h-4 mb-0.5" />
                  <span>Change Poster</span>
                </button>
              </div>

              <div className="flex-1 w-full space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-stone-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-600" />
                    <span>Upload Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setThumbnailUrl(ASSET_IMAGES.trufflePasta)}
                    className="px-2.5 py-1 rounded-lg text-[11px] bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium cursor-pointer"
                  >
                    Preset: Truffle Pasta
                  </button>
                  <button
                    type="button"
                    onClick={() => setThumbnailUrl(ASSET_IMAGES.salmonBowl)}
                    className="px-2.5 py-1 rounded-lg text-[11px] bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium cursor-pointer"
                  >
                    Preset: Salmon Bowl
                  </button>
                </div>
                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="Or enter image URL"
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
                />
              </div>
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                'Technique',
                'Knife Skills',
                'Rice & Grains',
                'Soups & Stews',
                'Handmade Pasta',
                'Pastry & Baking',
                'Sauce Emulsions',
                'VIP Masterclass'
              ].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    category === cat
                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Duration & Prep Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Tutorial Video Duration
                </label>
                <span className="text-[11px] text-amber-700 font-medium">Chef Custom Time</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  value={durationMinutes || ''}
                  onChange={(e) => {
                    setHasManuallySetDuration(true);
                    setDurationMinutes(e.target.value === '' ? 0 : Number(e.target.value));
                  }}
                  className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50 pr-12 tabular-nums"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-stone-400 font-semibold uppercase">
                  min
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[5, 10, 15, 20, 30, 45, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setHasManuallySetDuration(true);
                      setDurationMinutes(m);
                    }}
                    className={`px-2 py-0.5 text-[11px] rounded-md font-medium cursor-pointer ${
                      durationMinutes === m ? 'bg-amber-600 text-white font-bold' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider mb-1.5">
                Preparation Time (Optional)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={prepTimeMinutes || ''}
                  onChange={(e) => setPrepTimeMinutes(e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="e.g. 10"
                  className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50 pr-12 tabular-nums"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-stone-400 font-semibold uppercase">
                  min
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mt-2">
                Estimated kitchen mise-en-place prep time.
              </p>
            </div>
          </div>

          {/* Step 2 Actions */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-semibold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (canProceedToStep3) setCurrentStep(3);
                else setErrorMsg('Please enter both a title and summary to proceed.');
              }}
              disabled={!canProceedToStep3}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Next: Visibility</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          STEP 3: VISIBILITY & AUDIENCE
         ======================================================== */}
      {currentStep === 3 && (
        <div className="bg-white rounded-3xl border border-stone-200/80 p-4 sm:p-7 shadow-2xs space-y-6 animate-in fade-in">
          <div>
            <h2 className="font-serif-display text-xl font-bold text-stone-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-amber-600" />
              <span>Step 3: Visibility & Recipe Association</span>
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Choose who can watch this masterclass and optionally link it to a full recipe card.
            </p>
          </div>

          {/* Visibility Options */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider">
              Audience & Access Level *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Option 1: Public Free */}
              <div
                onClick={() => setIsPremium(false)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  !isPremium 
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-xs' 
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  !isPremium ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-300'
                }`}>
                  {!isPremium && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">
                    Public (Free for All Food Lovers)
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Everyone on DellyChow can discover and watch this tutorial without restriction.
                  </p>
                </div>
              </div>

              {/* Option 2: VIP Masterclass */}
              <div
                onClick={() => setIsPremium(true)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  isPremium 
                    ? 'border-amber-500 bg-amber-50/60 shadow-xs' 
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  isPremium ? 'border-amber-600 bg-amber-600 text-white' : 'border-stone-300'
                }`}>
                  {isPremium && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <h4 className="text-xs font-bold text-stone-900">
                      VIP Circle Subscribers Only
                    </h4>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Restricted exclusively to food lovers who subscribe to your VIP culinary kitchen. Includes 10-second free preview.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Recipe Association */}
          {myRecipes.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider mb-1.5">
                Link to Existing Recipe Guide (Optional)
              </label>
              <select
                value={recipeId}
                onChange={(e) => setRecipeId(e.target.value)}
                className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50"
              >
                <option value="">None (Standalone Masterclass)</option>
                {myRecipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.category})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-stone-500 mt-1">
                When linked, viewers can open your step-by-step recipe card directly from the video player and add ingredients to their shopping list.
              </p>
            </div>
          )}

          {/* Nutritional Profile */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
            <div>
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Nutritional Profile per Serving (Optional)
              </h4>
              <p className="text-[11px] text-stone-500">
                Provide estimated macros to help nutrition-conscious home cooks.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-stone-600 uppercase mb-1">Calories (kcal)</label>
                <input
                  type="number"
                  min={0}
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

          {/* Content Ownership Confirmation */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
            <input
              type="checkbox"
              id="ownershipCheck"
              checked={confirmedOwnership}
              onChange={(e) => setConfirmedOwnership(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <label htmlFor="ownershipCheck" className="text-xs text-stone-700 cursor-pointer leading-relaxed">
              <span className="font-bold text-stone-900 block">Original Culinary Content Confirmation</span>
              I confirm that this video is original content created by me or authorized for publication on DellyChow, adhering to community guidelines.
            </label>
          </div>

          {/* Step 3 Actions */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-semibold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (canProceedToStep4) setCurrentStep(4);
              }}
              disabled={!canProceedToStep4}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Next: Review & Publish</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          STEP 4: REVIEW & PUBLISH
         ======================================================== */}
      {currentStep === 4 && (
        <div className="bg-white rounded-3xl border border-stone-200/80 p-4 sm:p-7 shadow-2xs space-y-6 animate-in fade-in">
          
          {/* STATE A: SUCCESS SCREEN */}
          {publishedVideo ? (
            <div className="text-center py-6 space-y-6 animate-in fade-in">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <h2 className="font-serif-display text-2xl font-bold text-stone-900">
                  Masterclass Published Successfully!
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
                  Your cooking video is now live on DellyChow and ready for food lovers worldwide.
                </p>
              </div>

              {/* Summary Card */}
              <div className="max-w-md mx-auto bg-stone-50 rounded-2xl border border-stone-200 p-4 text-left flex gap-4 items-center">
                <div className="w-24 h-16 rounded-xl overflow-hidden bg-stone-900 shrink-0">
                  <img
                    src={publishedVideo.thumbnailUrl}
                    alt={publishedVideo.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-stone-900 truncate">
                    {publishedVideo.title}
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    {publishedVideo.category} · {publishedVideo.durationMinutes}m · {publishedVideo.isPremium ? 'VIP' : 'Free'}
                  </p>
                </div>
              </div>

              {/* Actions Grid */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                {onPlayVideo && (
                  <button
                    type="button"
                    onClick={() => onPlayVideo(publishedVideo)}
                    className="w-full sm:w-auto px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Watch Masterclass</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSharePublishedVideo}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 font-semibold text-xs uppercase tracking-wider transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-stone-600" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Share Video Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetForAnotherUpload}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 font-semibold text-xs uppercase tracking-wider transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-stone-600" />
                  <span>Upload Another</span>
                </button>
              </div>

              <div className="pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={onSuccess}
                  className="text-xs text-amber-700 hover:underline font-semibold cursor-pointer"
                >
                  Return to Chef Studio Dashboard
                </button>
              </div>
            </div>
          ) : (
            /* STATE B: REVIEW & UPLOAD / PROGRESS SCREEN */
            <div className="space-y-6">
              <div>
                <h2 className="font-serif-display text-xl font-bold text-stone-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  <span>Step 4: Review & Publish Masterclass</span>
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Verify your video summary before finalizing and streaming to DellyChow.
                </p>
              </div>

              {/* Upload Progress Bar */}
              {submitting ? (
                <div className="bg-stone-50 rounded-2xl border border-amber-200 p-6 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-900 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                      <span>{progressStatusText || 'Uploading video to server...'}</span>
                    </span>
                    <span className="font-bold text-amber-700 tabular-nums text-sm">{uploadProgress}%</span>
                  </div>

                  <div className="w-full bg-stone-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-amber-600 h-full rounded-full transition-all duration-300 ease-out shadow-xs"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-stone-500 text-center">
                    Please keep this window open while your masterclass is uploaded and prepared for streaming.
                  </p>
                </div>
              ) : (
                /* Summary Card */
                <div className="space-y-4">
                  <div className="bg-stone-50 rounded-2xl p-4 sm:p-5 border border-stone-200 space-y-3 text-xs">
                    <div className="flex items-center gap-4 pb-3 border-b border-stone-200">
                      <div className="w-24 h-16 rounded-xl overflow-hidden bg-stone-900 shrink-0">
                        <img
                          src={thumbnailUrl}
                          alt="Thumbnail preview"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-stone-900 text-sm truncate">{title}</h4>
                        <p className="text-stone-500 line-clamp-1 mt-0.5">{description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <span className="text-stone-500 block text-[11px]">Category</span>
                        <span className="font-semibold text-stone-800">{category}</span>
                      </div>
                      <div>
                        <span className="text-stone-500 block text-[11px]">Duration</span>
                        <span className="font-semibold text-stone-800">{durationMinutes} minutes</span>
                      </div>
                      <div>
                        <span className="text-stone-500 block text-[11px]">Audience</span>
                        <span className={`font-bold ${isPremium ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {isPremium ? 'VIP Subscribers Only' : 'Free for Everyone'}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-500 block text-[11px]">Video Source</span>
                        <span className="font-semibold text-stone-800">
                          {activeMode === 'record' ? 'Live Camera Studio' : activeMode === 'url' ? 'Web URL' : videoFileName || 'Device File'}
                        </span>
                      </div>
                      {recipeId && (
                        <div>
                          <span className="text-stone-500 block text-[11px]">Attached Recipe</span>
                          <span className="font-semibold text-stone-800">Linked to Guide</span>
                        </div>
                      )}
                      {calories && (
                        <div>
                          <span className="text-stone-500 block text-[11px]">Calories</span>
                          <span className="font-semibold text-stone-800">{calories} kcal</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-stone-500 leading-relaxed">
                    By clicking <strong className="text-stone-700">"Publish Video Masterclass"</strong>, your video will be uploaded to DellyChow storage and linked to your chef profile.
                  </p>

                  {/* Step 4 Actions */}
                  <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      disabled={submitting}
                      className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-semibold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmPublish}
                      disabled={submitting}
                      className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Publish Video Masterclass</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
