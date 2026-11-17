import {
  TextOverlayItem,
  VideoClipItem,
  VideoFilterPreset,
  VideoStudioProject,
} from '../types';

export interface LocalStudioMediaEntry {
  blob?: Blob;
  url: string;
}

export interface SoundSegment {
  startSec: number;
  endSec: number;
  rmsDb: number;
}

export interface SceneSegment {
  startSec: number;
  endSec: number;
  motionScore: number; // 0..100
  isHighlight: boolean;
}

export interface AiSuggestionItem {
  title: string;
  detail: string;
  actionType:
    | 'enhance_color'
    | 'add_title'
    | 'add_music'
    | 'trim_silence'
    | 'switch_vertical';
}

export interface AiCoachResponse {
  recommendedTitleHook: string;
  recommendedFilter: VideoFilterPreset;
  brightnessBoost?: number;
  contrastBoost?: number;
  saturationBoost?: number;
  suggestedAspectRatio?: '16:9' | '9:16' | '1:1' | '4:5';
  suggestions: AiSuggestionItem[];
}

export interface StudioExportResult {
  url: string;
  filename: string;
  size: number;
  durationSec: number;
}

/**
 * Computes real RMS energy across windows of an audio/video file using Web Audio API
 * to find non-silent segments (used for 1-click Auto-Remove Silence).
 */
export async function analyzeAudioSilenceSegments(
  source: Blob | string,
  trimStartSec = 0,
  trimEndSec?: number,
  silenceThreshold = 0.018,
  minSilenceSec = 0.7
): Promise<SoundSegment[]> {
  let arrayBuffer: ArrayBuffer;
  if (typeof source === 'string') {
    const resp = await fetch(source);
    if (!resp.ok) throw new Error('Could not read clip audio stream.');
    arrayBuffer = await resp.arrayBuffer();
  } else {
    arrayBuffer = await source.arrayBuffer();
  }

  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    const sampleRate = decoded.sampleRate;
    const channelData = decoded.getChannelData(0);
    const totalDur = decoded.duration;
    const startSec = Math.max(0, trimStartSec);
    const endSec = Math.min(totalDur, trimEndSec && trimEndSec > startSec ? trimEndSec : totalDur);

    const windowSec = 0.1;
    const stepSamples = Math.max(1, Math.floor(sampleRate * windowSec));
    const startIdx = Math.floor(startSec * sampleRate);
    const endIdx = Math.min(channelData.length, Math.floor(endSec * sampleRate));

    interface WindowFlag {
      t0: number;
      t1: number;
      audible: boolean;
      rms: number;
    }

    const windows: WindowFlag[] = [];
    for (let i = startIdx; i < endIdx; i += stepSamples) {
      const sliceEnd = Math.min(endIdx, i + stepSamples);
      let sumSq = 0;
      for (let j = i; j < sliceEnd; j++) {
        const s = channelData[j];
        sumSq += s * s;
      }
      const rms = Math.sqrt(sumSq / Math.max(1, sliceEnd - i));
      windows.push({
        t0: i / sampleRate,
        t1: sliceEnd / sampleRate,
        audible: rms >= silenceThreshold,
        rms,
      });
    }

    // Bridge tiny pauses shorter than minSilenceSec inside speech
    const minSilentWindows = Math.max(1, Math.round(minSilenceSec / windowSec));
    let silentRun = 0;
    for (let w = 0; w < windows.length; w++) {
      if (!windows[w].audible) {
        silentRun++;
      } else {
        if (silentRun > 0 && silentRun < minSilentWindows) {
          for (let b = w - silentRun; b < w; b++) {
            if (b >= 0) windows[b].audible = true;
          }
        }
        silentRun = 0;
      }
    }

    const segments: SoundSegment[] = [];
    let activeStart: number | null = null;
    let rmsAccum = 0;
    let rmsCount = 0;

    for (const w of windows) {
      if (w.audible) {
        if (activeStart === null) {
          activeStart = Math.max(startSec, w.t0 - 0.08);
          rmsAccum = w.rms;
          rmsCount = 1;
        } else {
          rmsAccum += w.rms;
          rmsCount++;
        }
      } else if (activeStart !== null) {
        const segEnd = Math.min(endSec, w.t0 + 0.08);
        if (segEnd - activeStart >= 0.35) {
          const avgRms = rmsAccum / Math.max(1, rmsCount);
          segments.push({
            startSec: Number(activeStart.toFixed(2)),
            endSec: Number(segEnd.toFixed(2)),
            rmsDb: Math.round(20 * Math.log10(Math.max(0.0001, avgRms))),
          });
        }
        activeStart = null;
      }
    }

    if (activeStart !== null) {
      const segEnd = endSec;
      if (segEnd - activeStart >= 0.35) {
        const avgRms = rmsAccum / Math.max(1, rmsCount);
        segments.push({
          startSec: Number(activeStart.toFixed(2)),
          endSec: Number(segEnd.toFixed(2)),
          rmsDb: Math.round(20 * Math.log10(Math.max(0.0001, avgRms))),
        });
      }
    }

    return segments;
  } finally {
    ctx.close().catch(() => {});
  }
}

/**
 * Samples real video frames using an offscreen <canvas> to detect visual scene cuts
 * and score each scene's visual motion/highlight intensity.
 */
export async function detectVideoScenesAndHighlights(
  videoUrl: string,
  trimStartSec = 0,
  trimEndSec?: number
): Promise<SceneSegment[]> {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';
  video.src = videoUrl;

  await new Promise<void>((resolve, reject) => {
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error('Could not decode video frames for scene analysis.'));
    };
    const cleanup = () => {
      video.removeEventListener('loadeddata', onLoaded);
      video.removeEventListener('error', onErr);
    };
    video.addEventListener('loadeddata', onLoaded);
    video.addEventListener('error', onErr);
    video.load();
  });

  const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 10;
  const start = Math.max(0, trimStartSec);
  const end = Math.min(dur, trimEndSec && trimEndSec > start ? trimEndSec : dur);
  const span = Math.max(0.5, end - start);

  const sampleStep = Math.max(0.45, span / 22);
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 36;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [{ startSec: start, endSec: end, motionScore: 50, isHighlight: true }];

  let prevPixels: Uint8ClampedArray | null = null;
  const diffs: Array<{ t: number; diff: number }> = [];

  for (let t = start; t < end; t += sampleStep) {
    video.currentTime = Math.min(end - 0.05, t);
    await new Promise<void>((resolve) => {
      const done = () => {
        video.removeEventListener('seeked', done);
        resolve();
      };
      video.addEventListener('seeked', done);
      setTimeout(done, 250);
    });

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    if (prevPixels) {
      let delta = 0;
      for (let i = 0; i < data.length; i += 4) {
        delta +=
          Math.abs(data[i] - prevPixels[i]) +
          Math.abs(data[i + 1] - prevPixels[i + 1]) +
          Math.abs(data[i + 2] - prevPixels[i + 2]);
      }
      const norm = delta / ((canvas.width * canvas.height) * 3 * 255);
      diffs.push({ t, diff: norm });
    }
    prevPixels = new Uint8ClampedArray(data);
  }

  // Scene cut threshold based on adaptive median + spread
  const sorted = [...diffs].map((d) => d.diff).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0.05;
  const cutThreshold = Math.max(0.11, median * 2.1);

  const cutTimes: number[] = [start];
  for (const d of diffs) {
    if (d.diff >= cutThreshold && d.t - cutTimes[cutTimes.length - 1] >= 1.2 && end - d.t >= 0.8) {
      cutTimes.push(Number(d.t.toFixed(2)));
    }
  }
  cutTimes.push(Number(end.toFixed(2)));

  const scenes: SceneSegment[] = [];
  for (let i = 0; i < cutTimes.length - 1; i++) {
    const s0 = cutTimes[i];
    const s1 = cutTimes[i + 1];
    const segDiffs = diffs.filter((d) => d.t >= s0 && d.t <= s1);
    const avgMotion =
      segDiffs.length > 0
        ? segDiffs.reduce((acc, d) => acc + d.diff, 0) / segDiffs.length
        : 0.05;
    const score = Math.min(100, Math.round(avgMotion * 520));
    scenes.push({
      startSec: s0,
      endSec: s1,
      motionScore: score,
      isHighlight: false,
    });
  }

  // Mark top motion scenes as highlights
  const maxScore = Math.max(...scenes.map((s) => s.motionScore), 1);
  scenes.forEach((s) => {
    s.isHighlight = s.motionScore >= Math.max(30, maxScore * 0.68);
  });

  return scenes;
}

/**
 * Samples frame brightness/contrast locally and computes balanced color enhancement values.
 */
export async function computeAutoColorEnhancement(
  videoUrl: string,
  atSec = 0.5
): Promise<{
  filterPreset: VideoFilterPreset;
  brightness: number;
  contrast: number;
  saturation: number;
}> {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';
  video.src = videoUrl;

  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error('Could not load video for color analysis.'));
    video.load();
  });

  video.currentTime = Math.min(Math.max(0, atSec), Math.max(0.2, (video.duration || 2) - 0.1));
  await new Promise<void>((resolve) => {
    video.onseeked = () => resolve();
    setTimeout(resolve, 250);
  });

  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 54;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { filterPreset: 'warm_kitchen', brightness: 6, contrast: 12, saturation: 14 };
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  let lumaSum = 0;
  let lumaSqSum = 0;
  let satSum = 0;
  const count = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    lumaSum += luma;
    lumaSqSum += luma * luma;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    satSum += mx === 0 ? 0 : (mx - mn) / mx;
  }

  const avgLuma = lumaSum / count;
  const stdLuma = Math.sqrt(Math.max(0, lumaSqSum / count - avgLuma * avgLuma));
  const avgSat = satSum / count;

  const brightness = avgLuma < 105 ? Math.min(24, Math.round((118 - avgLuma) * 0.4)) : avgLuma > 175 ? -10 : 4;
  const contrast = stdLuma < 45 ? 16 : 8;
  const saturation = avgSat < 0.28 ? 18 : 10;

  return {
    filterPreset: avgLuma < 120 ? 'golden_hour' : 'crisp_studio',
    brightness,
    contrast,
    saturation,
  };
}

/**
 * Captures keyframes as compact base64 JPEG data URLs for multimodal Gemini editing analysis.
 */
export async function captureKeyframesBase64(
  videoUrl: string,
  count = 3
): Promise<string[]> {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';
  video.src = videoUrl;

  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error('Could not read video frames.'));
    video.load();
  });

  const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 5;
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 270;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const frames: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = Math.min(Math.max(0.1, dur - 0.1), ((i + 0.5) / count) * dur);
    video.currentTime = t;
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      setTimeout(resolve, 300);
    });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    frames.push(canvas.toDataURL('image/jpeg', 0.7));
  }
  return frames;
}

/**
 * Calls server-side Gemini AI Transcription + Caption Cue Generation.
 */
export async function generateAiCaptionsForMedia(
  media: Blob,
  durationSec: number
): Promise<{ transcript: string; overlays: TextOverlayItem[] }> {
  const form = new FormData();
  form.append('media', media, 'clip_audio_source.mp4');
  form.append('durationSec', String(Math.max(1, durationSec)));

  const resp = await fetch('/api/studio/ai/transcribe-captions', {
    method: 'POST',
    body: form,
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data?.error || 'Could not generate AI automatic captions.');
  }

  const cues: Array<{ startSec: number; endSec: number; text: string }> = Array.isArray(data.captions)
    ? data.captions
    : [];

  const overlays: TextOverlayItem[] = cues.map((cue, idx) => ({
    id: `aicap_${Date.now().toString(36)}_${idx}`,
    kind: 'caption',
    text: String(cue.text || '').trim(),
    startSec: Math.max(0, Number(cue.startSec) || 0),
    endSec: Math.max((Number(cue.startSec) || 0) + 0.8, Number(cue.endSec) || 2),
    position: 'bottom',
    color: '#ffffff',
    bgColor: '#0c0a09',
    fontSize: 'md',
    fontFamily: 'Plus Jakarta Sans',
    animation: 'fade',
    isAutoCaption: true,
  }));

  return {
    transcript: data.transcript || '',
    overlays: overlays.filter((o) => o.text.length > 0),
  };
}

/**
 * Calls server-side Gemini AI Editing Coach for frame-aware editing tips & one-click presets.
 */
export async function fetchAiEditingSuggestions(payload: {
  title: string;
  category: string;
  durationSec: number;
  clipCount: number;
  hasAudio: boolean;
  frames: string[];
}): Promise<AiCoachResponse> {
  const resp = await fetch('/api/studio/ai/suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data?.error || 'Could not retrieve AI editing suggestions.');
  }
  return data as AiCoachResponse;
}

/**
 * Helper: renders a single video frame at `atSec` to a PNG Blob for freeze frames or thumbnails.
 */
export async function captureFrameAsPngBlob(
  videoUrl: string,
  atSec: number
): Promise<{ blob: Blob; dataUrl: string }> {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';
  video.src = videoUrl;

  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error('Could not load video frame.'));
    video.load();
  });

  video.currentTime = Math.max(0, Math.min(atSec, Math.max(0.1, (video.duration || 1) - 0.05)));
  await new Promise<void>((resolve) => {
    video.onseeked = () => resolve();
    setTimeout(resolve, 350);
  });

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to encode frame PNG.'))),
      'image/png'
    );
  });

  return { blob, dataUrl };
}

/**
 * Uploads the full Studio project + local Blobs to FFmpeg server exporter and polls progress to completion.
 */
export async function exportStudioProject(
  project: VideoStudioProject,
  mediaRegistry: Record<string, LocalStudioMediaEntry>,
  onProgress: (pct: number, stage: string) => void
): Promise<StudioExportResult> {
  onProgress(5, 'Bundling video clips, audio tracks & timeline edits...');

  const form = new FormData();
  const compactSpec = {
    id: project.id,
    title: project.title,
    cropRatio: project.cropRatio,
    rotation: project.rotation,
    bgColor: project.bgColor || '#0c0a09',
    originalAudioVolume: project.originalAudioVolume,
    originalAudioMuted: project.originalAudioMuted,
    clips: project.clips.map((c: VideoClipItem) => ({
      ...c,
      posterDataUrl: undefined, // sent separately if freeze frame
    })),
    audioTracks: project.audioTracks,
    textOverlays: project.textOverlays,
    overlayEffects: project.overlayEffects || [],
    exportSettings: project.exportSettings || {
      resolution: '1080p',
      aspectRatio: project.cropRatio || '16:9',
      customWidth: 1920,
      customHeight: 1080,
      quality: 'high',
      replaceOriginal: false,
    },
  };

  form.append('spec', JSON.stringify(compactSpec));

  // Attach local Blobs for clips & freeze frame posters
  for (const clip of project.clips) {
    if (clip.isFreezeFrame && clip.posterDataUrl) {
      const posterResp = await fetch(clip.posterDataUrl);
      const posterBlob = await posterResp.blob();
      form.append(`poster_${clip.id}`, posterBlob, `${clip.id}.png`);
      continue;
    }

    const entry = mediaRegistry[clip.id];
    if (entry?.blob) {
      const ext = entry.blob.type.includes('webm')
        ? '.webm'
        : entry.blob.type.includes('quicktime')
        ? '.mov'
        : '.mp4';
      form.append(`file_${clip.id}`, entry.blob, `${clip.id}${ext}`);
    } else if (entry?.url && entry.url.startsWith('blob:')) {
      const blobResp = await fetch(entry.url);
      const fetchedBlob = await blobResp.blob();
      form.append(`file_${clip.id}`, fetchedBlob, `${clip.id}.mp4`);
    }
  }

  // Attach local Blobs for audio tracks
  for (const track of project.audioTracks) {
    if (track.muted) continue;
    const entry = mediaRegistry[track.id];
    if (entry?.blob) {
      const ext = entry.blob.type.includes('wav')
        ? '.wav'
        : entry.blob.type.includes('mp3') || entry.blob.type.includes('mpeg')
        ? '.mp3'
        : '.webm';
      form.append(`file_${track.id}`, entry.blob, `${track.id}${ext}`);
    } else if (entry?.url && entry.url.startsWith('blob:')) {
      const blobResp = await fetch(entry.url);
      const fetchedBlob = await blobResp.blob();
      form.append(`file_${track.id}`, fetchedBlob, `${track.id}.webm`);
    }
  }

  onProgress(10, 'Uploading media to DellyChow render engine...');

  const startResp = await fetch('/api/studio/export', {
    method: 'POST',
    body: form,
  });
  const startData = await startResp.json().catch(() => ({}));
  if (!startResp.ok || !startData.jobId) {
    throw new Error(startData?.error || 'Could not start server video export.');
  }

  const jobId: string = startData.jobId;

  // Poll job status until completed or failed
  while (true) {
    await new Promise((r) => setTimeout(r, 700));
    const statusResp = await fetch(`/api/studio/export-status/${encodeURIComponent(jobId)}`);
    const statusData = await statusResp.json().catch(() => ({}));

    if (!statusResp.ok) {
      throw new Error(statusData?.error || 'Lost connection to render status tracker.');
    }

    onProgress(
      typeof statusData.progress === 'number' ? statusData.progress : 25,
      statusData.stage || 'Rendering video...'
    );

    if (statusData.status === 'completed' && statusData.url) {
      return {
        url: statusData.url,
        filename: statusData.filename || `${project.id}.mp4`,
        size: Number(statusData.size) || 0,
        durationSec: Number(statusData.durationSec) || 0,
      };
    }

    if (statusData.status === 'failed') {
      throw new Error(statusData.error || 'Video render failed on server.');
    }
  }
}
