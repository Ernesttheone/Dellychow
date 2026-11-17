import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  Wand2,
  HelpCircle,
  Sparkles,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Check,
  Loader2,
  Camera,
  Square,
  X,
} from 'lucide-react';
import {
  AnimatedOverlayPreset,
  AudioTrackItem,
  CropAspectRatio,
  OverlayEffectItem,
  TextOverlayItem,
  TextOverlayKind,
  VideoClipItem,
  VideoFilterPreset,
  VideoRotationDeg,
  VideoStudioProject,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  VideoStudioService,
  generateStudioMusicPresetBlob,
  getMediaBlobFromIndexedDb,
  saveMediaBlobToIndexedDb,
} from '../../services/videoStudioService';
import {
  AiCoachResponse,
  LocalStudioMediaEntry,
  SceneSegment,
  StudioExportResult,
  analyzeAudioSilenceSegments,
  captureFrameAsPngBlob,
  captureKeyframesBase64,
  computeAutoColorEnhancement,
  detectVideoScenesAndHighlights,
  exportStudioProject,
  fetchAiEditingSuggestions,
  generateAiCaptionsForMedia,
} from '../../lib/videoAiAnalysis';
import { probeMediaDurationSec } from '../../lib/videoStorage';
import { StudioPreviewPlayer } from './StudioPreviewPlayer';
import { StudioMultiTrackTimeline, TimelineSelection } from './StudioMultiTrackTimeline';
import { StudioToolPanels, StudioToolTab } from './StudioToolPanels';
import {
  BeginnerTemplatePreset,
  StudioConfirmModal,
  StudioExportModal,
  StudioHelpModal,
  StudioProjectsModal,
  StudioTemplatesModal,
  StudioTutorialModal,
} from './StudioModals';
import { LocalAudioRecording } from './AudioRecorderPanel';

export interface StudioPublishPayload {
  videoBlob: Blob | null;
  exportedUrl: string;
  filename: string;
  durationSec: number;
  thumbnailUrl: string;
  title: string;
  description: string;
  category: string;
  replaceOriginal: boolean;
  project: VideoStudioProject;
}

interface VideoEditingStudioProps {
  initialProject?: VideoStudioProject | null;
  initialVideoBlob?: Blob | null;
  initialVideoUrl?: string | null;
  initialTitle?: string;
  initialDescription?: string;
  initialCategory?: string;
  initialThumbnailUrl?: string;
  onExit: () => void;
  onPublishReady: (payload: StudioPublishPayload) => void;
  onDraftSaved?: (project: VideoStudioProject, exportedUrl?: string) => void;
}

const TUTORIAL_SEEN_KEY = 'dellychow_studio_tutorial_seen_v1';

export const VideoEditingStudio: React.FC<VideoEditingStudioProps> = ({
  initialProject,
  initialVideoBlob,
  initialVideoUrl,
  initialTitle,
  initialDescription,
  initialCategory,
  initialThumbnailUrl,
  onExit,
  onPublishReady,
  onDraftSaved,
}) => {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid || 'guest_creator';

  // Core Project State + Undo/Redo History Stacks
  const [project, setProject] = useState<VideoStudioProject>(() => {
    if (initialProject) return initialProject;
    return VideoStudioService.createBlankProject(userId, {
      title: initialTitle || 'Untitled Culinary Video',
      description: initialDescription || '',
      category: initialCategory || 'Technique',
      thumbnailUrl: initialThumbnailUrl || '',
      sourceVideoUrl: initialVideoUrl || undefined,
    });
  });

  const undoStackRef = useRef<VideoStudioProject[]>([]);
  const redoStackRef = useRef<VideoStudioProject[]>([]);
  const [historyCounts, setHistoryCounts] = useState({ undo: 0, redo: 0 });

  // Media Blobs + Object URLs Registry
  const [mediaRegistry, setMediaRegistry] = useState<Record<string, LocalStudioMediaEntry>>({});
  const mediaRegistryRef = useRef(mediaRegistry);
  mediaRegistryRef.current = mediaRegistry;

  const [voiceRecordings, setVoiceRecordings] = useState<LocalAudioRecording[]>([]);

  // Transport & UI State
  const [playheadSec, setPlayheadSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<StudioToolTab>('clips');
  const [toolsExpandedMobile, setToolsExpandedMobile] = useState(true);
  const [selection, setSelection] = useState<TimelineSelection | null>(() =>
    project.clips[0] ? { kind: 'clip', id: project.clips[0].id } : null
  );
  const [previewFilterHover, setPreviewFilterHover] = useState<VideoFilterPreset | null>(null);

  // Autosave & Draft Status
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving'>('saved');
  const [savedProjects, setSavedProjects] = useState<VideoStudioProject[]>([]);
  const [latestAutosave, setLatestAutosave] = useState<VideoStudioProject | null>(null);

  // Modals State
  const [tutorialOpen, setTutorialOpen] = useState<boolean>(() => {
    try {
      return !localStorage.getItem(TUTORIAL_SEEN_KEY);
    } catch {
      return false;
    }
  });
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    action: (() => void) | null;
  }>({ open: false, title: '', message: '', action: null });

  // AI State
  const [aiBusyTask, setAiBusyTask] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiScenes, setAiScenes] = useState<SceneSegment[]>([]);
  const [aiCoachResult, setAiCoachResult] = useState<AiCoachResponse | null>(null);

  // Export Progress State
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportedResult, setExportedResult] = useState<StudioExportResult | null>(null);

  // Hidden file input & Quick Studio Camera Recorder modal
  const clipUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadAsPip, setUploadAsPip] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraRecording, setCameraRecording] = useState(false);
  const [cameraSeconds, setCameraSeconds] = useState(0);
  const studioCamVideoRef = useRef<HTMLVideoElement | null>(null);
  const studioCamStreamRef = useRef<MediaStream | null>(null);
  const studioCamRecRef = useRef<MediaRecorder | null>(null);
  const studioCamChunksRef = useRef<Blob[]>([]);
  const studioCamTimerRef = useRef<number | null>(null);

  // Commit project changes with Undo stack snapshot
  const commitProjectUpdate = useCallback(
    (updater: (prev: VideoStudioProject) => VideoStudioProject, skipHistory = false) => {
      setProject((prev) => {
        const next = updater(prev);
        if (!skipHistory) {
          undoStackRef.current = [...undoStackRef.current.slice(-34), prev];
          redoStackRef.current = [];
          setHistoryCounts({ undo: undoStackRef.current.length, redo: 0 });
        }
        return { ...next, updatedAt: new Date().toISOString() };
      });
    },
    []
  );

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    setProject((curr) => {
      const previous = undoStackRef.current[undoStackRef.current.length - 1];
      undoStackRef.current = undoStackRef.current.slice(0, -1);
      redoStackRef.current = [...redoStackRef.current, curr];
      setHistoryCounts({ undo: undoStackRef.current.length, redo: redoStackRef.current.length });
      return previous;
    });
  }, []);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    setProject((curr) => {
      const next = redoStackRef.current[redoStackRef.current.length - 1];
      redoStackRef.current = redoStackRef.current.slice(0, -1);
      undoStackRef.current = [...undoStackRef.current, curr];
      setHistoryCounts({ undo: undoStackRef.current.length, redo: redoStackRef.current.length });
      return next;
    });
  }, []);

  // Register local media blob + URL
  const registerLocalMedia = useCallback((id: string, blob: Blob | undefined, url: string) => {
    setMediaRegistry((prev) => ({ ...prev, [id]: { blob, url } }));
    if (blob) {
      saveMediaBlobToIndexedDb(id, blob).catch(() => {});
    }
  }, []);

  // Seed initial uploaded/recorded video into Track V1 on mount if project starts empty
  const seededInitialRef = useRef(false);
  useEffect(() => {
    if (seededInitialRef.current) return;
    seededInitialRef.current = true;

    const init = async () => {
      if (initialProject) {
        // Hydrate IndexedDB blobs for saved draft project
        for (const c of initialProject.clips) {
          const b = await getMediaBlobFromIndexedDb(c.id);
          if (b) {
            setMediaRegistry((prev) => ({ ...prev, [c.id]: { blob: b, url: URL.createObjectURL(b) } }));
          } else if (c.serverUrl) {
            setMediaRegistry((prev) => ({ ...prev, [c.id]: { url: c.serverUrl! } }));
          }
        }
        for (const a of initialProject.audioTracks) {
          const b = await getMediaBlobFromIndexedDb(a.id);
          if (b) {
            setMediaRegistry((prev) => ({ ...prev, [a.id]: { blob: b, url: URL.createObjectURL(b) } }));
          } else if (a.serverUrl) {
            setMediaRegistry((prev) => ({ ...prev, [a.id]: { url: a.serverUrl! } }));
          }
        }
        return;
      }

      if (initialVideoBlob || initialVideoUrl) {
        const src = initialVideoBlob || initialVideoUrl!;
        const dur = (await probeMediaDurationSec(src, 'video')) || 12;
        const clipId = `clip_${Date.now().toString(36)}`;
        const url = initialVideoBlob ? URL.createObjectURL(initialVideoBlob) : initialVideoUrl!;
        registerLocalMedia(clipId, initialVideoBlob || undefined, url);

        const initialClip: VideoClipItem = {
          id: clipId,
          name: initialTitle || 'Main Cooking Clip',
          durationSec: dur,
          trimStartSec: 0,
          trimEndSec: dur,
          transition: 'none',
          volume: 1,
          muted: false,
          sourceType: initialVideoBlob ? 'uploaded' : 'url',
          serverUrl: !initialVideoBlob && initialVideoUrl ? initialVideoUrl : undefined,
          trackIndex: 0,
          speed: 1,
          hasOriginalAudio: true,
        };

        setProject((prev) => ({
          ...prev,
          clips: [initialClip],
          durationMinutes: Math.max(1, Math.round(dur / 60)),
        }));
        setSelection({ kind: 'clip', id: clipId });
      }
    };
    init();
  }, [initialProject, initialVideoBlob, initialVideoUrl, initialTitle, registerLocalMedia]);

  // Load user's saved projects & latest autosave snapshot on mount
  const refreshProjectsList = useCallback(async () => {
    const list = await VideoStudioService.listUserProjects(userId);
    setSavedProjects(list);
    setLatestAutosave(VideoStudioService.getLatestAutosave(userId));
  }, [userId]);

  useEffect(() => {
    refreshProjectsList();
  }, [refreshProjectsList]);

  // Automatic Debounced Autosave (every edit -> 1.8s delay)
  useEffect(() => {
    setAutosaveStatus('saving');
    const timer = window.setTimeout(() => {
      VideoStudioService.saveAutosaveSnapshot(project);
      setAutosaveStatus('saved');
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [project]);

  // Computed durations
  const totalDurationSec = useMemo(() => {
    const v1 = project.clips
      .filter((c) => (c.trackIndex ?? 0) === 0)
      .reduce((acc, c) => {
        const sp = Math.max(0.25, Math.min(3, c.speed || 1));
        return acc + Math.max(0.2, ((c.trimEndSec || c.durationSec) - (c.trimStartSec || 0)) / sp);
      }, 0);
    return Math.max(0.5, v1);
  }, [project.clips]);

  // Selected items helpers
  const selectedClip = useMemo(() => {
    if (selection?.kind === 'clip') {
      return project.clips.find((c) => c.id === selection.id) || project.clips[0] || null;
    }
    return project.clips[0] || null;
  }, [selection, project.clips]);

  const selectedAudioTrack = useMemo(() => {
    if (selection?.kind === 'audio') {
      return project.audioTracks.find((a) => a.id === selection.id) || null;
    }
    return project.audioTracks[0] || null;
  }, [selection, project.audioTracks]);

  const selectedTextOverlay = useMemo(() => {
    if (selection?.kind === 'text') {
      return project.textOverlays.find((t) => t.id === selection.id) || null;
    }
    return project.textOverlays[0] || null;
  }, [selection, project.textOverlays]);

  // =========================================================================
  // Core Editing Actions
  // =========================================================================

  const handleAddMediaFiles = async (files: FileList, forcePip = false) => {
    for (const file of Array.from(files)) {
      if (file.type.startsWith('audio/')) {
        await handleUploadAudioFile(file);
        continue;
      }
      if (!file.type.startsWith('video/')) continue;

      const dur = (await probeMediaDurationSec(file, 'video')) || 8;
      const id = `clip_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
      const url = URL.createObjectURL(file);
      registerLocalMedia(id, file, url);

      const cleanName = file.name.replace(/\.[^.]+$/, '') || `Clip ${project.clips.length + 1}`;
      const newClip: VideoClipItem = {
        id,
        name: cleanName,
        durationSec: dur,
        trimStartSec: 0,
        trimEndSec: dur,
        transition: 'none',
        volume: 1,
        muted: false,
        sourceType: 'uploaded',
        trackIndex: forcePip ? 1 : 0,
        startOffsetSec: forcePip ? Number(playheadSec.toFixed(1)) : undefined,
        pipX: forcePip ? 64 : undefined,
        pipY: forcePip ? 60 : undefined,
        pipScale: forcePip ? 0.32 : undefined,
        speed: 1,
        hasOriginalAudio: true,
      };

      commitProjectUpdate((prev) => ({
        ...prev,
        clips: [...prev.clips, newClip],
      }));
      setSelection({ kind: 'clip', id });
    }
  };

  const handleSplitAtPlayhead = useCallback(() => {
    let cursor = 0;
    const v1Clips = project.clips.filter((c) => (c.trackIndex ?? 0) === 0);
    let targetClip: VideoClipItem | null = null;
    let globalStart = 0;

    for (const c of v1Clips) {
      const sp = Math.max(0.25, Math.min(3, c.speed || 1));
      const outLen = Math.max(0.2, ((c.trimEndSec || c.durationSec) - (c.trimStartSec || 0)) / sp);
      if (playheadSec >= cursor + 0.35 && playheadSec <= cursor + outLen - 0.35) {
        targetClip = c;
        globalStart = cursor;
        break;
      }
      cursor += outLen;
    }

    if (!targetClip) return;
    const sp = Math.max(0.25, Math.min(3, targetClip.speed || 1));
    const offsetSource = (playheadSec - globalStart) * sp;
    const splitPoint = Number(((targetClip.trimStartSec || 0) + offsetSource).toFixed(2));
    const idB = `${targetClip.id}_s_${Date.now().toString(36)}`;

    const entry = mediaRegistryRef.current[targetClip.id];
    if (entry) {
      setMediaRegistry((prev) => ({ ...prev, [idB]: entry }));
      if (entry.blob) saveMediaBlobToIndexedDb(idB, entry.blob).catch(() => {});
    }

    const partA: VideoClipItem = {
      ...targetClip,
      name: `${targetClip.name} (1)`,
      trimEndSec: splitPoint,
    };
    const partB: VideoClipItem = {
      ...targetClip,
      id: idB,
      name: `${targetClip.name} (2)`,
      trimStartSec: splitPoint,
      transition: 'none',
    };

    commitProjectUpdate((prev) => {
      const idx = prev.clips.findIndex((c) => c.id === targetClip!.id);
      if (idx < 0) return prev;
      const next = [...prev.clips];
      next.splice(idx, 1, partA, partB);
      return { ...prev, clips: next };
    });
    setSelection({ kind: 'clip', id: idB });
  }, [project.clips, playheadSec, commitProjectUpdate]);

  const handleDuplicateClip = (clipId: string) => {
    const src = project.clips.find((c) => c.id === clipId);
    if (!src) return;
    const newId = `${src.id}_dup_${Date.now().toString(36)}`;
    const entry = mediaRegistryRef.current[src.id];
    if (entry) {
      setMediaRegistry((prev) => ({ ...prev, [newId]: entry }));
      if (entry.blob) saveMediaBlobToIndexedDb(newId, entry.blob).catch(() => {});
    }
    const clone: VideoClipItem = { ...src, id: newId, name: `${src.name} (Copy)` };
    commitProjectUpdate((prev) => {
      const idx = prev.clips.findIndex((c) => c.id === clipId);
      const next = [...prev.clips];
      next.splice(idx + 1, 0, clone);
      return { ...prev, clips: next };
    });
    setSelection({ kind: 'clip', id: newId });
  };

  const handleCreateFreezeFrame = async () => {
    if (!selectedClip) return;
    const url = mediaRegistry[selectedClip.id]?.url || selectedClip.serverUrl;
    if (!url) return;

    try {
      const { blob, dataUrl } = await captureFrameAsPngBlob(url, Math.max(0.1, playheadSec));
      const freezeId = `freeze_${Date.now().toString(36)}`;
      registerLocalMedia(freezeId, blob, URL.createObjectURL(blob));

      const freezeClip: VideoClipItem = {
        id: freezeId,
        name: `Freeze Frame (${playheadSec.toFixed(1)}s)`,
        durationSec: 3,
        trimStartSec: 0,
        trimEndSec: 3,
        transition: 'none',
        volume: 0,
        muted: true,
        sourceType: 'freeze',
        trackIndex: 0,
        isFreezeFrame: true,
        freezeSourceTimeSec: playheadSec,
        posterDataUrl: dataUrl,
      };

      commitProjectUpdate((prev) => {
        const idx = prev.clips.findIndex((c) => c.id === selectedClip.id);
        const next = [...prev.clips];
        next.splice(idx + 1, 0, freezeClip);
        return { ...prev, clips: next };
      });
      setSelection({ kind: 'clip', id: freezeId });
    } catch (err: any) {
      setAiError(err?.message || 'Could not capture freeze frame.');
    }
  };

  const handleSeparateAudioFromClip = (clip: VideoClipItem) => {
    const entry = mediaRegistry[clip.id];
    if (!entry?.url) return;
    const audId = `ext_${clip.id}_${Date.now().toString(36)}`;
    registerLocalMedia(audId, entry.blob, entry.url);

    let startOffset = 0;
    for (const c of project.clips.filter((x) => (x.trackIndex ?? 0) === 0)) {
      if (c.id === clip.id) break;
      const sp = Math.max(0.25, Math.min(3, c.speed || 1));
      startOffset += Math.max(0.2, ((c.trimEndSec || c.durationSec) - (c.trimStartSec || 0)) / sp);
    }

    const extracted: AudioTrackItem = {
      id: audId,
      name: `${clip.name} Audio`,
      trackType: 'extracted',
      durationSec: clip.durationSec,
      startOffsetSec: Number(startOffset.toFixed(2)),
      trimStartSec: clip.trimStartSec,
      trimEndSec: clip.trimEndSec,
      volume: clip.volume ?? 1,
      muted: false,
      fadeInSec: 0,
      fadeOutSec: 0,
      sourceClipId: clip.id,
      serverUrl: clip.serverUrl,
    };

    commitProjectUpdate((prev) => ({
      ...prev,
      clips: prev.clips.map((c) =>
        c.id === clip.id ? { ...c, audioDetached: true, muted: true } : c
      ),
      audioTracks: [...prev.audioTracks, extracted],
    }));
    setSelection({ kind: 'audio', id: audId });
    setActiveTab('audio');
  };

  const handleRemoveMiddleSection = () => {
    if (!selectedClip || (selectedClip.trackIndex ?? 0) !== 0) return;
    const len = selectedClip.trimEndSec - selectedClip.trimStartSec;
    if (len < 2.2) {
      setAiError('Clip must be at least 2.2 seconds long to cut out a middle section.');
      return;
    }

    const cutSpan = Math.min(1.5, len * 0.25);
    const mid = selectedClip.trimStartSec + len / 2;
    const leftEnd = Number((mid - cutSpan / 2).toFixed(2));
    const rightStart = Number((mid + cutSpan / 2).toFixed(2));

    const idB = `${selectedClip.id}_cut_${Date.now().toString(36)}`;
    const entry = mediaRegistry[selectedClip.id];
    if (entry) {
      setMediaRegistry((prev) => ({ ...prev, [idB]: entry }));
      if (entry.blob) saveMediaBlobToIndexedDb(idB, entry.blob).catch(() => {});
    }

    const partA: VideoClipItem = { ...selectedClip, trimEndSec: leftEnd };
    const partB: VideoClipItem = {
      ...selectedClip,
      id: idB,
      name: `${selectedClip.name} (Cut Cont.)`,
      trimStartSec: rightStart,
    };

    commitProjectUpdate((prev) => {
      const idx = prev.clips.findIndex((c) => c.id === selectedClip.id);
      const next = [...prev.clips];
      next.splice(idx, 1, partA, partB);
      return { ...prev, clips: next };
    });
  };

  const handleAddMusicPreset = async (presetId: string) => {
    const wavBlob = await generateStudioMusicPresetBlob(presetId);
    const id = `bgm_${presetId}_${Date.now().toString(36)}`;
    registerLocalMedia(id, wavBlob, URL.createObjectURL(wavBlob));
    const track: AudioTrackItem = {
      id,
      name: `BGM: ${presetId.replace(/_/g, ' ')}`,
      trackType: 'music',
      durationSec: 20,
      startOffsetSec: 0,
      trimStartSec: 0,
      trimEndSec: 20,
      volume: 0.35,
      muted: false,
      fadeInSec: 0.6,
      fadeOutSec: 1.0,
      presetId,
      mimeType: 'audio/wav',
    };
    commitProjectUpdate((prev) => ({ ...prev, audioTracks: [...prev.audioTracks, track] }));
    setSelection({ kind: 'audio', id });
  };

  const handleUploadAudioFile = async (file: File) => {
    const dur = (await probeMediaDurationSec(file, 'audio')) || 10;
    const id = `aud_${Date.now().toString(36)}`;
    registerLocalMedia(id, file, URL.createObjectURL(file));
    const track: AudioTrackItem = {
      id,
      name: file.name.replace(/\.[^.]+$/, ''),
      trackType: 'music',
      durationSec: dur,
      startOffsetSec: Number(playheadSec.toFixed(1)),
      trimStartSec: 0,
      trimEndSec: dur,
      volume: 0.65,
      muted: false,
      fadeInSec: 0.4,
      fadeOutSec: 0.6,
      mimeType: file.type || 'audio/mpeg',
    };
    commitProjectUpdate((prev) => ({ ...prev, audioTracks: [...prev.audioTracks, track] }));
    setSelection({ kind: 'audio', id });
  };

  const handleAddTextOverlay = (kind: TextOverlayKind, text: string, subtitle?: string) => {
    const startSec = Number(playheadSec.toFixed(1));
    const endSec = Number(Math.max(startSec + 1, Math.min(totalDurationSec, startSec + 4)).toFixed(1));
    const id = `txt_${Date.now().toString(36)}`;
    const item: TextOverlayItem = {
      id,
      kind,
      text: text.trim(),
      subtitle: subtitle?.trim() || undefined,
      startSec,
      endSec: endSec > startSec + 0.5 ? endSec : startSec + 3.5,
      position: kind === 'title' ? 'middle' : 'bottom',
      color: '#ffffff',
      bgColor: kind === 'lower_third' ? '#d97706' : '#0c0a09',
      fontSize: kind === 'title' ? 'lg' : 'md',
      fontFamily: kind === 'title' ? 'Playfair Display' : 'Plus Jakarta Sans',
      animation: kind === 'title' ? 'pop' : kind === 'lower_third' ? 'slide_up' : 'fade',
    };
    commitProjectUpdate((prev) => ({ ...prev, textOverlays: [...prev.textOverlays, item] }));
    setSelection({ kind: 'text', id });
  };

  // =========================================================================
  // AI Editing Actions
  // =========================================================================

  const handleRunAutoEnhance = async () => {
    if (!selectedClip) return;
    const url = mediaRegistry[selectedClip.id]?.url || selectedClip.serverUrl;
    if (!url) return;
    setAiBusyTask('enhance');
    setAiError(null);
    setAiNotice(null);
    try {
      const enh = await computeAutoColorEnhancement(url, selectedClip.trimStartSec + 0.5);
      commitProjectUpdate((prev) => ({
        ...prev,
        clips: prev.clips.map((c) =>
          c.id === selectedClip.id
            ? {
                ...c,
                filterPreset: enh.filterPreset,
                brightness: enh.brightness,
                contrast: enh.contrast,
                saturation: enh.saturation,
              }
            : c
        ),
      }));
      setAiNotice(
        `Applied ${enh.filterPreset.replace('_', ' ')} polish (+${enh.contrast}% contrast, +${enh.saturation}% vibrance).`
      );
    } catch (err: any) {
      setAiError(err?.message || 'Auto-enhance failed.');
    } finally {
      setAiBusyTask(null);
    }
  };

  const handleRunAutoRemoveSilence = async () => {
    if (!selectedClip || selectedClip.isFreezeFrame) return;
    const entry = mediaRegistry[selectedClip.id];
    const source = entry?.blob || entry?.url || selectedClip.serverUrl;
    if (!source) return;

    setAiBusyTask('silence');
    setAiError(null);
    setAiNotice(null);
    try {
      const segments = await analyzeAudioSilenceSegments(
        source,
        selectedClip.trimStartSec,
        selectedClip.trimEndSec
      );
      if (segments.length === 0) {
        setAiError('No clear speech/sound segments exceeded threshold. Adjust mic audio or trim manually.');
        return;
      }
      if (segments.length === 1 && segments[0].endSec - segments[0].startSec > (selectedClip.trimEndSec - selectedClip.trimStartSec) * 0.92) {
        setAiNotice('Audio is already active throughout with no long silent pauses!');
        return;
      }

      const nextClips: VideoClipItem[] = segments.map((seg, idx) => {
        const newId = idx === 0 ? selectedClip.id : `${selectedClip.id}_sil_${Date.now().toString(36)}_${idx}`;
        if (idx > 0 && entry) {
          setMediaRegistry((prev) => ({ ...prev, [newId]: entry }));
          if (entry.blob) saveMediaBlobToIndexedDb(newId, entry.blob).catch(() => {});
        }
        return {
          ...selectedClip,
          id: newId,
          name: `${selectedClip.name} (Talk ${idx + 1})`,
          trimStartSec: seg.startSec,
          trimEndSec: seg.endSec,
        };
      });

      commitProjectUpdate((prev) => {
        const idx = prev.clips.findIndex((c) => c.id === selectedClip.id);
        const list = [...prev.clips];
        list.splice(idx, 1, ...nextClips);
        return { ...prev, clips: list };
      });
      setAiNotice(`Removed silent gaps cleanly — kept ${segments.length} active speech/action segments.`);
    } catch (err: any) {
      setAiError(err?.message || 'Silence analysis failed on this clip format.');
    } finally {
      setAiBusyTask(null);
    }
  };

  const handleRunSceneDetection = async () => {
    if (!selectedClip || selectedClip.isFreezeFrame) return;
    const url = mediaRegistry[selectedClip.id]?.url || selectedClip.serverUrl;
    if (!url) return;
    setAiBusyTask('scenes');
    setAiError(null);
    setAiNotice(null);
    try {
      const scenes = await detectVideoScenesAndHighlights(
        url,
        selectedClip.trimStartSec,
        selectedClip.trimEndSec
      );
      setAiScenes(scenes);
      setAiNotice(
        `Detected ${scenes.length} scene${scenes.length === 1 ? '' : 's'} (${scenes.filter((s) => s.isHighlight).length} highlighted culinary moments).`
      );
    } catch (err: any) {
      setAiError(err?.message || 'Scene scan could not decode this clip.');
    } finally {
      setAiBusyTask(null);
    }
  };

  const applyDetectedScenes = (highlightsOnly: boolean) => {
    if (!selectedClip || aiScenes.length === 0) return;
    const chosen = highlightsOnly ? aiScenes.filter((s) => s.isHighlight) : aiScenes;
    if (chosen.length === 0) return;

    const entry = mediaRegistry[selectedClip.id];
    const generated: VideoClipItem[] = chosen.map((sc, idx) => {
      const id = idx === 0 ? selectedClip.id : `${selectedClip.id}_sc_${Date.now().toString(36)}_${idx}`;
      if (idx > 0 && entry) {
        setMediaRegistry((prev) => ({ ...prev, [id]: entry }));
        if (entry.blob) saveMediaBlobToIndexedDb(id, entry.blob).catch(() => {});
      }
      return {
        ...selectedClip,
        id,
        name: sc.isHighlight ? `Highlight Scene ${idx + 1}` : `Scene ${idx + 1}`,
        trimStartSec: sc.startSec,
        trimEndSec: sc.endSec,
        transition: idx > 0 ? 'crossfade' : 'none',
      };
    });

    commitProjectUpdate((prev) => {
      const idx = prev.clips.findIndex((c) => c.id === selectedClip.id);
      const list = [...prev.clips];
      list.splice(idx, 1, ...generated);
      return { ...prev, clips: list };
    });
    setAiNotice(
      highlightsOnly
        ? `Kept ${generated.length} high-action highlight clips!`
        : `Split into ${generated.length} clean scene clips with crossfades.`
    );
  };

  const handleRunAutoCaptions = async () => {
    const clip = selectedClip;
    if (!clip) return;
    const entry = mediaRegistry[clip.id];
    let mediaBlob: Blob | undefined = entry?.blob;
    if (!mediaBlob && entry?.url) {
      const r = await fetch(entry.url);
      if (r.ok) mediaBlob = await r.blob();
    }
    if (!mediaBlob) {
      setAiError('Upload or record a clip locally first to transcribe audio captions.');
      return;
    }

    setAiBusyTask('captions');
    setAiError(null);
    setAiNotice(null);
    try {
      const { overlays } = await generateAiCaptionsForMedia(mediaBlob, totalDurationSec);
      if (overlays.length === 0) {
        setAiNotice('No spoken dialogue detected for automatic subtitles.');
        return;
      }
      commitProjectUpdate((prev) => ({
        ...prev,
        textOverlays: [...prev.textOverlays, ...overlays],
      }));
      setAiNotice(`Added ${overlays.length} editable AI caption cues!`);
      setActiveTab('text');
    } catch (err: any) {
      setAiError(err?.message || 'AI captions request failed.');
    } finally {
      setAiBusyTask(null);
    }
  };

  const handleRunAiCoach = async () => {
    if (!selectedClip) return;
    const url = mediaRegistry[selectedClip.id]?.url || selectedClip.serverUrl;
    setAiBusyTask('coach');
    setAiError(null);
    setAiNotice(null);
    try {
      const frames = url ? await captureKeyframesBase64(url, 3).catch(() => []) : [];
      const coach = await fetchAiEditingSuggestions({
        title: project.title,
        category: project.category,
        durationSec: totalDurationSec,
        clipCount: project.clips.length,
        hasAudio: !project.originalAudioMuted || project.audioTracks.length > 0,
        frames,
      });
      setAiCoachResult(coach);
      setAiNotice('Gemini Editing Coach finished inspecting your frames.');
    } catch (err: any) {
      setAiError(err?.message || 'AI Coach unavailable.');
    } finally {
      setAiBusyTask(null);
    }
  };

  // =========================================================================
  // Keyboard Shortcuts
  // =========================================================================

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key.toLowerCase() === 's' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleSplitAtPlayhead();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPlayheadSec((p) => Math.max(0, p - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPlayheadSec((p) => Math.min(totalDurationSec, p + 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo, handleSplitAtPlayhead, totalDurationSec]);

  // =========================================================================
  // Studio Quick Camera Clip Recorder Modal
  // =========================================================================

  const closeStudioCamera = () => {
    if (studioCamTimerRef.current) {
      clearInterval(studioCamTimerRef.current);
      studioCamTimerRef.current = null;
    }
    if (studioCamStreamRef.current) {
      studioCamStreamRef.current.getTracks().forEach((t) => t.stop());
      studioCamStreamRef.current = null;
    }
    setCameraRecording(false);
    setCameraModalOpen(false);
  };

  const openStudioCamera = async () => {
    setCameraModalOpen(true);
    setCameraSeconds(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      studioCamStreamRef.current = stream;
      if (studioCamVideoRef.current) {
        studioCamVideoRef.current.srcObject = stream;
        studioCamVideoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setAiError(err?.message || 'Camera permission denied or unavailable.');
      setCameraModalOpen(false);
    }
  };

  const toggleStudioCameraRecord = () => {
    if (!studioCamStreamRef.current) return;
    if (!cameraRecording) {
      studioCamChunksRef.current = [];
      const rec = new MediaRecorder(studioCamStreamRef.current);
      studioCamRecRef.current = rec;
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) studioCamChunksRef.current.push(ev.data);
      };
      rec.onstop = async () => {
        const blob = new Blob(studioCamChunksRef.current, { type: rec.mimeType || 'video/webm' });
        const dur = (await probeMediaDurationSec(blob, 'video')) || Math.max(1, cameraSeconds);
        const clipId = `cam_${Date.now().toString(36)}`;
        registerLocalMedia(clipId, blob, URL.createObjectURL(blob));
        const newClip: VideoClipItem = {
          id: clipId,
          name: `Camera Clip ${project.clips.length + 1}`,
          durationSec: dur,
          trimStartSec: 0,
          trimEndSec: dur,
          transition: 'none',
          volume: 1,
          muted: false,
          sourceType: 'recorded',
          trackIndex: 0,
          speed: 1,
          hasOriginalAudio: true,
        };
        commitProjectUpdate((prev) => ({ ...prev, clips: [...prev.clips, newClip] }));
        setSelection({ kind: 'clip', id: clipId });
        closeStudioCamera();
      };
      rec.start(500);
      setCameraRecording(true);
      studioCamTimerRef.current = window.setInterval(() => setCameraSeconds((s) => s + 1), 1000);
    } else {
      studioCamRecRef.current?.stop();
    }
  };

  // =========================================================================
  // Export & Save / Publish Handlers
  // =========================================================================

  const handleRunServerExport = async () => {
    setExporting(true);
    setExportProgress(5);
    setExportStage('Preparing timeline render...');
    setExportError(null);
    setExportedResult(null);

    try {
      const result = await exportStudioProject(project, mediaRegistry, (pct, stg) => {
        setExportProgress(pct);
        setExportStage(stg);
      });
      setExportedResult(result);
      commitProjectUpdate((prev) => ({ ...prev, exportedVideoUrl: result.url }), true);
    } catch (err: any) {
      setExportError(err?.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveProjectDraft = async (explicitExportUrl?: string) => {
    setAutosaveStatus('saving');
    const saved = await VideoStudioService.saveDraftProject({
      ...project,
      status: 'draft',
      exportedVideoUrl: explicitExportUrl || project.exportedVideoUrl,
    });
    setProject(saved);
    setAutosaveStatus('saved');
    await refreshProjectsList();
    if (onDraftSaved) onDraftSaved(saved, explicitExportUrl);
  };

  const handlePublishExported = async () => {
    if (!exportedResult) return;
    let blob: Blob | null = null;
    try {
      const resp = await fetch(exportedResult.url);
      if (resp.ok) blob = await resp.blob();
    } catch {
      blob = null;
    }

    const updatedProj = await VideoStudioService.saveDraftProject({
      ...project,
      exportedVideoUrl: exportedResult.url,
    });
    setExportOpen(false);
    onPublishReady({
      videoBlob: blob,
      exportedUrl: exportedResult.url,
      filename: exportedResult.filename,
      durationSec: exportedResult.durationSec,
      thumbnailUrl: project.thumbnailUrl,
      title: project.title,
      description: project.description,
      category: project.category,
      replaceOriginal: Boolean(project.exportSettings?.replaceOriginal),
      project: updatedProj,
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-5 py-3 sm:py-5 space-y-3 sm:space-y-4">
      <input
        ref={clipUploadInputRef}
        type="file"
        accept="video/*,audio/*"
        multiple
        onChange={(e) => {
          if (e.target.files?.length) handleAddMediaFiles(e.target.files, uploadAsPip);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Top Studio Header Bar (Clean single-row wrapping on small screens) */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onExit}
            className="p-2 min-h-[40px] min-w-[40px] rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-200 flex items-center justify-center shrink-0 cursor-pointer"
            title="Exit Video Editing Studio"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={project.title}
            onChange={(e) => commitProjectUpdate((p) => ({ ...p, title: e.target.value }), true)}
            className="font-serif-display text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none min-w-[120px] max-w-[200px] sm:max-w-[280px] truncate"
            aria-label="Project title"
          />

          <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 whitespace-nowrap shrink-0">
            {autosaveStatus === 'saving' ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Autosaved</span>
              </>
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {/* Undo & Redo */}
          <button
            type="button"
            disabled={historyCounts.undo === 0}
            onClick={handleUndo}
            title="Undo (Ctrl+Z)"
            className="p-2 min-h-[38px] min-w-[38px] rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 disabled:opacity-35 flex items-center justify-center cursor-pointer"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={historyCounts.redo === 0}
            onClick={handleRedo}
            title="Redo (Ctrl+Y)"
            className="p-2 min-h-[38px] min-w-[38px] rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 disabled:opacity-35 flex items-center justify-center cursor-pointer"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setTemplatesOpen(true)}
            className="px-3 py-2 min-h-[38px] rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-xs font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Templates</span>
          </button>

          <button
            type="button"
            onClick={() => {
              refreshProjectsList();
              setProjectsOpen(true);
            }}
            className="px-3 py-2 min-h-[38px] rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-xs font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Drafts ({savedProjects.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            title="Help & Shortcuts"
            className="p-2 min-h-[38px] min-w-[38px] rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 flex items-center justify-center cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleSaveProjectDraft()}
            className="px-3 py-2 min-h-[38px] rounded-xl bg-stone-900 dark:bg-stone-800 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Save Draft</span>
          </button>

          <button
            type="button"
            disabled={project.clips.length === 0}
            onClick={() => {
              setExportedResult(null);
              setExportError(null);
              setExportOpen(true);
            }}
            className="px-4 py-2 min-h-[38px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs cursor-pointer disabled:opacity-45"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Export / Publish</span>
          </button>
        </div>
      </div>

      {/* Prominent Video Preview (Pinned on Mobile) */}
      <div className="sticky top-14 z-20 md:static">
        <StudioPreviewPlayer
          clips={project.clips}
          audioTracks={project.audioTracks}
          textOverlays={project.textOverlays}
          overlayEffects={project.overlayEffects || []}
          cropRatio={project.cropRatio}
          projectRotation={project.rotation}
          projectBgColor={project.bgColor || '#0c0a09'}
          originalAudioVolume={project.originalAudioVolume}
          originalAudioMuted={project.originalAudioMuted}
          mediaRegistry={mediaRegistry}
          playheadSec={playheadSec}
          isPlaying={isPlaying}
          selectedTextId={selectedTextOverlay?.id || null}
          onPlayheadChange={setPlayheadSec}
          onTogglePlay={setIsPlaying}
          onSplitAtPlayhead={handleSplitAtPlayhead}
          onSelectTextOverlay={(id) => {
            setSelection({ kind: 'text', id });
            setActiveTab('text');
          }}
          onMoveTextOverlay={(id, xPercent, yPercent) =>
            commitProjectUpdate(
              (prev) => ({
                ...prev,
                textOverlays: prev.textOverlays.map((ov) =>
                  ov.id === id ? { ...ov, position: 'custom', xPercent, yPercent } : ov
                ),
              }),
              true
            )
          }
          onMovePipClip={(clipId, pipX, pipY) =>
            commitProjectUpdate(
              (prev) => ({
                ...prev,
                clips: prev.clips.map((c) => (c.id === clipId ? { ...c, pipX, pipY } : c)),
              }),
              true
            )
          }
          onDropFiles={(files) => handleAddMediaFiles(files, false)}
          previewFilterOverride={previewFilterHover}
        />
      </div>

      {/* Multi-Track Editing Timeline directly underneath Preview */}
      <StudioMultiTrackTimeline
        clips={project.clips}
        audioTracks={project.audioTracks}
        textOverlays={project.textOverlays}
        overlayEffects={project.overlayEffects || []}
        playheadSec={playheadSec}
        selection={selection}
        onSelect={(sel) => {
          setSelection(sel);
          if (sel.kind === 'audio') setActiveTab('audio');
          else if (sel.kind === 'text') setActiveTab('text');
          else if (sel.kind === 'effect') setActiveTab('effects');
        }}
        onPlayheadChange={setPlayheadSec}
        onReorderV1Clips={(fromId, toId) => {
          commitProjectUpdate((prev) => {
            const fromIdx = prev.clips.findIndex((c) => c.id === fromId);
            const toIdx = prev.clips.findIndex((c) => c.id === toId);
            if (fromIdx < 0 || toIdx < 0) return prev;
            const next = [...prev.clips];
            const [moved] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, moved);
            return { ...prev, clips: next };
          });
        }}
        onMoveClipStep={(clipId, dir) => {
          commitProjectUpdate((prev) => {
            const idx = prev.clips.findIndex((c) => c.id === clipId);
            const target = idx + dir;
            if (idx < 0 || target < 0 || target >= prev.clips.length) return prev;
            const next = [...prev.clips];
            const [moved] = next.splice(idx, 1);
            next.splice(target, 0, moved);
            return { ...prev, clips: next };
          });
        }}
        onTrimClipEdge={(clipId, edge, deltaSec) => {
          commitProjectUpdate((prev) => ({
            ...prev,
            clips: prev.clips.map((c) => {
              if (c.id !== clipId) return c;
              if (edge === 'start') {
                const nextS = Math.max(0, Math.min(c.trimEndSec - 0.3, c.trimStartSec + deltaSec));
                return { ...c, trimStartSec: Number(nextS.toFixed(2)) };
              }
              const nextE = Math.min(c.durationSec, Math.max(c.trimStartSec + 0.3, c.trimEndSec + deltaSec));
              return { ...c, trimEndSec: Number(nextE.toFixed(2)) };
            }),
          }));
        }}
        onSplitClipAtPlayhead={handleSplitAtPlayhead}
        onDuplicateClip={handleDuplicateClip}
        onRequestDeleteItem={(sel, label) => {
          setConfirmState({
            open: true,
            title: 'Remove Item From Timeline?',
            message: `Remove "${label}" from this timeline? You can undo this edit immediately with the Undo button.`,
            confirmLabel: 'Remove',
            action: () => {
              commitProjectUpdate((prev) => {
                if (sel.kind === 'clip') {
                  return { ...prev, clips: prev.clips.filter((c) => c.id !== sel.id) };
                }
                if (sel.kind === 'audio') {
                  return { ...prev, audioTracks: prev.audioTracks.filter((a) => a.id !== sel.id) };
                }
                if (sel.kind === 'text') {
                  return { ...prev, textOverlays: prev.textOverlays.filter((t) => t.id !== sel.id) };
                }
                return {
                  ...prev,
                  overlayEffects: (prev.overlayEffects || []).filter((fx) => fx.id !== sel.id),
                };
              });
              setSelection(null);
            },
          });
        }}
      />

      {/* Expandable Toolbar Header on Mobile */}
      <div className="flex sm:hidden items-center justify-between px-2">
        <span className="text-xs font-bold text-stone-600 dark:text-stone-400">
          Editing Tools
        </span>
        <button
          type="button"
          onClick={() => setToolsExpandedMobile((v) => !v)}
          className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold flex items-center gap-1"
        >
          <span>{toolsExpandedMobile ? 'Collapse' : 'Expand'}</span>
          {toolsExpandedMobile ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Clearly Labeled Editing Tool Panels */}
      {toolsExpandedMobile && (
        <StudioToolPanels
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          clips={project.clips}
          selectedClip={selectedClip}
          audioTracks={project.audioTracks}
          selectedAudioTrack={selectedAudioTrack}
          textOverlays={project.textOverlays}
          selectedTextOverlay={selectedTextOverlay}
          overlayEffects={project.overlayEffects || []}
          cropRatio={project.cropRatio}
          projectRotation={project.rotation}
          projectBgColor={project.bgColor || '#0c0a09'}
          originalAudioVolume={project.originalAudioVolume}
          originalAudioMuted={project.originalAudioMuted}
          playheadSec={playheadSec}
          totalDurationSec={totalDurationSec}
          voiceRecordings={voiceRecordings}
          onRequestUploadClip={(asPip) => {
            setUploadAsPip(Boolean(asPip));
            clipUploadInputRef.current?.click();
          }}
          onRequestRecordCameraClip={openStudioCamera}
          onSplitAtPlayhead={handleSplitAtPlayhead}
          onDuplicateClip={handleDuplicateClip}
          onCreateFreezeFrame={handleCreateFreezeFrame}
          onSeparateAudioFromClip={handleSeparateAudioFromClip}
          onRemoveMiddleSectionPrompt={() =>
            setConfirmState({
              open: true,
              title: 'Cut Middle Unwanted Section?',
              message: `Cut out the middle segment of "${selectedClip?.name}" cleanly?`,
              confirmLabel: 'Cut Section',
              action: handleRemoveMiddleSection,
            })
          }
          onUpdateClip={(clipId, patch) =>
            commitProjectUpdate((prev) => ({
              ...prev,
              clips: prev.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
            }))
          }
          onDeleteClipPrompt={(clip) =>
            setConfirmState({
              open: true,
              title: 'Delete Video Clip?',
              message: `Remove "${clip.name}" from your editing timeline? Your original source video stays safe.`,
              confirmLabel: 'Delete Clip',
              action: () => {
                commitProjectUpdate((prev) => ({
                  ...prev,
                  clips: prev.clips.filter((c) => c.id !== clip.id),
                }));
                setSelection(null);
              },
            })
          }
          onChangeCropRatio={(ratio) =>
            commitProjectUpdate((prev) => ({
              ...prev,
              cropRatio: ratio,
              exportSettings: {
                ...(prev.exportSettings || {
                  resolution: '1080p',
                  customWidth: 1920,
                  customHeight: 1080,
                  quality: 'high',
                  replaceOriginal: false,
                }),
                aspectRatio: ratio,
              },
            }))
          }
          onChangeProjectRotation={(rotation) =>
            commitProjectUpdate((prev) => ({ ...prev, rotation }))
          }
          onChangeProjectBgColor={(bgColor) =>
            commitProjectUpdate((prev) => ({ ...prev, bgColor }))
          }
          onPreviewFilterHover={setPreviewFilterHover}
          onAddOverlayEffect={(preset: AnimatedOverlayPreset) => {
            const fx: OverlayEffectItem = {
              id: `fx_${Date.now().toString(36)}`,
              preset,
              startSec: 0,
              endSec: Math.max(4, totalDurationSec),
              intensity: 80,
            };
            commitProjectUpdate((prev) => ({
              ...prev,
              overlayEffects: [...(prev.overlayEffects || []), fx],
            }));
          }}
          onDeleteOverlayEffect={(id) =>
            commitProjectUpdate((prev) => ({
              ...prev,
              overlayEffects: (prev.overlayEffects || []).filter((f) => f.id !== id),
            }))
          }
          onChangeOriginalAudio={(originalAudioVolume, originalAudioMuted) =>
            commitProjectUpdate((prev) => ({
              ...prev,
              originalAudioVolume,
              originalAudioMuted,
            }))
          }
          onAddMusicPreset={handleAddMusicPreset}
          onUploadAudioFile={handleUploadAudioFile}
          onUpdateAudioTrack={(id, patch) =>
            commitProjectUpdate((prev) => ({
              ...prev,
              audioTracks: prev.audioTracks.map((a) => (a.id === id ? { ...a, ...patch } : a)),
            }))
          }
          onDeleteAudioPrompt={(track) =>
            setConfirmState({
              open: true,
              title: 'Delete Audio Track?',
              message: `Remove audio track "${track.name}" from timeline?`,
              confirmLabel: 'Remove Audio',
              action: () =>
                commitProjectUpdate((prev) => ({
                  ...prev,
                  audioTracks: prev.audioTracks.filter((a) => a.id !== track.id),
                })),
            })
          }
          onVoiceRecordingCreated={(rec) => {
            setVoiceRecordings((prev) => [rec, ...prev]);
            registerLocalMedia(rec.id, rec.blob, rec.url);
          }}
          onVoiceRecordingDeleted={(id) => {
            setVoiceRecordings((prev) => prev.filter((r) => r.id !== id));
          }}
          onVoiceRecordingRenamed={(id, name) => {
            setVoiceRecordings((prev) => prev.map((r) => (r.id === id ? { ...r, name } : r)));
          }}
          onAttachVoiceRecording={(rec, atPlayhead) => {
            const tr: AudioTrackItem = {
              id: rec.id,
              name: rec.name,
              trackType: 'voiceover',
              durationSec: rec.durationSec,
              startOffsetSec: atPlayhead ? Number(playheadSec.toFixed(1)) : 0,
              trimStartSec: 0,
              trimEndSec: rec.durationSec,
              volume: 1,
              muted: false,
              fadeInSec: 0.2,
              fadeOutSec: 0.2,
              mimeType: rec.mimeType,
            };
            commitProjectUpdate((prev) => ({
              ...prev,
              audioTracks: [...prev.audioTracks, tr],
            }));
            setSelection({ kind: 'audio', id: tr.id });
          }}
          onRequestSyncedVideoStart={() => setIsPlaying(true)}
          onRequestSyncedVideoStop={() => setIsPlaying(false)}
          onAddTextOverlay={handleAddTextOverlay}
          onUpdateTextOverlay={(id, patch) => {
            setSelection({ kind: 'text', id });
            if (Object.keys(patch).length === 0) return;
            commitProjectUpdate((prev) => ({
              ...prev,
              textOverlays: prev.textOverlays.map((t) => (t.id === id ? { ...t, ...patch } : t)),
            }));
          }}
          onDeleteTextOverlay={(id) =>
            commitProjectUpdate((prev) => ({
              ...prev,
              textOverlays: prev.textOverlays.filter((t) => t.id !== id),
            }))
          }
          aiBusyTask={aiBusyTask}
          aiNotice={aiNotice}
          aiError={aiError}
          aiScenes={aiScenes}
          aiCoachResult={aiCoachResult}
          onRunAutoEnhance={handleRunAutoEnhance}
          onRunAutoRemoveSilence={handleRunAutoRemoveSilence}
          onRunSceneDetection={handleRunSceneDetection}
          onSplitDetectedScenes={() => applyDetectedScenes(false)}
          onKeepHighlightScenesOnly={() => applyDetectedScenes(true)}
          onRunNoiseReductionAll={() => {
            commitProjectUpdate((prev) => ({
              ...prev,
              audioTracks: prev.audioTracks.map((a) => ({ ...a, noiseReduction: true })),
            }));
            setAiNotice('Enabled background noise reduction across all voiceover & extracted audio tracks.');
          }}
          onRunAutoCaptions={handleRunAutoCaptions}
          onRunAiCoach={handleRunAiCoach}
          onApplyCoachSuggestion={async (actionType) => {
            if (!aiCoachResult) return;
            if (actionType === 'enhance_color' && selectedClip) {
              commitProjectUpdate((prev) => ({
                ...prev,
                clips: prev.clips.map((c) =>
                  c.id === selectedClip.id
                    ? {
                        ...c,
                        filterPreset: aiCoachResult.recommendedFilter || 'warm_kitchen',
                        brightness: aiCoachResult.brightnessBoost ?? 6,
                        contrast: aiCoachResult.contrastBoost ?? 12,
                        saturation: aiCoachResult.saturationBoost ?? 14,
                      }
                    : c
                ),
              }));
              setAiNotice('Applied Gemini Coach lighting & filter polish!');
            } else if (actionType === 'add_title') {
              handleAddTextOverlay('title', aiCoachResult.recommendedTitleHook || project.title);
              setAiNotice('Added animated hook title overlay!');
            } else if (actionType === 'switch_vertical') {
              commitProjectUpdate((prev) => ({
                ...prev,
                cropRatio: aiCoachResult.suggestedAspectRatio || '9:16',
              }));
              setAiNotice(`Resized frame to ${aiCoachResult.suggestedAspectRatio || '9:16'}!`);
            } else if (actionType === 'trim_silence') {
              await handleRunAutoRemoveSilence();
            } else if (actionType === 'add_music') {
              await handleAddMusicPreset('warm_morning_acoustic');
              setAiNotice('Added Warm Morning Kitchen soundtrack!');
            }
          }}
        />
      )}

      {/* Quick In-Studio Camera Recorder Modal */}
      {cameraModalOpen && (
        <div className="fixed inset-0 z-70 bg-stone-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 text-white rounded-3xl border border-stone-700 max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="px-4 py-3 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold">
                <Camera className="w-4 h-4 text-amber-400" />
                <span>Record Additional Clip ({cameraSeconds}s)</span>
              </div>
              <button
                type="button"
                onClick={closeStudioCamera}
                className="p-1.5 rounded-full hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video bg-black">
              <video ref={studioCamVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
            <div className="p-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={toggleStudioCameraRecord}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
                  cameraRecording ? 'bg-white text-stone-950' : 'bg-red-600 text-white'
                }`}
              >
                {cameraRecording ? <Square className="w-4 h-4 fill-red-600 text-red-600" /> : <Camera className="w-4 h-4" />}
                <span>{cameraRecording ? 'Stop & Add to Timeline' : 'Start Recording Clip'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <StudioTutorialModal
        isOpen={tutorialOpen}
        onClose={() => {
          setTutorialOpen(false);
          try {
            localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
          } catch {
            // ignore
          }
        }}
      />

      <StudioTemplatesModal
        isOpen={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onApplyTemplate={async (tpl: BeginnerTemplatePreset) => {
          commitProjectUpdate((prev) => ({
            ...prev,
            cropRatio: tpl.cropRatio,
            clips: prev.clips.map((c) => ({ ...c, filterPreset: tpl.filterPreset })),
          }));
          handleAddTextOverlay('title', tpl.titleText);
          if (tpl.overlayPreset) {
            commitProjectUpdate((prev) => ({
              ...prev,
              overlayEffects: [
                ...(prev.overlayEffects || []),
                {
                  id: `fx_${Date.now().toString(36)}`,
                  preset: tpl.overlayPreset!,
                  startSec: 0,
                  endSec: Math.max(6, totalDurationSec),
                  intensity: 80,
                },
              ],
            }));
          }
          if (tpl.musicPresetId) {
            await handleAddMusicPreset(tpl.musicPresetId);
          }
        }}
      />

      <StudioProjectsModal
        isOpen={projectsOpen}
        onClose={() => setProjectsOpen(false)}
        projects={savedProjects}
        currentProjectId={project.id}
        autosaveProject={latestAutosave}
        onRestoreAutosave={(snap) => {
          setProject(snap);
          setSelection(snap.clips[0] ? { kind: 'clip', id: snap.clips[0].id } : null);
        }}
        onCreateNewProject={() => {
          const fresh = VideoStudioService.createBlankProject(userId);
          setProject(fresh);
          setSelection(null);
          undoStackRef.current = [];
          redoStackRef.current = [];
          setHistoryCounts({ undo: 0, redo: 0 });
        }}
        onLoadProject={async (proj) => {
          setProject(proj);
          for (const c of proj.clips) {
            const b = await getMediaBlobFromIndexedDb(c.id);
            if (b) registerLocalMedia(c.id, b, URL.createObjectURL(b));
            else if (c.serverUrl) registerLocalMedia(c.id, undefined, c.serverUrl);
          }
          for (const a of proj.audioTracks) {
            const b = await getMediaBlobFromIndexedDb(a.id);
            if (b) registerLocalMedia(a.id, b, URL.createObjectURL(b));
            else if (a.serverUrl) registerLocalMedia(a.id, undefined, a.serverUrl);
          }
          setSelection(proj.clips[0] ? { kind: 'clip', id: proj.clips[0].id } : null);
        }}
        onRenameProject={async (proj, newTitle) => {
          const updated = await VideoStudioService.renameProject(proj, newTitle);
          if (updated.id === project.id) setProject(updated);
          await refreshProjectsList();
        }}
        onDuplicateProject={async (proj) => {
          await VideoStudioService.duplicateProject(proj);
          await refreshProjectsList();
        }}
        onRequestDeleteProject={(proj) => {
          setConfirmState({
            open: true,
            title: 'Delete Saved Project?',
            message: `Permanently delete project "${proj.title}" and its cached media?`,
            confirmLabel: 'Delete Project',
            action: async () => {
              await VideoStudioService.deleteProject(userId, proj);
              await refreshProjectsList();
            },
          });
        }}
      />

      <StudioHelpModal
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        onReplayTutorial={() => setTutorialOpen(true)}
      />

      <StudioConfirmModal
        isOpen={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false, action: null }))}
        onConfirm={() => {
          const fn = confirmState.action;
          setConfirmState((s) => ({ ...s, open: false, action: null }));
          if (fn) fn();
        }}
      />

      <StudioExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        settings={
          project.exportSettings || {
            resolution: '1080p',
            aspectRatio: project.cropRatio || '16:9',
            customWidth: 1920,
            customHeight: 1080,
            quality: 'high',
            replaceOriginal: false,
          }
        }
        onChangeSettings={(exportSettings) =>
          commitProjectUpdate((prev) => ({
            ...prev,
            cropRatio: exportSettings.aspectRatio,
            exportSettings,
          }))
        }
        exporting={exporting}
        progressPct={exportProgress}
        progressStage={exportStage}
        exportError={exportError}
        exportedResult={exportedResult}
        onStartExport={handleRunServerExport}
        onSaveExportedAsDraft={async () => {
          await handleSaveProjectDraft(exportedResult?.url);
          setExportOpen(false);
        }}
        onPublishExportedToWebsite={handlePublishExported}
      />
    </div>
  );
};
