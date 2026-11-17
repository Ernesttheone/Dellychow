import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Scissors,
  Maximize,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Upload,
  Film,
} from 'lucide-react';
import {
  AudioTrackItem,
  CropAspectRatio,
  OverlayEffectItem,
  TextOverlayItem,
  VideoClipItem,
  VideoFilterPreset,
  VideoRotationDeg,
} from '../../types';
import { LocalStudioMediaEntry } from '../../lib/videoAiAnalysis';

export interface StudioPreviewPlayerProps {
  clips: VideoClipItem[];
  audioTracks: AudioTrackItem[];
  textOverlays: TextOverlayItem[];
  overlayEffects: OverlayEffectItem[];
  cropRatio: CropAspectRatio;
  projectRotation: VideoRotationDeg;
  projectBgColor: string;
  originalAudioVolume: number;
  originalAudioMuted: boolean;
  mediaRegistry: Record<string, LocalStudioMediaEntry>;
  playheadSec: number;
  isPlaying: boolean;
  selectedTextId: string | null;
  onPlayheadChange: (sec: number) => void;
  onTogglePlay: (playing: boolean) => void;
  onSplitAtPlayhead: () => void;
  onSelectTextOverlay: (id: string) => void;
  onMoveTextOverlay: (id: string, xPercent: number, yPercent: number) => void;
  onMovePipClip?: (clipId: string, pipX: number, pipY: number) => void;
  onDropFiles?: (files: FileList) => void;
  previewFilterOverride?: VideoFilterPreset | null;
}

export function formatTimeClock(sec: number): string {
  const safe = Math.max(0, sec);
  const mins = Math.floor(safe / 60);
  const rem = Math.floor(safe % 60);
  const tenths = Math.floor((safe % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}.${tenths}`;
}

export function buildClipCssFilter(clip: VideoClipItem | null, overridePreset?: VideoFilterPreset | null): string {
  if (!clip) return 'none';
  const preset = overridePreset ?? clip.filterPreset ?? 'none';
  const brightBase = 100 + Number(clip.brightness || 0) * 0.6 + Number(clip.exposure || 0) * 0.45;
  const contrastBase = 100 + Number(clip.contrast || 0) * 0.75;
  const satBase = 100 + Number(clip.saturation || 0) * 0.85;
  const blurPx = Number(clip.blur || 0);

  let presetFilter = '';
  switch (preset) {
    case 'warm_kitchen':
      presetFilter = 'sepia(14%) saturate(122%) contrast(106%)';
      break;
    case 'crisp_studio':
      presetFilter = 'contrast(115%) saturate(108%) brightness(103%)';
      break;
    case 'vintage_film':
      presetFilter = 'sepia(34%) contrast(110%) saturate(80%)';
      break;
    case 'high_contrast':
      presetFilter = 'contrast(135%) saturate(112%)';
      break;
    case 'noir_bw':
      presetFilter = 'grayscale(100%) contrast(125%)';
      break;
    case 'golden_hour':
      presetFilter = 'sepia(22%) saturate(130%) brightness(105%)';
      break;
    case 'cool_fresh':
      presetFilter = 'hue-rotate(10deg) saturate(108%) brightness(102%)';
      break;
    default:
      presetFilter = '';
  }

  const adj = `brightness(${Math.max(30, brightBase).toFixed(0)}%) contrast(${Math.max(30, contrastBase).toFixed(0)}%) saturate(${Math.max(0, satBase).toFixed(0)}%)`;
  const blurStr = blurPx > 0.2 ? ` blur(${blurPx.toFixed(1)}px)` : '';
  return `${adj} ${presetFilter}${blurStr}`.trim();
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return [0, 255, 0];
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

export const StudioPreviewPlayer: React.FC<StudioPreviewPlayerProps> = ({
  clips,
  audioTracks,
  textOverlays,
  overlayEffects,
  cropRatio,
  projectRotation,
  projectBgColor,
  originalAudioVolume,
  originalAudioMuted,
  mediaRegistry,
  playheadSec,
  isPlaying,
  selectedTextId,
  onPlayheadChange,
  onTogglePlay,
  onSplitAtPlayhead,
  onSelectTextOverlay,
  onMoveTextOverlay,
  onMovePipClip,
  onDropFiles,
  previewFilterOverride,
}) => {
  const stageOuterRef = useRef<HTMLDivElement | null>(null);
  const canvasBoxRef = useRef<HTMLDivElement | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const chromaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipVideoElRef = useRef<HTMLVideoElement | null>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioNodesRef = useRef<
    Map<
      string,
      {
        el: HTMLAudioElement;
        gain: GainNode;
        hp: BiquadFilterNode;
        lp: BiquadFilterNode;
        srcConnected: boolean;
      }
    >
  >(new Map());

  const playheadRef = useRef(playheadSec);
  playheadRef.current = playheadSec;

  const [isDragOver, setIsDragOver] = useState(false);
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
  const [draggingPipId, setDraggingPipId] = useState<string | null>(null);

  // Build flat segment timeline for Track V1 (trackIndex === 0 or undefined)
  const v1Segments = useMemo(() => {
    let cursor = 0;
    return clips
      .filter((c) => (c.trackIndex ?? 0) === 0)
      .map((clip, index) => {
        const speed = Math.max(0.25, Math.min(3.0, Number(clip.speed) || 1));
        const trimS = Math.max(0, Number(clip.trimStartSec) || 0);
        const trimE = Math.max(trimS + 0.2, Number(clip.trimEndSec) || Number(clip.durationSec) || 5);
        const clipDur = Math.max(0.2, (trimE - trimS) / speed);
        const start = cursor;
        const end = cursor + clipDur;
        cursor = end;
        return { index, clip, speed, trimS, trimE, clipDur, globalStart: start, globalEnd: end };
      });
  }, [clips]);

  const v2Clips = useMemo(() => clips.filter((c) => c.trackIndex === 1), [clips]);

  const totalDurationSec = useMemo(() => {
    const vTotal = v1Segments.length > 0 ? v1Segments[v1Segments.length - 1].globalEnd : 0;
    const pipTotal = v2Clips.reduce((mx, c) => {
      const sp = Math.max(0.25, Math.min(3.0, Number(c.speed) || 1));
      const len = Math.max(0.2, ((c.trimEndSec || c.durationSec) - (c.trimStartSec || 0)) / sp);
      return Math.max(mx, (c.startOffsetSec || 0) + len);
    }, 0);
    const aTotal = audioTracks.reduce((mx, t) => {
      const len = Math.max(0.2, (t.trimEndSec || t.durationSec) - (t.trimStartSec || 0));
      return Math.max(mx, (t.startOffsetSec || 0) + len);
    }, 0);
    return vTotal > 0 ? Math.max(vTotal, pipTotal) : Math.max(aTotal, pipTotal);
  }, [v1Segments, v2Clips, audioTracks]);

  const activeSegment = useMemo(() => {
    if (v1Segments.length === 0) return null;
    return (
      v1Segments.find((s) => playheadSec >= s.globalStart && playheadSec <= s.globalEnd + 0.001) ||
      v1Segments[v1Segments.length - 1]
    );
  }, [v1Segments, playheadSec]);

  const activeClip = activeSegment?.clip || null;
  const activeClipUrl = activeClip ? mediaRegistry[activeClip.id]?.url || activeClip.serverUrl || '' : '';

  // Active Track V2 PiP clip at current playhead
  const activePip = useMemo(() => {
    for (const c of v2Clips) {
      const sp = Math.max(0.25, Math.min(3.0, Number(c.speed) || 1));
      const trimS = Math.max(0, c.trimStartSec || 0);
      const trimE = Math.max(trimS + 0.2, c.trimEndSec || c.durationSec || 5);
      const len = (trimE - trimS) / sp;
      const start = c.startOffsetSec || 0;
      if (playheadSec >= start && playheadSec <= start + len) {
        return { clip: c, start, speed: sp, trimS, trimE, len };
      }
    }
    return null;
  }, [v2Clips, playheadSec]);

  const activePipUrl = activePip ? mediaRegistry[activePip.clip.id]?.url || activePip.clip.serverUrl || '' : '';

  // Web Audio Multi-Track Synchronizer (handles volume, fades, & noise reduction)
  const syncAudioTracks = useCallback(
    (timeSec: number, playing: boolean) => {
      if (audioTracks.length === 0) return;
      if (playing && !audioCtxRef.current && typeof AudioContext !== 'undefined') {
        try {
          audioCtxRef.current = new AudioContext();
        } catch {
          // fallback if blocked
        }
      }
      if (audioCtxRef.current && playing && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }

      const ctx = audioCtxRef.current;

      audioTracks.forEach((track) => {
        const srcUrl = mediaRegistry[track.id]?.url || track.serverUrl;
        if (!srcUrl) return;

        let entry = audioNodesRef.current.get(track.id);
        if (!entry) {
          const el = new Audio(srcUrl);
          el.preload = 'auto';
          el.crossOrigin = 'anonymous';
          let gain: GainNode;
          let hp: BiquadFilterNode;
          let lp: BiquadFilterNode;
          let srcConnected = false;

          if (ctx) {
            gain = ctx.createGain();
            hp = ctx.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.value = 20;
            lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = 20000;
            try {
              const sourceNode = ctx.createMediaElementSource(el);
              sourceNode.connect(hp);
              hp.connect(lp);
              lp.connect(gain);
              gain.connect(ctx.destination);
              srcConnected = true;
            } catch {
              srcConnected = false;
            }
          } else {
            gain = null as any;
            hp = null as any;
            lp = null as any;
          }
          entry = { el, gain, hp, lp, srcConnected };
          audioNodesRef.current.set(track.id, entry);
        } else if (entry.el.src !== srcUrl && !entry.el.src.endsWith(srcUrl)) {
          entry.el.src = srcUrl;
        }

        const trimS = track.trimStartSec || 0;
        const trimE = track.trimEndSec || track.durationSec || 5;
        const trackLen = Math.max(0.1, trimE - trimS);
        const startOff = track.startOffsetSec || 0;
        const localElapsed = timeSec - startOff;
        const inside = localElapsed >= 0 && localElapsed <= trackLen;

        // Calculate fade multiplier
        const fadeIn = Math.max(0, Math.min(trackLen / 2, track.fadeInSec || 0));
        const fadeOut = Math.max(0, Math.min(trackLen / 2, track.fadeOutSec || 0));
        let fadeMult = 1;
        if (fadeIn > 0.05 && localElapsed < fadeIn) {
          fadeMult = Math.max(0.02, localElapsed / fadeIn);
        } else if (fadeOut > 0.05 && trackLen - localElapsed < fadeOut) {
          fadeMult = Math.max(0.02, (trackLen - localElapsed) / fadeOut);
        }

        const targetVol = track.muted ? 0 : Math.min(2, Math.max(0, track.volume * fadeMult));

        if (entry.srcConnected && ctx && entry.gain) {
          entry.gain.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.02);
          entry.hp.frequency.setTargetAtTime(track.noiseReduction ? 110 : 20, ctx.currentTime, 0.02);
          entry.lp.frequency.setTargetAtTime(track.noiseReduction ? 7500 : 20000, ctx.currentTime, 0.02);
          entry.el.muted = Boolean(track.muted);
          entry.el.volume = 1;
        } else {
          entry.el.muted = Boolean(track.muted);
          entry.el.volume = Math.min(1, targetVol);
        }

        if (playing && inside && !track.muted) {
          const targetTime = trimS + localElapsed;
          if (Math.abs(entry.el.currentTime - targetTime) > 0.28) {
            try {
              entry.el.currentTime = targetTime;
            } catch {
              // ignore
            }
          }
          if (entry.el.paused) {
            entry.el.play().catch(() => {});
          }
        } else if (!entry.el.paused) {
          entry.el.pause();
        }
      });
    },
    [audioTracks, mediaRegistry]
  );

  useEffect(() => {
    const valid = new Set(audioTracks.map((t) => t.id));
    audioNodesRef.current.forEach((node, id) => {
      if (!valid.has(id)) {
        node.el.pause();
        node.el.src = '';
        audioNodesRef.current.delete(id);
      }
    });
  }, [audioTracks]);

  useEffect(() => {
    const mapRef = audioNodesRef.current;
    return () => {
      mapRef.forEach((n) => {
        n.el.pause();
        n.el.src = '';
      });
      mapRef.clear();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Compute source time accounting for clip speed & reverse playback
  const computeLocalClipTime = (seg: typeof v1Segments[number], globalTime: number) => {
    const elapsedOut = Math.max(0, globalTime - seg.globalStart);
    const sourceSpan = seg.trimE - seg.trimS;
    if (seg.clip.reversed) {
      return Math.max(seg.trimS, seg.trimE - elapsedOut * seg.speed);
    }
    return Math.min(seg.trimE, seg.trimS + elapsedOut * seg.speed);
  };

  // Sync V1 video element on scrub / setting change
  useEffect(() => {
    const vid = videoElRef.current;
    if (!vid || !activeSegment || activeSegment.clip.isFreezeFrame) return;

    const clip = activeSegment.clip;
    const localTime = computeLocalClipTime(activeSegment, playheadSec);
    const audioOff = originalAudioMuted || clip.muted || clip.audioDetached || clip.reversed;
    const vol = audioOff ? 0 : Math.min(1, Math.max(0, originalAudioVolume * clip.volume));
    vid.muted = audioOff || vol <= 0.005;
    vid.volume = vol;
    vid.playbackRate = Math.max(0.25, Math.min(3, activeSegment.speed));

    if ((!isPlaying || clip.reversed) && Math.abs(vid.currentTime - localTime) > 0.1 && Number.isFinite(localTime)) {
      try {
        vid.currentTime = localTime;
      } catch {
        // metadata loading
      }
    }
  }, [activeSegment, playheadSec, isPlaying, originalAudioMuted, originalAudioVolume]);

  // Sync V2 PiP video element
  useEffect(() => {
    const pVid = pipVideoElRef.current;
    if (!pVid || !activePip) return;
    const elapsedOut = Math.max(0, playheadSec - activePip.start);
    const localTime = activePip.clip.reversed
      ? Math.max(activePip.trimS, activePip.trimE - elapsedOut * activePip.speed)
      : Math.min(activePip.trimE, activePip.trimS + elapsedOut * activePip.speed);
    pVid.muted = originalAudioMuted || activePip.clip.muted || Boolean(activePip.clip.audioDetached);
    pVid.volume = pVid.muted ? 0 : Math.min(1, Math.max(0, originalAudioVolume * activePip.clip.volume));
    pVid.playbackRate = activePip.speed;

    if (!isPlaying && Math.abs(pVid.currentTime - localTime) > 0.15) {
      try {
        pVid.currentTime = localTime;
      } catch {
        // ignore
      }
    }
  }, [activePip, playheadSec, isPlaying, originalAudioMuted, originalAudioVolume]);

  // Live Canvas Chroma Key renderer for V1 or V2 when chromaKeyEnabled is true
  useEffect(() => {
    const needsV1Chroma = Boolean(activeClip?.chromaKeyEnabled && !activeClip.isFreezeFrame);
    const needsV2Chroma = Boolean(activePip?.clip.chromaKeyEnabled);
    if (!needsV1Chroma && !needsV2Chroma) return;

    let raf = 0;
    const paintChroma = (
      video: HTMLVideoElement | null,
      canvas: HTMLCanvasElement | null,
      keyHex: string,
      sim: number
    ) => {
      if (!video || !canvas || video.readyState < 2 || !video.videoWidth) return;
      const w = 360;
      const h = Math.max(120, Math.round((video.videoHeight / video.videoWidth) * w));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const frame = ctx.getImageData(0, 0, w, h);
      const data = frame.data;
      const [kr, kg, kb] = hexToRgb(keyHex || '#00ff00');
      const maxDist = Math.max(25, Math.min(240, sim * 442));

      for (let i = 0; i < data.length; i += 4) {
        const dr = data[i] - kr;
        const dg = data[i + 1] - kg;
        const db = data[i + 2] - kb;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        if (dist < maxDist) {
          data[i + 3] = dist > maxDist * 0.75 ? Math.round(((dist - maxDist * 0.75) / (maxDist * 0.25)) * 255) : 0;
        }
      }
      ctx.putImageData(frame, 0, 0);
    };

    const loop = () => {
      if (needsV1Chroma && activeClip) {
        paintChroma(
          videoElRef.current,
          chromaCanvasRef.current,
          activeClip.chromaKeyColor || '#00ff00',
          activeClip.chromaKeySimilarity ?? 0.22
        );
      }
      if (needsV2Chroma && activePip) {
        paintChroma(
          pipVideoElRef.current,
          pipCanvasRef.current,
          activePip.clip.chromaKeyColor || '#00ff00',
          activePip.clip.chromaKeySimilarity ?? 0.22
        );
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [activeClip, activePip]);

  // Master playback rAF loop
  useEffect(() => {
    if (!isPlaying) {
      if (videoElRef.current && !videoElRef.current.paused) videoElRef.current.pause();
      if (pipVideoElRef.current && !pipVideoElRef.current.paused) pipVideoElRef.current.pause();
      syncAudioTracks(playheadRef.current, false);
      return;
    }

    if (totalDurationSec <= 0) {
      onTogglePlay(false);
      return;
    }

    let lastTs = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;

      const nextTime = playheadRef.current + dt;
      if (nextTime >= totalDurationSec) {
        onPlayheadChange(0);
        onTogglePlay(false);
        syncAudioTracks(0, false);
        return;
      }

      const seg = v1Segments.find((s) => nextTime >= s.globalStart && nextTime <= s.globalEnd + 0.001);
      const vid = videoElRef.current;
      if (seg && vid && !seg.clip.isFreezeFrame) {
        const expected = computeLocalClipTime(seg, nextTime);
        if (seg.clip.reversed) {
          if (!vid.paused) vid.pause();
          if (vid.readyState >= 1) {
            try {
              vid.currentTime = expected;
            } catch {
              // ignore
            }
          }
        } else {
          if (Math.abs(vid.currentTime - expected) > 0.35 && vid.readyState >= 1) {
            try {
              vid.currentTime = expected;
            } catch {
              // ignore
            }
          }
          if (vid.paused && vid.readyState >= 1) {
            vid.play().catch(() => {});
          }
        }
      }

      const pVid = pipVideoElRef.current;
      if (pVid) {
        if (activePip && pVid.readyState >= 1) {
          if (pVid.paused && !activePip.clip.reversed) pVid.play().catch(() => {});
        } else if (!pVid.paused) {
          pVid.pause();
        }
      }

      onPlayheadChange(nextTime);
      syncAudioTracks(nextTime, true);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, totalDurationSec, v1Segments, activePip, onPlayheadChange, onTogglePlay, syncAudioTracks]);

  // Dragging text overlays or PiP on preview stage
  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = canvasBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const xPct = Math.max(6, Math.min(94, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(8, Math.min(92, ((e.clientY - rect.top) / rect.height) * 100));

    if (draggingTextId) {
      onMoveTextOverlay(draggingTextId, Number(xPct.toFixed(1)), Number(yPct.toFixed(1)));
    } else if (draggingPipId && onMovePipClip) {
      onMovePipClip(draggingPipId, Number(Math.min(82, Math.max(0, xPct - 14)).toFixed(1)), Number(Math.min(82, Math.max(0, yPct - 14)).toFixed(1)));
    }
  };

  const stopDragging = () => {
    setDraggingTextId(null);
    setDraggingPipId(null);
  };

  // Visual transition + zoom motion compute
  const dynamicVisual = useMemo(() => {
    if (!activeSegment) return { opacity: 1, extraScale: 1, translateX: 0 };
    const { clip, globalStart, globalEnd, clipDur } = activeSegment;
    const into = Math.max(0, playheadSec - globalStart);
    const outOf = Math.max(0, globalEnd - playheadSec);
    const progress = clipDur > 0 ? Math.min(1, into / clipDur) : 0;

    let opacity = 1;
    let extraScale = 1;
    let translateX = 0;

    if (clip.transition === 'fade' || clip.transition === 'crossfade') {
      if (into < 0.35) opacity = Math.max(0.15, into / 0.35);
      else if (outOf < 0.35) opacity = Math.max(0.15, outOf / 0.35);
    } else if (clip.transition === 'slide' && into < 0.4) {
      translateX = Math.round((1 - into / 0.4) * 32);
    } else if (clip.transition === 'zoom' && into < 0.4) {
      extraScale = 1 + (1 - into / 0.4) * 0.16;
    }

    if (clip.zoomEffect === 'slow_zoom_in') {
      extraScale *= 1 + progress * 0.18;
    } else if (clip.zoomEffect === 'slow_zoom_out') {
      extraScale *= 1.18 - progress * 0.18;
    } else if (clip.zoomEffect === 'pulse') {
      extraScale *= 1 + Math.abs(Math.sin(into * Math.PI * 1.5)) * 0.08;
    }

    return { opacity, extraScale, translateX };
  }, [activeSegment, playheadSec]);

  const visibleTextOverlays = useMemo(
    () => textOverlays.filter((ov) => playheadSec >= ov.startSec && playheadSec <= ov.endSec),
    [textOverlays, playheadSec]
  );

  const visibleEffects = useMemo(
    () => overlayEffects.filter((fx) => playheadSec >= fx.startSec && playheadSec <= fx.endSec),
    [overlayEffects, playheadSec]
  );

  const aspectClass =
    cropRatio === '9:16'
      ? 'aspect-[9/16] max-h-[340px] sm:max-h-[400px]'
      : cropRatio === '1:1'
      ? 'aspect-square max-h-[320px] sm:max-h-[380px]'
      : cropRatio === '4:5'
      ? 'aspect-[4/5] max-h-[330px] sm:max-h-[390px]'
      : 'aspect-video w-full max-w-2xl';

  const rot = activeClip?.rotation ?? projectRotation ?? 0;
  const scaleX = (activeClip?.flipH ? -1 : 1) * (activeClip?.zoom || 1) * dynamicVisual.extraScale * (rot === 90 || rot === 270 ? 1.12 : 1);
  const scaleY = (activeClip?.flipV ? -1 : 1) * (activeClip?.zoom || 1) * dynamicVisual.extraScale * (rot === 90 || rot === 270 ? 1.12 : 1);
  const glitchLevel = activeClip?.glitch || 0;

  return (
    <div
      ref={stageOuterRef}
      onDragOver={(e) => {
        if (!onDropFiles) return;
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (onDropFiles && e.dataTransfer.files?.length > 0) {
          onDropFiles(e.dataTransfer.files);
        }
      }}
      className={`rounded-2xl bg-stone-950 border overflow-hidden relative select-none ${
        isDragOver ? 'border-amber-500 ring-2 ring-amber-500/40' : 'border-stone-800'
      }`}
    >
      {/* Monitor Canvas Stage */}
      <div
        className="relative bg-stone-950 flex items-center justify-center p-2 sm:p-3 min-h-[210px] sm:min-h-[300px]"
        onPointerMove={handleStagePointerMove}
        onPointerUp={stopDragging}
        onPointerLeave={stopDragging}
      >
        <div
          ref={canvasBoxRef}
          className={`relative overflow-hidden rounded-xl flex items-center justify-center shadow-2xl border border-stone-800/80 ${aspectClass}`}
          style={{
            backgroundColor: activeClip?.bgColor || projectBgColor || '#0c0a09',
            opacity: dynamicVisual.opacity,
          }}
        >
          {/* Active Track V1 Visual */}
          {activeClip ? (
            activeClip.isFreezeFrame && activeClip.posterDataUrl ? (
              <img
                src={activeClip.posterDataUrl}
                alt={activeClip.name}
                className="w-full h-full object-contain pointer-events-none"
                style={{
                  filter: buildClipCssFilter(activeClip, previewFilterOverride),
                  transform: `translateX(${dynamicVisual.translateX}px) rotate(${rot}deg) scale(${scaleX}, ${scaleY})`,
                }}
              />
            ) : (
              <>
                <video
                  ref={videoElRef}
                  key={activeClip.id}
                  src={activeClipUrl}
                  playsInline
                  preload="auto"
                  className={`w-full h-full object-contain pointer-events-none ${
                    activeClip.chromaKeyEnabled ? 'opacity-0 absolute inset-0' : ''
                  }`}
                  style={{
                    filter: buildClipCssFilter(activeClip, previewFilterOverride),
                    transform: `translateX(${dynamicVisual.translateX}px) rotate(${rot}deg) scale(${scaleX}, ${scaleY})`,
                  }}
                />
                {activeClip.chromaKeyEnabled && (
                  <canvas
                    ref={chromaCanvasRef}
                    className="w-full h-full object-contain pointer-events-none"
                    style={{
                      filter: buildClipCssFilter(activeClip, previewFilterOverride),
                      transform: `translateX(${dynamicVisual.translateX}px) rotate(${rot}deg) scale(${scaleX}, ${scaleY})`,
                    }}
                  />
                )}
              </>
            )
          ) : (
            <div className="text-center p-6 text-stone-400 space-y-2 max-w-xs">
              <Film className="w-9 h-9 mx-auto text-stone-600" />
              <p className="text-xs font-semibold text-stone-300">
                Drop video or audio files here
              </p>
              <p className="text-[11px] text-stone-500">
                Or use Add Clip / Record Camera in the workspace to begin editing.
              </p>
            </div>
          )}

          {/* Subtle Glitch Chromatic Split Overlay */}
          {glitchLevel > 5 && activeClip && (
            <div
              className="absolute inset-0 pointer-events-none mix-blend-screen"
              style={{
                opacity: Math.min(0.45, glitchLevel / 180),
                background:
                  'repeating-linear-gradient(0deg, rgba(245,158,11,0.2) 0px, rgba(245,158,11,0.2) 2px, transparent 2px, transparent 6px)',
                transform: `translateX(${Math.round((Math.sin(playheadSec * 28) * glitchLevel) / 14)}px)`,
              }}
            />
          )}

          {/* Track V2 Picture-in-Picture / Overlay Clip */}
          {activePip && (
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                setDraggingPipId(activePip.clip.id);
              }}
              style={{
                left: `${activePip.clip.pipX ?? 64}%`,
                top: `${activePip.clip.pipY ?? 62}%`,
                width: `${Math.round((activePip.clip.pipScale ?? 0.32) * 100)}%`,
              }}
              className="absolute rounded-lg overflow-hidden border-2 border-amber-400/80 shadow-xl cursor-move z-10 bg-black/40"
              title="Drag to reposition Picture-in-Picture overlay"
            >
              <video
                ref={pipVideoElRef}
                key={activePip.clip.id}
                src={activePipUrl}
                playsInline
                preload="auto"
                className={`w-full aspect-video object-cover ${
                  activePip.clip.chromaKeyEnabled ? 'opacity-0 absolute inset-0' : ''
                }`}
                style={{
                  filter: buildClipCssFilter(activePip.clip),
                }}
              />
              {activePip.clip.chromaKeyEnabled && (
                <canvas
                  ref={pipCanvasRef}
                  className="w-full aspect-video object-cover"
                  style={{ filter: buildClipCssFilter(activePip.clip) }}
                />
              )}
            </div>
          )}

          {/* Animated Overlay Effects */}
          {visibleEffects.map((fx) => {
            if (fx.preset === 'warm_vignette') {
              return (
                <div
                  key={fx.id}
                  className="absolute inset-0 pointer-events-none z-15"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(0,0,0,0) 48%, rgba(28,15,5,0.72) 100%)',
                  }}
                />
              );
            }
            if (fx.preset === 'cinematic_bars') {
              return (
                <div key={fx.id} className="absolute inset-0 pointer-events-none z-15 flex flex-col justify-between">
                  <div className="h-[10%] bg-black" />
                  <div className="h-[10%] bg-black" />
                </div>
              );
            }
            if (fx.preset === 'golden_border' || fx.preset === 'chef_frame') {
              return (
                <div
                  key={fx.id}
                  className={`absolute inset-2 pointer-events-none z-15 rounded-lg border-2 ${
                    fx.preset === 'golden_border' ? 'border-amber-500/85' : 'border-white/75'
                  }`}
                />
              );
            }
            return null;
          })}

          {/* Draggable Timed Text, Animated Titles, Lower Thirds & Captions */}
          {visibleTextOverlays.map((ov) => {
            const elapsed = Math.max(0, playheadSec - ov.startSec);
            const isSel = selectedTextId === ov.id;
            const posStyle: React.CSSProperties =
              typeof ov.xPercent === 'number' && typeof ov.yPercent === 'number'
                ? {
                    left: `${ov.xPercent}%`,
                    top: `${ov.yPercent}%`,
                    transform: 'translate(-50%, -50%)',
                  }
                : ov.kind === 'lower_third'
                ? { left: '6%', bottom: '12%' }
                : ov.position === 'top'
                ? { left: '50%', top: '12%', transform: 'translateX(-50%)' }
                : ov.position === 'middle'
                ? { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
                : { left: '50%', bottom: '10%', transform: 'translateX(-50%)' };

            let animOpacity = 1;
            let animTransform = '';
            if (ov.animation === 'fade' && elapsed < 0.35) {
              animOpacity = elapsed / 0.35;
            } else if (ov.animation === 'slide_up' && elapsed < 0.35) {
              animOpacity = elapsed / 0.35;
              animTransform = `translateY(${Math.round((1 - elapsed / 0.35) * 14)}px)`;
            } else if (ov.animation === 'pop' && elapsed < 0.25) {
              const s = 0.7 + (elapsed / 0.25) * 0.35;
              animTransform = `scale(${s.toFixed(2)})`;
            }

            const renderedText =
              ov.animation === 'typewriter'
                ? ov.text.slice(0, Math.max(1, Math.ceil((Math.min(elapsed, 1.5) / 1.5) * ov.text.length)))
                : ov.text;

            const sizeClass =
              ov.fontSize === 'lg'
                ? 'text-base sm:text-xl px-3.5 py-1.5'
                : ov.fontSize === 'sm'
                ? 'text-[11px] sm:text-xs px-2.5 py-1'
                : 'text-xs sm:text-sm px-3 py-1';

            return (
              <div
                key={ov.id}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onSelectTextOverlay(ov.id);
                  setDraggingTextId(ov.id);
                }}
                style={{
                  ...posStyle,
                  fontFamily: ov.fontFamily || 'Plus Jakarta Sans',
                  color: ov.color || '#ffffff',
                  backgroundColor:
                    ov.bgColor || (ov.kind === 'lower_third' ? 'rgba(217, 119, 6, 0.9)' : 'rgba(12, 10, 9, 0.72)'),
                  opacity: animOpacity,
                }}
                className={`absolute z-20 max-w-[88%] rounded-xl font-bold shadow-lg cursor-grab active:cursor-grabbing transition-shadow ${sizeClass} ${
                  isSel ? 'ring-2 ring-amber-400' : ''
                }`}
                title="Drag to move text anywhere on video"
              >
                <div style={{ transform: animTransform }}>
                  <div>{renderedText}</div>
                  {ov.kind === 'lower_third' && ov.subtitle && (
                    <div className="text-[10px] font-medium text-stone-100/90 mt-0.5">
                      {ov.subtitle}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Fullscreen Stage Button */}
        <button
          type="button"
          onClick={() => {
            if (!stageOuterRef.current) return;
            if (!document.fullscreenElement) stageOuterRef.current.requestFullscreen?.().catch(() => {});
            else document.exitFullscreen?.().catch(() => {});
          }}
          className="absolute top-3 right-3 p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-white border border-stone-700 cursor-pointer z-25"
          title="Fullscreen preview"
          aria-label="Toggle fullscreen preview"
        >
          <Maximize className="w-4 h-4" />
        </button>

        {isDragOver && (
          <div className="absolute inset-0 bg-amber-600/20 backdrop-blur-xs flex items-center justify-center z-30 pointer-events-none">
            <div className="px-5 py-3 rounded-2xl bg-stone-950 text-white border border-amber-500 flex items-center gap-2 text-xs font-bold shadow-2xl">
              <Upload className="w-4 h-4 text-amber-400" />
              <span>Drop video or audio file onto timeline</span>
            </div>
          </div>
        )}
      </div>

      {/* Transport & Scrubber Bar */}
      <div className="px-3 sm:px-4 py-2.5 bg-stone-900 border-t border-stone-800 space-y-2">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-bold text-amber-400 tabular-nums w-14">
            {formatTimeClock(playheadSec)}
          </span>
          <input
            type="range"
            min="0"
            max={Math.max(0.5, totalDurationSec)}
            step="0.05"
            value={Math.min(playheadSec, Math.max(0.5, totalDurationSec))}
            onChange={(e) => {
              const sec = parseFloat(e.target.value);
              onPlayheadChange(sec);
              syncAudioTracks(sec, isPlaying);
            }}
            aria-label="Timeline playhead scrubber"
            className="flex-1 accent-amber-500 cursor-pointer h-2"
          />
          <span className="font-mono text-xs text-stone-400 tabular-nums w-14 text-right">
            {formatTimeClock(totalDurationSec)}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPlayheadChange(0)}
              className="p-2 min-h-[40px] min-w-[40px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center cursor-pointer"
              title="Rewind to start"
              aria-label="Rewind to start"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onPlayheadChange(Math.max(0, playheadSec - 1))}
              className="p-2 min-h-[40px] min-w-[40px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center cursor-pointer"
              title="Step back 1s (Left Arrow)"
              aria-label="Step back 1 second"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={totalDurationSec <= 0}
              onClick={() => onTogglePlay(!isPlaying)}
              className="px-4 py-2 min-h-[40px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 whitespace-nowrap"
              title="Play / Pause (Space)"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              type="button"
              onClick={() => onPlayheadChange(Math.min(totalDurationSec, playheadSec + 1))}
              className="p-2 min-h-[40px] min-w-[40px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center cursor-pointer"
              title="Step forward 1s (Right Arrow)"
              aria-label="Step forward 1 second"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!activeSegment || totalDurationSec <= 0}
              onClick={onSplitAtPlayhead}
              className="px-3 py-2 min-h-[40px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 whitespace-nowrap"
              title="Split the active clip at the red playhead line (S)"
            >
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              <span>Split Clip</span>
            </button>

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-800 text-stone-300 text-[11px]">
              {originalAudioMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span className="tabular-nums font-semibold">
                {originalAudioMuted ? 'Muted' : `${Math.round(originalAudioVolume * 100)}%`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
