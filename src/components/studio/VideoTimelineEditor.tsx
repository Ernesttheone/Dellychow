import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Scissors,
  Volume2,
  VolumeX,
  Crop,
  RotateCw,
  Type,
  Music,
  Mic,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Plus,
  Layers,
  Upload,
  Sliders,
  Sparkles,
  Check,
  Loader2,
  Maximize
} from 'lucide-react';
import {
  AudioTrackItem,
  CropAspectRatio,
  TextOverlayItem,
  VideoClipItem,
  VideoRotationDeg,
  VideoTransitionType,
} from '../../types';
import {
  STUDIO_MUSIC_PRESETS,
  generateStudioMusicPresetBlob,
} from '../../services/videoStudioService';
import { probeMediaDurationSec } from '../../lib/videoStorage';

export interface LocalMediaEntry {
  blob?: Blob;
  url: string;
}

interface VideoTimelineEditorProps {
  clips: VideoClipItem[];
  audioTracks: AudioTrackItem[];
  textOverlays: TextOverlayItem[];
  cropRatio: CropAspectRatio;
  rotation: VideoRotationDeg;
  originalAudioVolume: number;
  originalAudioMuted: boolean;
  mediaRegistry: Record<string, LocalMediaEntry>;
  playheadSec: number;
  onPlayheadChange: (sec: number) => void;
  onUpdateClips: (clips: VideoClipItem[]) => void;
  onUpdateAudioTracks: (tracks: AudioTrackItem[]) => void;
  onUpdateTextOverlays: (overlays: TextOverlayItem[]) => void;
  onChangeCropRatio: (ratio: CropAspectRatio) => void;
  onChangeRotation: (rot: VideoRotationDeg) => void;
  onChangeOriginalAudio: (volume: number, muted: boolean) => void;
  onRegisterMedia: (id: string, entry: LocalMediaEntry) => void;
  onRequestRecordVideo?: () => void;
  onRequestRecordAudio?: () => void;
  onRequestUploadVideo?: () => void;
  externalSyncPlaySignal?: number;
  externalSyncStopSignal?: number;
}

function formatClock(sec: number): string {
  const safe = Math.max(0, sec);
  const mins = Math.floor(safe / 60);
  const rem = Math.floor(safe % 60);
  const tenths = Math.floor((safe % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}.${tenths}`;
}

export const VideoTimelineEditor: React.FC<VideoTimelineEditorProps> = ({
  clips,
  audioTracks,
  textOverlays,
  cropRatio,
  rotation,
  originalAudioVolume,
  originalAudioMuted,
  mediaRegistry,
  playheadSec,
  onPlayheadChange,
  onUpdateClips,
  onUpdateAudioTracks,
  onUpdateTextOverlays,
  onChangeCropRatio,
  onChangeRotation,
  onChangeOriginalAudio,
  onRegisterMedia,
  onRequestRecordVideo,
  onRequestRecordAudio,
  onRequestUploadVideo,
  externalSyncPlaySignal = 0,
  externalSyncStopSignal = 0,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(clips[0]?.id || null);
  const [activeEditorTab, setActiveEditorTab] = useState<'clips' | 'audio' | 'text'>('clips');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [generatingMusicId, setGeneratingMusicId] = useState<string | null>(null);

  // Quick Text Overlay draft state
  const [newOverlayText, setNewOverlayText] = useState('');
  const [newOverlayPos, setNewOverlayPos] = useState<'top' | 'middle' | 'bottom'>('bottom');
  const [newOverlayColor, setNewOverlayColor] = useState('#ffffff');
  const [newOverlaySize, setNewOverlaySize] = useState<'sm' | 'md' | 'lg'>('md');
  const [newOverlayDuration, setNewOverlayDuration] = useState(4);

  const previewStageRef = useRef<HTMLDivElement | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const audioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const musicUploadInputRef = useRef<HTMLInputElement | null>(null);
  const playheadRef = useRef(playheadSec);
  playheadRef.current = playheadSec;

  // Build flat segment layout for clips
  const timelineSegments = useMemo(() => {
    let cursor = 0;
    return clips.map((clip, index) => {
      const clipDur = Math.max(0.2, (clip.trimEndSec || clip.durationSec) - (clip.trimStartSec || 0));
      const start = cursor;
      const end = cursor + clipDur;
      cursor = end;
      return {
        index,
        clip,
        clipDur,
        globalStart: start,
        globalEnd: end,
      };
    });
  }, [clips]);

  const totalDurationSec = useMemo(() => {
    const videoTotal = timelineSegments.length > 0 ? timelineSegments[timelineSegments.length - 1].globalEnd : 0;
    const audioMax = audioTracks.reduce((max, t) => {
      const len = Math.max(0.1, (t.trimEndSec || t.durationSec) - (t.trimStartSec || 0));
      return Math.max(max, (t.startOffsetSec || 0) + len);
    }, 0);
    return Math.max(videoTotal, audioMax > 0 && videoTotal === 0 ? audioMax : videoTotal);
  }, [timelineSegments, audioTracks]);

  const activeSegment = useMemo(() => {
    if (timelineSegments.length === 0) return null;
    const found = timelineSegments.find(
      (s) => playheadSec >= s.globalStart && playheadSec <= s.globalEnd + 0.001
    );
    return found || timelineSegments[timelineSegments.length - 1];
  }, [timelineSegments, playheadSec]);

  const activeClip = activeSegment?.clip || null;
  const activeClipMediaUrl = activeClip ? (mediaRegistry[activeClip.id]?.url || activeClip.serverUrl || '') : '';

  const selectedClip = useMemo(
    () => clips.find((c) => c.id === selectedClipId) || clips[0] || null,
    [clips, selectedClipId]
  );

  // Sync external play/stop triggers (used when recording voiceover synchronized with video)
  useEffect(() => {
    if (externalSyncPlaySignal > 0 && totalDurationSec > 0) {
      setIsPlaying(true);
    }
  }, [externalSyncPlaySignal, totalDurationSec]);

  useEffect(() => {
    if (externalSyncStopSignal > 0) {
      setIsPlaying(false);
    }
  }, [externalSyncStopSignal]);

  // Ensure audio elements cache stays updated & cleans up removed tracks
  useEffect(() => {
    const validIds = new Set(audioTracks.map((t) => t.id));
    audioElsRef.current.forEach((el, id) => {
      if (!validIds.has(id)) {
        el.pause();
        el.src = '';
        audioElsRef.current.delete(id);
      }
    });
  }, [audioTracks]);

  // Synchronize external audio tracks at given timeline time
  const syncAudioTracksAtTime = useCallback(
    (timeSec: number, playing: boolean) => {
      audioTracks.forEach((track) => {
        const srcUrl = mediaRegistry[track.id]?.url || track.serverUrl;
        if (!srcUrl) return;

        let el = audioElsRef.current.get(track.id);
        if (!el) {
          el = new Audio(srcUrl);
          el.preload = 'auto';
          audioElsRef.current.set(track.id, el);
        } else if (el.src !== srcUrl && !el.src.endsWith(srcUrl)) {
          el.src = srcUrl;
        }

        el.muted = Boolean(track.muted);
        el.volume = Math.min(1, Math.max(0, track.volume));

        const trimS = track.trimStartSec || 0;
        const trimE = track.trimEndSec || track.durationSec || 5;
        const trackLen = Math.max(0.1, trimE - trimS);
        const startOff = track.startOffsetSec || 0;
        const inside = timeSec >= startOff && timeSec <= startOff + trackLen;

        if (playing && inside && !track.muted) {
          const targetTrackTime = trimS + (timeSec - startOff);
          if (Math.abs(el.currentTime - targetTrackTime) > 0.25) {
            try {
              el.currentTime = targetTrackTime;
            } catch {
              // wait until metadata ready
            }
          }
          if (el.paused) {
            el.play().catch(() => {});
          }
        } else {
          if (!el.paused) {
            el.pause();
          }
        }
      });
    },
    [audioTracks, mediaRegistry]
  );

  // Clean up audio elements on unmount
  useEffect(() => {
    const cache = audioElsRef.current;
    return () => {
      cache.forEach((el) => {
        el.pause();
        el.src = '';
      });
      cache.clear();
    };
  }, []);

  // Sync video element source, currentTime & volume when scrubbing or switching clips
  useEffect(() => {
    const vid = videoElRef.current;
    if (!vid || !activeSegment) return;

    const clip = activeSegment.clip;
    const localTime = (clip.trimStartSec || 0) + Math.max(0, playheadSec - activeSegment.globalStart);
    const effectiveVol = originalAudioMuted || clip.muted ? 0 : Math.min(1, Math.max(0, originalAudioVolume * clip.volume));
    vid.muted = originalAudioMuted || clip.muted || effectiveVol <= 0.001;
    vid.volume = effectiveVol;

    if (!isPlaying && Math.abs(vid.currentTime - localTime) > 0.12 && Number.isFinite(localTime)) {
      try {
        vid.currentTime = localTime;
      } catch {
        // ignore if metadata loading
      }
    }
  }, [activeSegment, playheadSec, isPlaying, originalAudioMuted, originalAudioVolume]);

  // Master rAF playback clock driving video + audio tracks + playhead
  useEffect(() => {
    if (!isPlaying) {
      if (videoElRef.current && !videoElRef.current.paused) {
        videoElRef.current.pause();
      }
      syncAudioTracksAtTime(playheadRef.current, false);
      return;
    }

    if (totalDurationSec <= 0) {
      setIsPlaying(false);
      return;
    }

    let lastTs = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;

      let nextTime = playheadRef.current + dt;
      if (nextTime >= totalDurationSec) {
        onPlayheadChange(0);
        setIsPlaying(false);
        syncAudioTracksAtTime(0, false);
        return;
      }

      // Keep active video element playing in sync
      const seg = timelineSegments.find((s) => nextTime >= s.globalStart && nextTime <= s.globalEnd + 0.001);
      const vid = videoElRef.current;
      if (seg && vid) {
        const expectedLocal = (seg.clip.trimStartSec || 0) + (nextTime - seg.globalStart);
        if (Math.abs(vid.currentTime - expectedLocal) > 0.35 && vid.readyState >= 1) {
          try {
            vid.currentTime = expectedLocal;
          } catch {
            // ignore
          }
        }
        if (vid.paused && vid.readyState >= 1) {
          vid.play().catch(() => {});
        }
      }

      onPlayheadChange(nextTime);
      syncAudioTracksAtTime(nextTime, true);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, totalDurationSec, timelineSegments, onPlayheadChange, syncAudioTracksAtTime]);

  // Pause audio if user scrubs while paused
  const handleScrub = (sec: number) => {
    const clamped = Math.max(0, Math.min(totalDurationSec, sec));
    onPlayheadChange(clamped);
    syncAudioTracksAtTime(clamped, isPlaying);
  };

  // Fullscreen toggle
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    const stage = previewStageRef.current;
    if (!stage) return;
    if (!document.fullscreenElement) {
      stage.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // Clip Editing Actions
  const handleSplitClipAtPlayhead = () => {
    if (!activeSegment) return;
    const { clip, globalStart, globalEnd } = activeSegment;
    const offsetInSegment = playheadSec - globalStart;
    if (offsetInSegment < 0.4 || globalEnd - playheadSec < 0.4) return;

    const splitPointInSource = (clip.trimStartSec || 0) + offsetInSegment;
    const partA: VideoClipItem = {
      ...clip,
      name: `${clip.name} (Part 1)`,
      trimEndSec: Number(splitPointInSource.toFixed(2)),
    };
    const newIdB = `${clip.id}_split_${Date.now().toString(36)}`;
    const partB: VideoClipItem = {
      ...clip,
      id: newIdB,
      name: `${clip.name} (Part 2)`,
      trimStartSec: Number(splitPointInSource.toFixed(2)),
      transition: 'none',
    };

    // Share underlying media entry with split part B
    const origEntry = mediaRegistry[clip.id];
    if (origEntry) {
      onRegisterMedia(newIdB, origEntry);
    }

    const idx = clips.findIndex((c) => c.id === clip.id);
    const next = [...clips];
    next.splice(idx, 1, partA, partB);
    onUpdateClips(next);
    setSelectedClipId(newIdB);
  };

  const handleMoveClip = (clipId: string, dir: -1 | 1) => {
    const idx = clips.findIndex((c) => c.id === clipId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= clips.length) return;
    const next = [...clips];
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    onUpdateClips(next);
  };

  const handleDeleteClip = (clipId: string) => {
    const next = clips.filter((c) => c.id !== clipId);
    onUpdateClips(next);
    if (selectedClipId === clipId) {
      setSelectedClipId(next[0]?.id || null);
    }
  };

  const handleUpdateClipField = (clipId: string, patch: Partial<VideoClipItem>) => {
    onUpdateClips(clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)));
  };

  // Music Preset Synthesizer + Attachment
  const handleAddMusicPreset = async (presetId: string) => {
    setGeneratingMusicId(presetId);
    try {
      const preset = STUDIO_MUSIC_PRESETS.find((p) => p.id === presetId) || STUDIO_MUSIC_PRESETS[0];
      const wavBlob = await generateStudioMusicPresetBlob(preset.id);
      const trackId = `bgm_${preset.id}_${Date.now().toString(36)}`;
      const url = URL.createObjectURL(wavBlob);
      onRegisterMedia(trackId, { blob: wavBlob, url });

      const newTrack: AudioTrackItem = {
        id: trackId,
        name: `${preset.title} (${preset.mood})`,
        trackType: 'music',
        durationSec: preset.durationSec,
        startOffsetSec: 0,
        trimStartSec: 0,
        trimEndSec: preset.durationSec,
        volume: 0.35,
        muted: false,
        presetId: preset.id,
        mimeType: 'audio/wav',
      };
      onUpdateAudioTracks([...audioTracks, newTrack]);
    } finally {
      setGeneratingMusicId(null);
    }
  };

  const handleUploadMusicOrAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dur = (await probeMediaDurationSec(file, 'audio')) || 10;
    const trackId = `aud_up_${Date.now().toString(36)}`;
    const url = URL.createObjectURL(file);
    onRegisterMedia(trackId, { blob: file, url });

    const newTrack: AudioTrackItem = {
      id: trackId,
      name: file.name.replace(/\.[^.]+$/, ''),
      trackType: 'music',
      durationSec: dur,
      startOffsetSec: Number(playheadSec.toFixed(1)),
      trimStartSec: 0,
      trimEndSec: dur,
      volume: 0.5,
      muted: false,
      mimeType: file.type || 'audio/mpeg',
    };
    onUpdateAudioTracks([...audioTracks, newTrack]);
    e.target.value = '';
  };

  // Text Overlay Helpers
  const handleAddTextOverlay = () => {
    if (!newOverlayText.trim()) return;
    const startSec = Number(playheadSec.toFixed(1));
    const maxLimit = totalDurationSec > 0 ? totalDurationSec : startSec + newOverlayDuration;
    const endSec = Number(Math.min(Math.max(startSec + 0.5, startSec + newOverlayDuration), Math.max(maxLimit, startSec + 1)).toFixed(1));

    const item: TextOverlayItem = {
      id: `txt_${Date.now().toString(36)}`,
      text: newOverlayText.trim(),
      startSec,
      endSec,
      position: newOverlayPos,
      color: newOverlayColor,
      fontSize: newOverlaySize,
    };
    onUpdateTextOverlays([...textOverlays, item]);
    setNewOverlayText('');
  };

  // Active text overlays at current playhead
  const visibleOverlays = useMemo(
    () => textOverlays.filter((ov) => playheadSec >= ov.startSec && playheadSec <= ov.endSec),
    [textOverlays, playheadSec]
  );

  // Transition fade opacity near segment boundaries
  const transitionOpacity = useMemo(() => {
    if (!activeSegment) return 1;
    const tr = activeSegment.clip.transition;
    if (tr === 'fade' || tr === 'crossfade') {
      const into = playheadSec - activeSegment.globalStart;
      const outOf = activeSegment.globalEnd - playheadSec;
      if (into < 0.35) return Math.max(0.15, into / 0.35);
      if (outOf < 0.35) return Math.max(0.15, outOf / 0.35);
    }
    return 1;
  }, [activeSegment, playheadSec]);

  const aspectContainerClass =
    cropRatio === '9:16'
      ? 'aspect-[9/16] max-h-[420px] mx-auto'
      : cropRatio === '1:1'
      ? 'aspect-square max-h-[380px] mx-auto'
      : cropRatio === '4:5'
      ? 'aspect-[4/5] max-h-[400px] mx-auto'
      : 'aspect-video w-full';

  return (
    <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/90 dark:border-stone-800 p-4 sm:p-6 space-y-5 shadow-2xs">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-stone-900 dark:bg-amber-600 text-white flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif-display text-lg font-bold text-stone-900 dark:text-stone-100">
              Video &amp; Audio Assembly Timeline
            </h3>
            <p className="text-xs text-stone-500 tabular-nums">
              {clips.length} video clip{clips.length === 1 ? '' : 's'} &bull; {audioTracks.length} audio track{audioTracks.length === 1 ? '' : 's'} &bull; {textOverlays.length} caption{textOverlays.length === 1 ? '' : 's'} &bull; Total {totalDurationSec.toFixed(1)}s
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onRequestRecordVideo && (
            <button
              type="button"
              onClick={onRequestRecordVideo}
              className="px-3 py-2 min-h-[38px] rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-xs font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-600" />
              <span>Record Clip</span>
            </button>
          )}
          {onRequestUploadVideo && (
            <button
              type="button"
              onClick={onRequestUploadVideo}
              className="px-3 py-2 min-h-[38px] rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-xs font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-amber-600" />
              <span>Add Clip</span>
            </button>
          )}
          {onRequestRecordAudio && (
            <button
              type="button"
              onClick={onRequestRecordAudio}
              className="px-3 py-2 min-h-[38px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Add Voiceover</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setTimelineExpanded(!timelineExpanded)}
            className="px-3 py-2 min-h-[38px] rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1.5 cursor-pointer"
          >
            {timelineExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{timelineExpanded ? 'Compact' : 'Expand Timeline'}</span>
          </button>
        </div>
      </div>

      {/* Synchronized Multi-Track Preview Player */}
      <div
        ref={previewStageRef}
        className={`rounded-2xl bg-stone-950 border border-stone-800 overflow-hidden ${isFullscreen ? 'flex flex-col justify-center p-6' : ''}`}
      >
        <div className="relative bg-black flex items-center justify-center p-2 sm:p-3">
          <div
            className={`relative overflow-hidden bg-stone-900 rounded-xl flex items-center justify-center ${aspectContainerClass}`}
            style={{ opacity: transitionOpacity, transition: 'opacity 120ms linear' }}
          >
            {activeClipMediaUrl ? (
              <video
                ref={videoElRef}
                key={activeClip?.id}
                src={activeClipMediaUrl}
                playsInline
                preload="auto"
                className="w-full h-full object-cover"
                style={{
                  transform: `rotate(${rotation}deg) scale(${rotation === 90 || rotation === 270 ? 1.15 : 1})`,
                }}
              />
            ) : (
              <div className="text-center p-8 text-stone-400 space-y-2">
                <Layers className="w-10 h-10 mx-auto text-stone-600" />
                <p className="text-xs font-medium">
                  Record or upload at least one video clip to preview it on the timeline.
                </p>
              </div>
            )}

            {/* Live Timed Text Overlays / Captions */}
            {visibleOverlays.map((ov) => {
              const posClass =
                ov.position === 'top'
                  ? 'top-4'
                  : ov.position === 'middle'
                  ? 'top-1/2 -translate-y-1/2'
                  : 'bottom-4';
              const sizeClass =
                ov.fontSize === 'sm'
                  ? 'text-xs sm:text-sm px-3 py-1'
                  : ov.fontSize === 'lg'
                  ? 'text-lg sm:text-2xl px-5 py-2'
                  : 'text-sm sm:text-base px-4 py-1.5';
              return (
                <div
                  key={ov.id}
                  className={`absolute left-1/2 -translate-x-1/2 ${posClass} max-w-[88%] text-center rounded-xl bg-black/65 backdrop-blur-xs font-bold shadow-lg pointer-events-none ${sizeClass}`}
                  style={{ color: ov.color || '#ffffff' }}
                >
                  {ov.text}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 p-2 rounded-xl bg-black/65 hover:bg-black/85 text-white border border-white/15 cursor-pointer"
            title="Toggle fullscreen preview"
            aria-label="Toggle fullscreen preview"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>

        {/* Transport & Quick Transform Controls */}
        <div className="px-4 py-3 bg-stone-900 border-t border-stone-800 space-y-3">
          {/* Playhead Scrubber */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-amber-400 tabular-nums w-16">
              {formatClock(playheadSec)}
            </span>
            <input
              type="range"
              min="0"
              max={Math.max(0.5, totalDurationSec)}
              step="0.05"
              value={Math.min(playheadSec, Math.max(0.5, totalDurationSec))}
              onChange={(e) => handleScrub(parseFloat(e.target.value))}
              className="flex-1 accent-amber-500 cursor-pointer"
            />
            <span className="font-mono text-xs text-stone-400 tabular-nums w-16 text-right">
              {formatClock(totalDurationSec)}
            </span>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleScrub(0)}
                className="p-2 min-h-[38px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
                title="Jump to start"
                aria-label="Jump to start"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                disabled={totalDurationSec <= 0}
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-4 py-2 min-h-[38px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                <span>{isPlaying ? 'Pause' : 'Play Mix'}</span>
              </button>

              <button
                type="button"
                disabled={!activeSegment}
                onClick={handleSplitClipAtPlayhead}
                className="px-3 py-2 min-h-[38px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                title="Split active clip at current playhead"
              >
                <Scissors className="w-3.5 h-3.5 text-amber-400" />
                <span>Split at Playhead</span>
              </button>
            </div>

            {/* Crop & Rotate Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-stone-800 rounded-xl p-1">
                <Crop className="w-3.5 h-3.5 text-amber-400 ml-1.5 mr-1" />
                {(['original', '16:9', '9:16', '1:1', '4:5'] as CropAspectRatio[]).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => onChangeCropRatio(ratio)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      cropRatio === ratio
                        ? 'bg-amber-600 text-white'
                        : 'text-stone-300 hover:text-white'
                    }`}
                  >
                    {ratio === 'original' ? 'Auto' : ratio}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => onChangeRotation((((rotation + 90) % 360) as VideoRotationDeg))}
                className="px-3 py-2 min-h-[36px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                title="Rotate video 90 degrees"
              >
                <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                <span>{rotation}°</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Multi-Track Workspace */}
      {timelineExpanded && (
        <div className="space-y-4">
          {/* Visual Multi-Track Strip */}
          {totalDurationSec > 0 && (
            <div className="p-3 rounded-2xl bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-2 overflow-x-auto">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center justify-between">
                <span>Multi-Track Timeline Overview</span>
                <span className="tabular-nums">Playhead: {playheadSec.toFixed(1)}s / {totalDurationSec.toFixed(1)}s</span>
              </div>

              {/* Video Strip */}
              <div className="relative h-11 rounded-xl bg-stone-200 dark:bg-stone-900 flex overflow-hidden p-1 gap-1">
                {timelineSegments.map((seg) => {
                  const pct = Math.max(8, (seg.clipDur / totalDurationSec) * 100);
                  const isSel = selectedClip?.id === seg.clip.id;
                  return (
                    <button
                      key={seg.clip.id}
                      type="button"
                      onClick={() => {
                        setSelectedClipId(seg.clip.id);
                        handleScrub(seg.globalStart);
                      }}
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-lg px-2 text-left flex flex-col justify-center overflow-hidden transition-all cursor-pointer ${
                        isSel
                          ? 'bg-amber-600 text-white ring-2 ring-amber-300'
                          : 'bg-stone-800 text-stone-200 hover:bg-stone-700'
                      }`}
                    >
                      <span className="text-[10px] font-bold truncate">{seg.clip.name}</span>
                      <span className="text-[9px] opacity-80 tabular-nums">{seg.clipDur.toFixed(1)}s</span>
                    </button>
                  );
                })}
                {/* Playhead Needle */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
                  style={{ left: `${Math.min(100, (playheadSec / Math.max(0.1, totalDurationSec)) * 100)}%` }}
                />
              </div>

              {/* Audio & Voiceover Track Bars */}
              {audioTracks.map((track) => {
                const dur = Math.max(0.2, (track.trimEndSec || track.durationSec) - (track.trimStartSec || 0));
                const leftPct = Math.min(92, ((track.startOffsetSec || 0) / Math.max(0.1, totalDurationSec)) * 100);
                const widthPct = Math.max(6, Math.min(100 - leftPct, (dur / Math.max(0.1, totalDurationSec)) * 100));
                return (
                  <div
                    key={track.id}
                    className="relative h-7 rounded-lg bg-stone-200/80 dark:bg-stone-900/90 overflow-hidden"
                  >
                    <div
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      className={`absolute top-1 bottom-1 rounded-md px-2 flex items-center justify-between text-[10px] font-semibold truncate ${
                        track.muted
                          ? 'bg-stone-400/50 text-stone-700 line-through'
                          : track.trackType === 'voiceover'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 text-white'
                      }`}
                    >
                      <span className="truncate">{track.name}</span>
                      <span className="tabular-nums ml-1 opacity-85">{Math.round(track.volume * 100)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Editor Sub-Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-2">
            {[
              { id: 'clips', label: `Clips & Trim (${clips.length})`, icon: Sliders },
              { id: 'audio', label: `Audio, Voiceovers & Music (${audioTracks.length})`, icon: Music },
              { id: 'text', label: `Text & Subtitles (${textOverlays.length})`, icon: Type },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeEditorTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveEditorTab(tab.id as any)}
                  className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    active
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Clips Trim, Reorder & Transitions */}
          {activeEditorTab === 'clips' && (
            <div className="space-y-3">
              {clips.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-center text-xs text-stone-500">
                  No video clips on the timeline yet. Record or upload a clip above to begin editing.
                </div>
              ) : (
                <div className="space-y-3">
                  {clips.map((clip, idx) => {
                    const isSel = selectedClip?.id === clip.id;
                    const segDur = Math.max(0.2, (clip.trimEndSec || clip.durationSec) - (clip.trimStartSec || 0));
                    return (
                      <div
                        key={clip.id}
                        className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
                          isSel
                            ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700'
                            : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-2 py-0.5 rounded-md bg-stone-900 text-white text-[10px] font-bold">
                              Clip {idx + 1}
                            </span>
                            <input
                              type="text"
                              value={clip.name}
                              onChange={(e) => handleUpdateClipField(clip.id, { name: e.target.value })}
                              className="text-xs font-bold bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none text-stone-900 dark:text-stone-100"
                            />
                            <span className="text-[11px] text-stone-500 tabular-nums">
                              ({segDur.toFixed(1)}s active / {clip.durationSec.toFixed(1)}s source)
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveClip(clip.id, -1)}
                              className="p-1.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 disabled:opacity-40 cursor-pointer"
                              title="Move clip earlier"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === clips.length - 1}
                              onClick={() => handleMoveClip(clip.id, 1)}
                              className="p-1.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 disabled:opacity-40 cursor-pointer"
                              title="Move clip later"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateClipField(clip.id, { muted: !clip.muted })}
                              className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                                clip.muted
                                  ? 'bg-red-100 border-red-300 text-red-600'
                                  : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200'
                              }`}
                              title={clip.muted ? 'Unmute clip original audio' : 'Mute clip original audio'}
                            >
                              {clip.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClip(clip.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                              title="Remove clip"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <div className="flex justify-between text-[11px] text-stone-600 dark:text-stone-400 mb-1">
                              <span>Trim Start</span>
                              <span className="font-bold tabular-nums">{clip.trimStartSec.toFixed(1)}s</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max={Math.max(0, clip.trimEndSec - 0.3)}
                              step="0.1"
                              value={clip.trimStartSec}
                              onChange={(e) =>
                                handleUpdateClipField(clip.id, { trimStartSec: parseFloat(e.target.value) })
                              }
                              className="w-full accent-amber-600 cursor-pointer"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-stone-600 dark:text-stone-400 mb-1">
                              <span>Trim End</span>
                              <span className="font-bold tabular-nums">{clip.trimEndSec.toFixed(1)}s</span>
                            </div>
                            <input
                              type="range"
                              min={Math.min(clip.durationSec, clip.trimStartSec + 0.3)}
                              max={Math.max(0.5, clip.durationSec)}
                              step="0.1"
                              value={clip.trimEndSec}
                              onChange={(e) =>
                                handleUpdateClipField(clip.id, { trimEndSec: parseFloat(e.target.value) })
                              }
                              className="w-full accent-amber-600 cursor-pointer"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] text-stone-600 dark:text-stone-400 mb-1">
                              Clip Transition
                            </label>
                            <select
                              value={clip.transition}
                              onChange={(e) =>
                                handleUpdateClipField(clip.id, {
                                  transition: e.target.value as VideoTransitionType,
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-medium"
                            >
                              <option value="none">Direct Cut</option>
                              <option value="fade">Fade In / Out</option>
                              <option value="crossfade">Smooth Crossfade</option>
                              <option value="slide">Slide Transition</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Original Audio, Voiceovers & Background Music Mixer */}
          {activeEditorTab === 'audio' && (
            <div className="space-y-4">
              {/* Original Video Audio Master Track */}
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onChangeOriginalAudio(originalAudioVolume, !originalAudioMuted)}
                    className={`p-2 rounded-xl border cursor-pointer ${
                      originalAudioMuted
                        ? 'bg-red-100 border-red-300 text-red-600'
                        : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-amber-600'
                    }`}
                  >
                    {originalAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <div>
                    <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Original Video Microphone / Room Audio
                    </p>
                    <p className="text-[11px] text-stone-500">
                      Mute completely if replacing with clean voiceover narration
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-60">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={originalAudioMuted ? 0 : originalAudioVolume}
                    onChange={(e) => onChangeOriginalAudio(parseFloat(e.target.value), false)}
                    className="flex-1 accent-amber-600 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-200 tabular-nums w-11 text-right">
                    {originalAudioMuted ? 'Mute' : `${Math.round(originalAudioVolume * 100)}%`}
                  </span>
                </div>
              </div>

              {/* Voiceover & Music Track Controls */}
              {audioTracks.length > 0 && (
                <div className="space-y-2.5">
                  {audioTracks.map((track) => {
                    const clipLen = Math.max(0.2, (track.trimEndSec || track.durationSec) - (track.trimStartSec || 0));
                    return (
                      <div
                        key={track.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                track.trackType === 'voiceover'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                              }`}
                            >
                              {track.trackType === 'voiceover' ? 'Voiceover' : 'Music'}
                            </span>
                            <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                              {track.name}
                            </span>
                            <span className="text-[11px] text-stone-500 tabular-nums">
                              ({clipLen.toFixed(1)}s)
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateAudioTracks(
                                  audioTracks.map((t) =>
                                    t.id === track.id ? { ...t, muted: !t.muted } : t
                                  )
                                )
                              }
                              className={`p-1.5 rounded-lg border cursor-pointer ${
                                track.muted
                                  ? 'bg-red-100 border-red-300 text-red-600'
                                  : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700'
                              }`}
                            >
                              {track.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateAudioTracks(audioTracks.filter((t) => t.id !== track.id))
                              }
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <div className="flex justify-between text-[11px] text-stone-500 mb-1">
                              <span>Start Delay on Video</span>
                              <span className="font-bold tabular-nums">{track.startOffsetSec.toFixed(1)}s</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max={Math.max(10, totalDurationSec)}
                              step="0.2"
                              value={track.startOffsetSec}
                              onChange={(e) =>
                                onUpdateAudioTracks(
                                  audioTracks.map((t) =>
                                    t.id === track.id
                                      ? { ...t, startOffsetSec: parseFloat(e.target.value) }
                                      : t
                                  )
                                )
                              }
                              className="w-full accent-amber-600 cursor-pointer"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-stone-500 mb-1">
                              <span>Trim Audio End</span>
                              <span className="font-bold tabular-nums">{track.trimEndSec.toFixed(1)}s</span>
                            </div>
                            <input
                              type="range"
                              min="0.5"
                              max={Math.max(0.5, track.durationSec)}
                              step="0.2"
                              value={track.trimEndSec}
                              onChange={(e) =>
                                onUpdateAudioTracks(
                                  audioTracks.map((t) =>
                                    t.id === track.id
                                      ? { ...t, trimEndSec: parseFloat(e.target.value) }
                                      : t
                                  )
                                )
                              }
                              className="w-full accent-amber-600 cursor-pointer"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-stone-500 mb-1">
                              <span>Track Volume</span>
                              <span className="font-bold tabular-nums">{Math.round(track.volume * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="0.05"
                              value={track.volume}
                              onChange={(e) =>
                                onUpdateAudioTracks(
                                  audioTracks.map((t) =>
                                    t.id === track.id
                                      ? { ...t, volume: parseFloat(e.target.value), muted: false }
                                      : t
                                  )
                                )
                              }
                              className="w-full accent-amber-600 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Built-In Kitchen Music Presets & Custom Music Upload */}
              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Background Kitchen Music Library</span>
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Add studio-synthesized cooking music or import your own MP3 / WAV audio track
                    </p>
                  </div>

                  <div>
                    <input
                      ref={musicUploadInputRef}
                      type="file"
                      accept="audio/*,.mp3,.wav,.m4a,.ogg"
                      onChange={handleUploadMusicOrAudio}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => musicUploadInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-800 dark:text-stone-100 hover:bg-stone-100 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-600" />
                      <span>Upload Music</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {STUDIO_MUSIC_PRESETS.map((preset) => {
                    const alreadyAdded = audioTracks.some((t) => t.presetId === preset.id);
                    const loadingThis = generatingMusicId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        disabled={Boolean(generatingMusicId)}
                        onClick={() => handleAddMusicPreset(preset.id)}
                        className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-amber-500 text-left transition-colors cursor-pointer disabled:opacity-60"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                            {preset.title}
                          </span>
                          {loadingThis ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
                          ) : alreadyAdded ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-stone-500 block mt-0.5">
                          {preset.mood} &bull; {preset.durationSec}s
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Timed Text Overlays & Subtitles */}
          {activeEditorTab === 'text' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">
                      Caption / Ingredient Note (Starts at {playheadSec.toFixed(1)}s)
                    </label>
                    <input
                      type="text"
                      value={newOverlayText}
                      onChange={(e) => setNewOverlayText(e.target.value)}
                      placeholder="e.g. Simmer gently on medium-low for 3 mins"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">Position</label>
                    <select
                      value={newOverlayPos}
                      onChange={(e) => setNewOverlayPos(e.target.value as any)}
                      className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs"
                    >
                      <option value="top">Top</option>
                      <option value="middle">Middle</option>
                      <option value="bottom">Bottom</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">Show For (s)</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={newOverlayDuration}
                      onChange={(e) => setNewOverlayDuration(Math.max(1, Number(e.target.value) || 3))}
                      className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-2">
                    <select
                      value={newOverlayColor}
                      onChange={(e) => setNewOverlayColor(e.target.value)}
                      className="px-2.5 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs"
                    >
                      <option value="#ffffff">White</option>
                      <option value="#fbbf24">Amber Gold</option>
                      <option value="#6ee7b7">Mint</option>
                      <option value="#fda4af">Rose</option>
                    </select>
                    <select
                      value={newOverlaySize}
                      onChange={(e) => setNewOverlaySize(e.target.value as any)}
                      className="px-2 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs"
                    >
                      <option value="sm">S</option>
                      <option value="md">M</option>
                      <option value="lg">L</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddTextOverlay}
                      disabled={!newOverlayText.trim()}
                      className="flex-1 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {textOverlays.length === 0 ? (
                <p className="text-xs text-stone-500 text-center py-4">
                  No text captions added yet. Scrub the playhead and add step notes or subtitles above.
                </p>
              ) : (
                <div className="space-y-2">
                  {textOverlays.map((ov) => (
                    <div
                      key={ov.id}
                      className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex flex-wrap items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-stone-300 shrink-0"
                          style={{ backgroundColor: ov.color }}
                        />
                        <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                          &ldquo;{ov.text}&rdquo;
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-stone-500 tabular-nums">
                        <span>{ov.startSec.toFixed(1)}s – {ov.endSec.toFixed(1)}s</span>
                        <span className="capitalize px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200">
                          {ov.position}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateTextOverlays(textOverlays.filter((t) => t.id !== ov.id))}
                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
