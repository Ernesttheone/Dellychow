import express, { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_ROOT = path.join(os.tmpdir(), 'dellychow-studio');
const UPLOADS_DIR = path.resolve(__dirname, 'public/uploads/videos');

if (!fs.existsSync(TEMP_ROOT)) {
  fs.mkdirSync(TEMP_ROOT, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

interface RenderJobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: string;
  url?: string;
  filename?: string;
  size?: number;
  durationSec?: number;
  error?: string;
  createdAt: number;
}

const renderJobs = new Map<string, RenderJobStatus>();

// Periodic cleanup of old jobs & temp folders (> 30 mins)
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, job] of renderJobs.entries()) {
    if (job.createdAt < cutoff) {
      renderJobs.delete(id);
    }
  }
}, 5 * 60 * 1000).unref();

const uploadStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const reqAny = req as any;
    if (!reqAny._studioJobDir) {
      const folderId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      reqAny._studioJobId = folderId;
      reqAny._studioJobDir = path.join(TEMP_ROOT, folderId);
      fs.mkdirSync(reqAny._studioJobDir, { recursive: true });
    }
    cb(null, reqAny._studioJobDir);
  },
  filename: (_req, file, cb) => {
    const safeName = file.fieldname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const ext = path.extname(file.originalname || '') || '.bin';
    cb(null, `${safeName}_${Date.now()}${ext}`);
  },
});

const uploadMiddleware = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 300 * 1024 * 1024, // 300MB per file
    files: 40,
  },
});

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getFontPath(fontFamily?: string): string {
  const fam = (fontFamily || '').toLowerCase();
  if (fam.includes('playfair') || fam.includes('georgia')) {
    const serif = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf';
    if (fs.existsSync(serif)) return serif;
  }
  if (fam.includes('courier') || fam.includes('mono')) {
    const mono = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf';
    if (fs.existsSync(mono)) return mono;
  }
  const sans = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
  return fs.existsSync(sans) ? sans : '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
}

function escapeDrawtext(text: string): string {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, '\u2019')
    .replace(/%/g, '\\%')
    .replace(/\r?\n/g, ' ');
}

function normalizeHexColor(hex?: string, fallback = '0c0a09'): string {
  const cleaned = String(hex || '').replace('#', '').trim();
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) return cleaned;
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    return cleaned.split('').map((c) => c + c).join('');
  }
  return fallback;
}

function buildAtempoChain(speed: number): string {
  let s = Math.max(0.25, Math.min(4.0, speed || 1));
  const parts: string[] = [];
  while (s < 0.5) {
    parts.push('atempo=0.5');
    s /= 0.5;
  }
  while (s > 2.0) {
    parts.push('atempo=2.0');
    s /= 2.0;
  }
  parts.push(`atempo=${s.toFixed(3)}`);
  return parts.join(',');
}

async function probeMediaStreams(filePath: string): Promise<{ hasVideo: boolean; hasAudio: boolean; duration: number }> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'stream=codec_type:format=duration',
      '-of',
      'json',
      filePath,
    ]);
    const parsed = JSON.parse(stdout || '{}');
    const streams = Array.isArray(parsed.streams) ? parsed.streams : [];
    const hasVideo = streams.some((s: any) => s.codec_type === 'video');
    const hasAudio = streams.some((s: any) => s.codec_type === 'audio');
    const duration = Number(parsed.format?.duration || 0) || 0;
    return { hasVideo, hasAudio, duration };
  } catch {
    return { hasVideo: true, hasAudio: false, duration: 0 };
  }
}

async function resolveInputFile(
  itemId: string,
  serverUrl: string | undefined,
  filesByField: Map<string, Express.Multer.File>,
  jobDir: string
): Promise<string | null> {
  const directFile = filesByField.get(`file_${itemId}`);
  if (directFile && fs.existsSync(directFile.path)) {
    return directFile.path;
  }
  if (!serverUrl) return null;

  // Local /api/videos/stream/:filename or /uploads/videos/:filename
  if (serverUrl.startsWith('/api/videos/stream/') || serverUrl.startsWith('/uploads/videos/') || serverUrl.startsWith('/public/uploads/videos/')) {
    const base = path.basename(serverUrl.split('?')[0]);
    const candidates = [
      path.join(UPLOADS_DIR, base),
      path.resolve(__dirname, 'dist/uploads/videos', base),
      path.resolve(__dirname, 'uploads/videos', base),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }

  // Remote HTTP/HTTPS URL (e.g., Firebase Storage download URL)
  if (serverUrl.startsWith('http://') || serverUrl.startsWith('https://')) {
    try {
      const response = await fetch(serverUrl);
      if (!response.ok) return null;
      const arrBuf = await response.arrayBuffer();
      const target = path.join(jobDir, `remote_${itemId.replace(/[^a-zA-Z0-9_-]/g, '')}.mp4`);
      fs.writeFileSync(target, Buffer.from(arrBuf));
      return target;
    } catch {
      return null;
    }
  }

  return null;
}

function computeTargetDimensions(exportSettings: any, projectCropRatio: string): { outW: number; outH: number } {
  const res = exportSettings?.resolution || '1080p';
  const ratio = exportSettings?.aspectRatio || projectCropRatio || '16:9';

  if (res === 'custom') {
    const w = Math.max(320, Math.min(3840, Number(exportSettings?.customWidth) || 1920));
    const h = Math.max(320, Math.min(3840, Number(exportSettings?.customHeight) || 1080));
    return {
      outW: Math.round(w / 2) * 2,
      outH: Math.round(h / 2) * 2,
    };
  }

  const baseShort = res === '4k' ? 2160 : res === '720p' ? 720 : 1080;
  let w = 1920;
  let h = 1080;

  if (ratio === '9:16') {
    w = baseShort;
    h = Math.round((baseShort * 16) / 9);
  } else if (ratio === '1:1') {
    w = baseShort;
    h = baseShort;
  } else if (ratio === '4:5') {
    w = baseShort;
    h = Math.round((baseShort * 5) / 4);
  } else {
    // 16:9 or original defaults to 16:9 bounding canvas
    h = baseShort;
    w = Math.round((baseShort * 16) / 9);
  }

  return {
    outW: Math.round(w / 2) * 2,
    outH: Math.round(h / 2) * 2,
  };
}

function buildClipFilterChain(
  clip: any,
  inputIdx: number,
  outW: number,
  outH: number,
  projectRotation: number,
  projectBgColor: string,
  clipDurationOut: number,
  isPip: boolean
): string[] {
  const filters: string[] = [];
  const trimStart = Math.max(0, Number(clip.trimStartSec) || 0);
  const trimEnd = Math.max(trimStart + 0.2, Number(clip.trimEndSec) || Number(clip.durationSec) || 5);
  const speed = Math.max(0.25, Math.min(3.0, Number(clip.speed) || 1));

  if (!clip.isFreezeFrame) {
    filters.push(`trim=start=${trimStart.toFixed(3)}:end=${trimEnd.toFixed(3)}`);
    filters.push('setpts=PTS-STARTPTS');
    if (clip.reversed) {
      filters.push('reverse');
    }
    if (Math.abs(speed - 1) > 0.01) {
      filters.push(`setpts=PTS/${speed.toFixed(3)}`);
    }
  } else {
    filters.push(`trim=duration=${clipDurationOut.toFixed(3)}`);
    filters.push('setpts=PTS-STARTPTS');
  }

  // Rotation & Flip
  const totalRot = ((Number(clip.rotation ?? projectRotation) || 0) % 360 + 360) % 360;
  if (totalRot === 90) filters.push('transpose=1');
  else if (totalRot === 180) filters.push('hflip,vflip');
  else if (totalRot === 270) filters.push('transpose=2');

  if (clip.flipH) filters.push('hflip');
  if (clip.flipV) filters.push('vflip');

  // Color grading & preset filters
  const rawBright = Number(clip.brightness || 0) + Number(clip.exposure || 0) * 0.65;
  const rawContrast = Number(clip.contrast || 0);
  const rawSat = Number(clip.saturation || 0);

  let bright = Math.max(-0.6, Math.min(0.6, rawBright / 160));
  let contrast = Math.max(0.3, Math.min(2.2, 1 + rawContrast / 100));
  let sat = Math.max(0, Math.min(2.5, 1 + rawSat / 100));

  switch (clip.filterPreset) {
    case 'warm_kitchen':
      sat = Math.min(2.5, sat * 1.18);
      contrast = Math.min(2.2, contrast * 1.06);
      filters.push('colorbalance=rs=0.08:gs=0.02:bs=-0.07');
      break;
    case 'crisp_studio':
      contrast = Math.min(2.2, contrast * 1.15);
      sat = Math.min(2.5, sat * 1.08);
      break;
    case 'vintage_film':
      sat = Math.max(0.4, sat * 0.78);
      contrast = Math.min(2.2, contrast * 1.1);
      filters.push('colorbalance=rs=0.10:gs=0.04:bs=-0.10');
      break;
    case 'high_contrast':
      contrast = Math.min(2.2, contrast * 1.32);
      sat = Math.min(2.5, sat * 1.12);
      break;
    case 'noir_bw':
      sat = 0;
      contrast = Math.min(2.2, contrast * 1.25);
      break;
    case 'golden_hour':
      sat = Math.min(2.5, sat * 1.24);
      bright = Math.min(0.6, bright + 0.04);
      filters.push('colorbalance=rs=0.12:gs=0.06:bs=-0.11');
      break;
    case 'cool_fresh':
      sat = Math.min(2.5, sat * 1.05);
      filters.push('colorbalance=rs=-0.06:gs=0.02:bs=0.10');
      break;
  }

  if (Math.abs(bright) > 0.005 || Math.abs(contrast - 1) > 0.01 || Math.abs(sat - 1) > 0.01) {
    filters.push(`eq=brightness=${bright.toFixed(3)}:contrast=${contrast.toFixed(3)}:saturation=${sat.toFixed(3)}`);
  }

  // Blur
  const blurAmt = Number(clip.blur || 0);
  if (blurAmt > 0.5) {
    const r = Math.min(18, Math.max(1, Math.round(blurAmt)));
    filters.push(`boxblur=${r}:1`);
  }

  // Glitch subtle RGB shift
  const glitchAmt = Number(clip.glitch || 0);
  if (glitchAmt > 5) {
    const shift = Math.max(2, Math.round(glitchAmt / 10));
    filters.push(`rgbashift=rh=${shift}:bh=-${shift}`);
  }

  // Zoom / crop scale
  const targetW = isPip ? Math.max(120, Math.round((outW * (Number(clip.pipScale) || 0.32)) / 2) * 2) : outW;
  const targetH = isPip ? Math.max(90, Math.round((targetW * 9) / 16 / 2) * 2) : outH;
  const bgHex = normalizeHexColor(clip.bgColor || projectBgColor, '0c0a09');

  const zoom = Math.max(1, Math.min(2.5, Number(clip.zoom || 1)));
  if (!isPip && zoom > 1.02) {
    filters.push(`scale=iw*${zoom.toFixed(2)}:ih*${zoom.toFixed(2)}`);
    filters.push(`crop=iw/${zoom.toFixed(2)}:ih/${zoom.toFixed(2)}:(iw-iw/${zoom.toFixed(2)})/2:(ih-ih/${zoom.toFixed(2)})/2`);
  }

  if (!isPip) {
    filters.push(
      `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease`,
      `pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:color=0x${bgHex}`
    );
  } else {
    filters.push(`scale=${targetW}:-2`);
  }

  // Chroma key (green/blue screen)
  if (clip.chromaKeyEnabled) {
    const keyHex = normalizeHexColor(clip.chromaKeyColor, '00ff00');
    const sim = Math.max(0.05, Math.min(0.55, Number(clip.chromaKeySimilarity) || 0.22));
    filters.push(`format=rgba,chromakey=0x${keyHex}:${sim.toFixed(2)}:0.1`);
  }

  // Transition fade-in/out on Track 0
  if (!isPip && (clip.transition === 'fade' || clip.transition === 'crossfade')) {
    const fadeDur = Math.min(0.4, clipDurationOut / 3);
    if (fadeDur >= 0.1) {
      filters.push(`fade=t=in:st=0:d=${fadeDur.toFixed(2)}`);
      if (clipDurationOut > fadeDur * 2.2) {
        filters.push(`fade=t=out:st=${(clipDurationOut - fadeDur).toFixed(2)}:d=${fadeDur.toFixed(2)}`);
      }
    }
  }

  if (!isPip) {
    filters.push('setsar=1', 'fps=30', 'format=yuv420p');
  } else {
    filters.push('setsar=1', 'fps=30', clip.chromaKeyEnabled ? 'format=rgba' : 'format=yuva420p');
  }

  return [`[${inputIdx}:v]${filters.join(',')}`];
}

export function createStudioRouter(): Router {
  const router = Router();

  // Check export job status
  router.get('/api/studio/export-status/:jobId', (req, res) => {
    const job = renderJobs.get(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Render job not found or expired.' });
    }
    return res.json(job);
  });

  // Advanced Multi-Track Studio FFmpeg Export Endpoint
  router.post('/api/studio/export', uploadMiddleware.any(), async (req, res) => {
    const reqAny = req as any;
    const jobDir: string = reqAny._studioJobDir || path.join(TEMP_ROOT, `job_${Date.now()}`);
    if (!fs.existsSync(jobDir)) fs.mkdirSync(jobDir, { recursive: true });

    const jobId = reqAny._studioJobId || `job_${Date.now()}`;

    try {
      const rawSpec = req.body?.spec;
      if (!rawSpec) {
        return res.status(400).json({ error: 'Missing studio project specification.' });
      }
      const spec = typeof rawSpec === 'string' ? JSON.parse(rawSpec) : rawSpec;
      const clips: any[] = Array.isArray(spec.clips) ? spec.clips : [];
      const audioTracks: any[] = Array.isArray(spec.audioTracks) ? spec.audioTracks : [];
      const textOverlays: any[] = Array.isArray(spec.textOverlays) ? spec.textOverlays : [];
      const overlayEffects: any[] = Array.isArray(spec.overlayEffects) ? spec.overlayEffects : [];
      const exportSettings = spec.exportSettings || {};

      if (clips.length === 0) {
        return res.status(400).json({ error: 'Add at least one video clip to export.' });
      }

      const files = (req.files as Express.Multer.File[]) || [];
      const filesByField = new Map<string, Express.Multer.File>();
      for (const f of files) {
        filesByField.set(f.fieldname, f);
      }

      const job: RenderJobStatus = {
        jobId,
        status: 'processing',
        progress: 5,
        stage: 'Preparing media clips & audio tracks...',
        createdAt: Date.now(),
      };
      renderJobs.set(jobId, job);

      // Respond immediately with jobId so long renders don't timeout HTTP request
      res.status(202).json({ jobId, status: 'processing' });

      // Execute FFmpeg render asynchronously
      (async () => {
        try {
          const { outW, outH } = computeTargetDimensions(exportSettings, spec.cropRatio || '16:9');
          const projectRotation = Number(spec.rotation || 0);
          const projectBgColor = spec.bgColor || '#0c0a09';
          const origAudioVol = Number(spec.originalAudioVolume ?? 1);
          const origAudioMuted = Boolean(spec.originalAudioMuted);

          const track0Clips = clips.filter((c) => (c.trackIndex ?? 0) === 0);
          const track1Clips = clips.filter((c) => c.trackIndex === 1);

          if (track0Clips.length === 0) {
            throw new Error('At least one clip is required on Main Video Track V1.');
          }

          const ffmpegInputs: string[] = [];
          const inputMeta: Array<{
            kind: 'clip' | 'audio';
            item: any;
            inputIndex: number;
            hasAudio: boolean;
            outDurationSec: number;
            globalStartSec: number;
            isPip: boolean;
          }> = [];

          let globalCursor = 0;

          // Resolve Track 0 clips
          for (const clip of track0Clips) {
            const speed = Math.max(0.25, Math.min(3.0, Number(clip.speed) || 1));
            const trimS = Math.max(0, Number(clip.trimStartSec) || 0);
            const trimE = Math.max(trimS + 0.2, Number(clip.trimEndSec) || Number(clip.durationSec) || 5);
            const outDur = Math.max(0.2, (trimE - trimS) / speed);

            let inputPath: string | null = null;
            if (clip.isFreezeFrame) {
              const posterFile = filesByField.get(`poster_${clip.id}`);
              if (posterFile && fs.existsSync(posterFile.path)) {
                inputPath = posterFile.path;
              } else {
                const baseVideo = await resolveInputFile(clip.id, clip.serverUrl, filesByField, jobDir);
                if (baseVideo) {
                  const framePng = path.join(jobDir, `freeze_${clip.id}.png`);
                  await execFileAsync('ffmpeg', [
                    '-y',
                    '-ss',
                    String(Number(clip.freezeSourceTimeSec || trimS).toFixed(2)),
                    '-i',
                    baseVideo,
                    '-frames:v',
                    '1',
                    framePng,
                  ]);
                  inputPath = framePng;
                }
              }
              if (!inputPath) {
                throw new Error(`Could not locate freeze-frame image for "${clip.name}".`);
              }
              const idx = ffmpegInputs.length / (clip.isFreezeFrame ? 1 : 1);
              void idx;
              const inputIdx = inputMeta.length;
              ffmpegInputs.push('-loop', '1', '-t', outDur.toFixed(3), '-i', inputPath);
              inputMeta.push({
                kind: 'clip',
                item: clip,
                inputIndex: inputIdx,
                hasAudio: false,
                outDurationSec: outDur,
                globalStartSec: globalCursor,
                isPip: false,
              });
            } else {
              inputPath = await resolveInputFile(clip.id, clip.serverUrl, filesByField, jobDir);
              if (!inputPath) {
                throw new Error(`Video source missing for clip "${clip.name}". Please re-attach the clip before exporting.`);
              }
              const probed = await probeMediaStreams(inputPath);
              const inputIdx = inputMeta.length;
              ffmpegInputs.push('-i', inputPath);
              inputMeta.push({
                kind: 'clip',
                item: clip,
                inputIndex: inputIdx,
                hasAudio: probed.hasAudio,
                outDurationSec: outDur,
                globalStartSec: globalCursor,
                isPip: false,
              });
            }
            globalCursor += outDur;
          }

          const totalVideoDurationSec = Math.max(0.5, globalCursor);

          // Resolve Track 1 (PiP) clips
          for (const clip of track1Clips) {
            const speed = Math.max(0.25, Math.min(3.0, Number(clip.speed) || 1));
            const trimS = Math.max(0, Number(clip.trimStartSec) || 0);
            const trimE = Math.max(trimS + 0.2, Number(clip.trimEndSec) || Number(clip.durationSec) || 5);
            const outDur = Math.max(0.2, (trimE - trimS) / speed);
            const inputPath = await resolveInputFile(clip.id, clip.serverUrl, filesByField, jobDir);
            if (!inputPath) continue;
            const probed = await probeMediaStreams(inputPath);
            const inputIdx = inputMeta.length;
            ffmpegInputs.push('-i', inputPath);
            inputMeta.push({
              kind: 'clip',
              item: clip,
              inputIndex: inputIdx,
              hasAudio: probed.hasAudio,
              outDurationSec: outDur,
              globalStartSec: Math.max(0, Number(clip.startOffsetSec) || 0),
              isPip: true,
            });
          }

          // Resolve Audio Tracks
          for (const track of audioTracks) {
            if (track.muted) continue;
            const inputPath = await resolveInputFile(track.id, track.serverUrl, filesByField, jobDir);
            if (!inputPath) continue;
            const probed = await probeMediaStreams(inputPath);
            if (!probed.hasAudio) continue;
            const trimS = Math.max(0, Number(track.trimStartSec) || 0);
            const trimE = Math.max(trimS + 0.1, Number(track.trimEndSec) || Number(track.durationSec) || 5);
            const inputIdx = inputMeta.length;
            ffmpegInputs.push('-i', inputPath);
            inputMeta.push({
              kind: 'audio',
              item: track,
              inputIndex: inputIdx,
              hasAudio: true,
              outDurationSec: trimE - trimS,
              globalStartSec: Math.max(0, Number(track.startOffsetSec) || 0),
              isPip: false,
            });
          }

          // Build filter_complex
          const filterParts: string[] = [];
          const track0Labels: string[] = [];

          const track0Metas = inputMeta.filter((m) => m.kind === 'clip' && !m.isPip);
          track0Metas.forEach((meta, idx) => {
            const chain = buildClipFilterChain(
              meta.item,
              meta.inputIndex,
              outW,
              outH,
              projectRotation,
              projectBgColor,
              meta.outDurationSec,
              false
            );
            const label = `v0_${idx}`;
            filterParts.push(`${chain.join(',')}[${label}]`);
            track0Labels.push(`[${label}]`);
          });

          let currentVideoLabel = track0Labels.length === 1 ? 'v0_0' : 'v_concat';
          if (track0Labels.length > 1) {
            filterParts.push(`${track0Labels.join('')}concat=n=${track0Labels.length}:v=1:a=0[v_concat]`);
          }

          // Composite Track 1 (PiP) clips
          const pipMetas = inputMeta.filter((m) => m.kind === 'clip' && m.isPip);
          pipMetas.forEach((meta, idx) => {
            const chain = buildClipFilterChain(
              meta.item,
              meta.inputIndex,
              outW,
              outH,
              0,
              projectBgColor,
              meta.outDurationSec,
              true
            );
            const pipLabel = `vpip_${idx}`;
            const nextLabel = `v_comp_${idx}`;
            const start = meta.globalStartSec;
            const end = start + meta.outDurationSec;
            const xPct = Math.max(0, Math.min(90, Number(meta.item.pipX ?? 66))) / 100;
            const yPct = Math.max(0, Math.min(90, Number(meta.item.pipY ?? 64))) / 100;
            filterParts.push(`${chain.join(',')}[${pipLabel}]`);
            filterParts.push(
              `[${currentVideoLabel}][${pipLabel}]overlay=x=(W-w)*${xPct.toFixed(2)}:y=(H-h)*${yPct.toFixed(2)}:enable='between(t,${start.toFixed(2)},${end.toFixed(2)})':eof_action=pass[${nextLabel}]`
            );
            currentVideoLabel = nextLabel;
          });

          // Overlay Effects (vignette, cinematic bars, golden border)
          overlayEffects.forEach((fx, idx) => {
            const start = Math.max(0, Number(fx.startSec) || 0);
            const end = Math.max(start + 0.1, Number(fx.endSec) || totalVideoDurationSec);
            const nextLabel = `v_fx_${idx}`;
            if (fx.preset === 'warm_vignette') {
              filterParts.push(`[${currentVideoLabel}]vignette=PI/4:enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'[${nextLabel}]`);
              currentVideoLabel = nextLabel;
            } else if (fx.preset === 'cinematic_bars') {
              const barH = Math.max(24, Math.round(outH * 0.1));
              filterParts.push(
                `[${currentVideoLabel}]drawbox=x=0:y=0:w=${outW}:h=${barH}:color=black@0.95:t=fill:enable='between(t,${start.toFixed(2)},${end.toFixed(2)})',drawbox=x=0:y=${outH - barH}:w=${outW}:h=${barH}:color=black@0.95:t=fill:enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'[${nextLabel}]`
              );
              currentVideoLabel = nextLabel;
            } else if (fx.preset === 'golden_border' || fx.preset === 'chef_frame') {
              const color = fx.preset === 'golden_border' ? '0xd97706@0.85' : '0xffffff@0.75';
              filterParts.push(
                `[${currentVideoLabel}]drawbox=x=12:y=12:w=${outW - 24}:h=${outH - 24}:color=${color}:t=4:enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'[${nextLabel}]`
              );
              currentVideoLabel = nextLabel;
            }
          });

          // Burn Text Overlays, Animated Titles, Lower Thirds & Captions
          textOverlays.forEach((ov, idx) => {
            const cleanText = escapeDrawtext(ov.text || '');
            if (!cleanText) return;
            const start = Math.max(0, Number(ov.startSec) || 0);
            const end = Math.max(start + 0.2, Number(ov.endSec) || start + 3);
            const fontFile = getFontPath(ov.fontFamily);
            const scaleFactor = outH / 720;
            const basePx = Number(ov.fontSizePx) || (ov.fontSize === 'lg' ? 42 : ov.fontSize === 'sm' ? 24 : 32);
            const fontSize = Math.max(18, Math.round(basePx * scaleFactor));
            const fontColor = `0x${normalizeHexColor(ov.color, 'ffffff')}`;
            const hasBox = Boolean(ov.bgColor) || ov.kind === 'caption' || ov.kind === 'lower_third';
            const boxHex = normalizeHexColor(ov.bgColor || (ov.kind === 'lower_third' ? '#d97706' : '#000000'), '000000');

            let xExpr = '(w-text_w)/2';
            let yExpr = 'h*0.82-text_h/2';
            if (typeof ov.xPercent === 'number' && typeof ov.yPercent === 'number') {
              const xr = Math.max(0.05, Math.min(0.95, ov.xPercent / 100));
              const yr = Math.max(0.05, Math.min(0.95, ov.yPercent / 100));
              xExpr = `max(20,min(w-text_w-20,w*${xr.toFixed(2)}-text_w/2))`;
              yExpr = `max(20,min(h-text_h-20,h*${yr.toFixed(2)}-text_h/2))`;
            } else if (ov.position === 'top') {
              yExpr = 'h*0.12';
            } else if (ov.position === 'middle') {
              yExpr = '(h-text_h)/2';
            } else if (ov.kind === 'lower_third') {
              xExpr = 'w*0.06';
              yExpr = 'h*0.78';
            }

            const drawArgs = [
              `fontfile='${fontFile}'`,
              `text='${cleanText}'`,
              `fontsize=${fontSize}`,
              `fontcolor=${fontColor}`,
              `x=${xExpr}`,
              `y=${yExpr}`,
              `shadowcolor=black@0.7:shadowx=2:shadowy=2`,
              hasBox ? `box=1:boxcolor=0x${boxHex}@0.72:boxborderw=${Math.round(10 * scaleFactor)}` : '',
              `enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'`,
            ]
              .filter(Boolean)
              .join(':');

            const nextLabel = `v_txt_${idx}`;
            filterParts.push(`[${currentVideoLabel}]drawtext=${drawArgs}[${nextLabel}]`);
            currentVideoLabel = nextLabel;

            if (ov.kind === 'lower_third' && ov.subtitle) {
              const subText = escapeDrawtext(ov.subtitle);
              const subSize = Math.max(14, Math.round(fontSize * 0.65));
              const subArgs = [
                `fontfile='${fontFile}'`,
                `text='${subText}'`,
                `fontsize=${subSize}`,
                `fontcolor=0xfafaf9`,
                `x=${xExpr}`,
                `y=${yExpr}+${Math.round(fontSize * 1.45)}`,
                `box=1:boxcolor=0x1c1917@0.85:boxborderw=${Math.round(8 * scaleFactor)}`,
                `enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'`,
              ].join(':');
              const subLabel = `v_txtsub_${idx}`;
              filterParts.push(`[${currentVideoLabel}]drawtext=${subArgs}[${subLabel}]`);
              currentVideoLabel = subLabel;
            }
          });

          // Build Audio Mix
          const audioStreamLabels: string[] = [];

          // Clip native audio (Track 0 & Track 1)
          inputMeta
            .filter((m) => m.kind === 'clip' && m.hasAudio)
            .forEach((meta, idx) => {
              const clip = meta.item;
              if (origAudioMuted || clip.muted || clip.audioDetached) return;
              const vol = Math.max(0, Math.min(2.5, origAudioVol * (Number(clip.volume) ?? 1)));
              if (vol <= 0.01) return;

              const trimS = Math.max(0, Number(clip.trimStartSec) || 0);
              const trimE = Math.max(trimS + 0.2, Number(clip.trimEndSec) || Number(clip.durationSec) || 5);
              const speed = Math.max(0.25, Math.min(3.0, Number(clip.speed) || 1));
              const delayMs = Math.max(0, Math.round(meta.globalStartSec * 1000));

              const aFilters: string[] = [
                `atrim=start=${trimS.toFixed(3)}:end=${trimE.toFixed(3)}`,
                'asetpts=PTS-STARTPTS',
              ];
              if (clip.reversed) aFilters.push('areverse');
              if (Math.abs(speed - 1) > 0.01) aFilters.push(buildAtempoChain(speed));
              aFilters.push(`volume=${vol.toFixed(2)}`);
              if (delayMs > 0) aFilters.push(`adelay=${delayMs}|${delayMs}`);
              aFilters.push('aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo');

              const aLabel = `aclip_${idx}`;
              filterParts.push(`[${meta.inputIndex}:a]${aFilters.join(',')}[${aLabel}]`);
              audioStreamLabels.push(`[${aLabel}]`);
            });

          // External / Voiceover / Music / Extracted audio tracks
          inputMeta
            .filter((m) => m.kind === 'audio')
            .forEach((meta, idx) => {
              const tr = meta.item;
              const vol = Math.max(0, Math.min(2.5, Number(tr.volume) ?? 1));
              if (vol <= 0.01) return;

              const trimS = Math.max(0, Number(tr.trimStartSec) || 0);
              const trimE = Math.max(trimS + 0.1, Number(tr.trimEndSec) || Number(tr.durationSec) || 5);
              const segDur = Math.max(0.1, trimE - trimS);
              const delayMs = Math.max(0, Math.round(meta.globalStartSec * 1000));

              const aFilters: string[] = [
                `atrim=start=${trimS.toFixed(3)}:end=${trimE.toFixed(3)}`,
                'asetpts=PTS-STARTPTS',
              ];
              if (tr.noiseReduction) {
                aFilters.push('highpass=f=90,lowpass=f=9000,afftdn=nf=-22');
              }
              const fadeIn = Math.max(0, Math.min(segDur / 2, Number(tr.fadeInSec) || 0));
              const fadeOut = Math.max(0, Math.min(segDur / 2, Number(tr.fadeOutSec) || 0));
              if (fadeIn > 0.05) {
                aFilters.push(`afade=t=in:st=0:d=${fadeIn.toFixed(2)}`);
              }
              if (fadeOut > 0.05) {
                aFilters.push(`afade=t=out:st=${Math.max(0, segDur - fadeOut).toFixed(2)}:d=${fadeOut.toFixed(2)}`);
              }
              aFilters.push(`volume=${vol.toFixed(2)}`);
              if (delayMs > 0) aFilters.push(`adelay=${delayMs}|${delayMs}`);
              aFilters.push('aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo');

              const aLabel = `atrk_${idx}`;
              filterParts.push(`[${meta.inputIndex}:a]${aFilters.join(',')}[${aLabel}]`);
              audioStreamLabels.push(`[${aLabel}]`);
            });

          // Add silent base track so output always has valid AAC audio stream trimmed cleanly to video duration
          const baseSilenceIdx = inputMeta.length;
          ffmpegInputs.push('-f', 'lavfi', '-t', totalVideoDurationSec.toFixed(3), '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
          filterParts.push(`[${baseSilenceIdx}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[asilence]`);

          if (audioStreamLabels.length > 0) {
            const allAudio = `[asilence]${audioStreamLabels.join('')}`;
            filterParts.push(`${allAudio}amix=inputs=${audioStreamLabels.length + 1}:duration=first:normalize=0[aout]`);
          } else {
            filterParts.push('[asilence]anull[aout]');
          }

          const exportId = `studio_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const safeFilename = `${exportId}.mp4`;
          const outputPath = path.join(UPLOADS_DIR, safeFilename);
          const crf = exportSettings?.quality === 'ultra' ? '16' : exportSettings?.quality === 'standard' ? '24' : '20';

          const args = [
            '-y',
            ...ffmpegInputs,
            '-filter_complex',
            filterParts.join(';'),
            '-map',
            `[${currentVideoLabel}]`,
            '-map',
            '[aout]',
            '-c:v',
            'libx264',
            '-preset',
            'veryfast',
            '-crf',
            crf,
            '-pix_fmt',
            'yuv420p',
            '-c:a',
            'aac',
            '-b:a',
            '192k',
            '-t',
            totalVideoDurationSec.toFixed(3),
            '-movflags',
            '+faststart',
            outputPath,
          ];

          job.progress = 15;
          job.stage = 'Rendering timeline, effects & audio mix...';

          await new Promise<void>((resolve, reject) => {
            const proc = spawn('ffmpeg', args);
            let stderrLog = '';

            proc.stderr.on('data', (chunk) => {
              const text = chunk.toString();
              stderrLog += text.slice(-4000);
              const match = text.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d+)/);
              if (match) {
                const secs = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
                const pct = Math.min(96, Math.max(16, Math.round(15 + (secs / totalVideoDurationSec) * 80)));
                job.progress = pct;
                job.stage = `Encoding ${outW}×${outH} video (${pct}%)...`;
              }
            });

            proc.on('close', (code) => {
              if (code === 0 && fs.existsSync(outputPath)) {
                resolve();
              } else {
                reject(new Error(`FFmpeg render exited with code ${code}. ${stderrLog.slice(-500)}`));
              }
            });

            proc.on('error', (err) => {
              reject(err);
            });
          });

          // Replicate into dist if present
          const distUploads = path.resolve(__dirname, 'dist/uploads/videos');
          if (fs.existsSync(distUploads)) {
            try {
              fs.copyFileSync(outputPath, path.join(distUploads, safeFilename));
            } catch {
              // ignore
            }
          }

          const stat = fs.statSync(outputPath);
          job.status = 'completed';
          job.progress = 100;
          job.stage = 'Export ready!';
          job.filename = safeFilename;
          job.url = `/api/videos/stream/${safeFilename}`;
          job.size = stat.size;
          job.durationSec = Number(totalVideoDurationSec.toFixed(1));
        } catch (err: any) {
          console.error('[Studio Export Error]', err);
          job.status = 'failed';
          job.error = err?.message || 'Failed to render video export.';
          job.stage = 'Export failed';
        } finally {
          try {
            fs.rmSync(jobDir, { recursive: true, force: true });
          } catch {
            // ignore cleanup errors
          }
        }
      })();
    } catch (err: any) {
      try {
        fs.rmSync(jobDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
      return res.status(500).json({ error: err?.message || 'Could not start video export.' });
    }
  });

  // Server-Side Gemini AI Automatic Caption Generation
  router.post('/api/studio/ai/transcribe-captions', uploadMiddleware.single('media'), async (req, res) => {
    const file = req.file;
    const reqAny = req as any;
    const jobDir = reqAny._studioJobDir;
    const durationSec = Math.max(1, Number(req.body?.durationSec) || 15);

    try {
      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in Settings > Secrets. Add your key to enable AI automatic captions, or add manual captions directly in the Text & Captions tab.',
        });
      }

      if (!file || !fs.existsSync(file.path)) {
        return res.status(400).json({ error: 'No audio or video media uploaded for caption transcription.' });
      }

      // Extract & compress clean MP3 audio via FFmpeg so transcription works cleanly for any MP4/WebM/MOV/WAV
      const mp3Path = path.join(path.dirname(file.path), `captions_${Date.now()}.mp3`);
      await execFileAsync('ffmpeg', [
        '-y',
        '-i',
        file.path,
        '-vn',
        '-ac',
        '1',
        '-ar',
        '16000',
        '-b:a',
        '64k',
        '-t',
        '300',
        mp3Path,
      ]);

      if (!fs.existsSync(mp3Path) || fs.statSync(mp3Path).size < 256) {
        return res.status(400).json({ error: 'No spoken audio track was detected in this clip.' });
      }

      const audioBase64 = fs.readFileSync(mp3Path).toString('base64');

      // Step 1: Transcribe verbatim speech with gemini-3.5-transcribe
      const transcriptResp = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'audio/mp3',
                data: audioBase64,
              },
            },
            { text: 'Transcribe all spoken narration and culinary instructions verbatim.' },
          ],
        },
      });

      const rawTranscript = (transcriptResp.text || '').trim();
      if (!rawTranscript) {
        return res.json({ captions: [], transcript: '' });
      }

      // Step 2: Segment transcript into clean timed subtitle cues using gemini-4-hydrogen
      const cueResp = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Break this cooking video transcript into concise readable subtitle cues (max 8-12 words per cue) distributed smoothly across 0 to ${durationSec.toFixed(1)} seconds.\n\nTranscript:\n${rawTranscript}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                startSec: { type: Type.NUMBER },
                endSec: { type: Type.NUMBER },
                text: { type: Type.STRING },
              },
              required: ['startSec', 'endSec', 'text'],
            },
          },
        },
      });

      const captions = JSON.parse((cueResp.text || '[]').trim());
      return res.json({
        transcript: rawTranscript,
        captions: Array.isArray(captions) ? captions : [],
      });
    } catch (err: any) {
      console.error('[AI Captions Error]', err);
      const status = Number(err?.status) || 500;
      return res.status(status >= 400 && status < 600 ? status : 500).json({
        error: err?.message || 'Failed to generate AI captions.',
      });
    } finally {
      if (jobDir) {
        try {
          fs.rmSync(jobDir, { recursive: true, force: true });
        } catch {
          // ignore
        }
      }
    }
  });

  // Server-Side Gemini AI Video Editing & Highlight Suggestions
  router.post('/api/studio/ai/suggestions', express.json({ limit: '10mb' }), async (req, res) => {
    try {
      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in Settings > Secrets. Add your key to enable Gemini AI editing suggestions.',
        });
      }

      const { title, category, durationSec, clipCount, hasAudio, frames } = req.body || {};
      const parts: any[] = [];

      if (Array.isArray(frames)) {
        frames.slice(0, 4).forEach((dataUrl: string) => {
          const match = String(dataUrl).match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
          if (match) {
            parts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2],
              },
            });
          }
        });
      }

      parts.push({
        text: `Analyze this cooking video project ("${title || 'Untitled Recipe Video'}", category: "${category || 'Technique'}", duration: ${Number(durationSec || 0).toFixed(1)}s, clips: ${clipCount || 1}, hasAudio: ${Boolean(hasAudio)}). Provide practical, actionable video editing improvements for a creator on DellyChow, including lighting/color filter advice, pacing/highlight tips, and suggested animated title hook.`,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedTitleHook: { type: Type.STRING },
              recommendedFilter: {
                type: Type.STRING,
                enum: [
                  'warm_kitchen',
                  'crisp_studio',
                  'golden_hour',
                  'high_contrast',
                  'cool_fresh',
                  'vintage_film',
                ],
              },
              brightnessBoost: { type: Type.NUMBER },
              contrastBoost: { type: Type.NUMBER },
              saturationBoost: { type: Type.NUMBER },
              suggestedAspectRatio: {
                type: Type.STRING,
                enum: ['16:9', '9:16', '1:1', '4:5'],
              },
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    detail: { type: Type.STRING },
                    actionType: {
                      type: Type.STRING,
                      enum: ['enhance_color', 'add_title', 'add_music', 'trim_silence', 'switch_vertical'],
                    },
                  },
                  required: ['title', 'detail', 'actionType'],
                },
              },
            },
            required: ['recommendedTitleHook', 'recommendedFilter', 'suggestions'],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      return res.json(parsed);
    } catch (err: any) {
      console.error('[AI Suggestions Error]', err);
      const status = Number(err?.status) || 500;
      return res.status(status >= 400 && status < 600 ? status : 500).json({
        error: err?.message || 'Failed to generate AI editing suggestions.',
      });
    }
  });

  return router;
}
