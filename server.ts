import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, execFile } from 'child_process';
import { promisify } from 'util';
import { createStudioRouter } from './serverStudio';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const UPLOADS_DIR = path.resolve(__dirname, 'public/uploads/videos');
  const AUDIO_UPLOADS_DIR = path.resolve(__dirname, 'public/uploads/audio');
  const TEMP_RENDER_DIR = path.resolve(__dirname, 'public/uploads/.render_tmp');

  // Ensure uploads & temp render directories exist
  [UPLOADS_DIR, AUDIO_UPLOADS_DIR, TEMP_RENDER_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Baseline security headers (preserving iframe preview compatibility)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
    next();
  });

  // Authoritative Server UTC Timestamp Endpoint (Single Source of Truth fallback & clock calibration)
  app.get('/api/time', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const nowMs = Date.now();
    return res.json({
      utcIso: new Date(nowMs).toISOString(),
      epochMs: nowMs,
    });
  });

  // Video Editing Studio FFmpeg Export & AI Studio Endpoints
  app.use(createStudioRouter());

  // Raw body parser for video uploads (up to 300MB)
  app.use('/api/videos/upload', express.raw({ type: '*/*', limit: '300mb' }));

  // Video Upload API
  app.post('/api/videos/upload', (req, res) => {
    try {
      const rawFilename = (req.headers['x-filename'] as string) || `video_${Date.now()}.mp4`;
      const rawVideoId = (req.headers['x-video-id'] as string) || `vid_${Date.now()}`;
      const videoId = rawVideoId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 96) || `vid_${Date.now()}`;
      const filename = path.basename(rawFilename);

      let ext = path.extname(filename).toLowerCase();
      if (!ext) {
        const contentType = (req.headers['content-type'] || '').toLowerCase();
        ext = contentType.includes('webm') ? '.webm' : contentType.includes('quicktime') || contentType.includes('mov') ? '.mov' : '.mp4';
      }

      const ALLOWED_VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.m4v']);
      if (!ALLOWED_VIDEO_EXTS.has(ext)) {
        return res.status(400).json({ error: 'Unsupported video format. Allowed: MP4, WebM, MOV, M4V.' });
      }

      let safeFilename = `${videoId}${ext}`;
      let targetPath = path.join(UPLOADS_DIR, safeFilename);
      const shouldTranscodeMp4 = req.headers['x-transcode-mp4'] === 'true';

      if (Buffer.isBuffer(req.body) && req.body.length > 0) {
        fs.writeFileSync(targetPath, req.body);
        const distUploads = path.resolve(__dirname, 'dist/uploads/videos');

        if (shouldTranscodeMp4 && (ext === '.webm' || ext === '.mov' || ext === '.m4v')) {
          const mp4Filename = `${videoId}.mp4`;
          const mp4Path = path.join(UPLOADS_DIR, mp4Filename);
          try {
            execSync(
              `ffmpeg -y -i "${targetPath}" -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "${mp4Path}" 2>/dev/null`,
              { stdio: 'ignore' }
            );
            if (fs.existsSync(mp4Path) && fs.statSync(mp4Path).size > 0) {
              try {
                if (targetPath !== mp4Path && fs.existsSync(targetPath)) {
                  fs.unlinkSync(targetPath);
                }
              } catch {
                // ignore cleanup warning
              }
              safeFilename = mp4Filename;
              targetPath = mp4Path;
            }
          } catch {
            // Keep original uploaded file if transcode fails
          }
        } else if (ext === '.mp4' || ext === '.mov' || ext === '.m4v') {
          // Apply faststart so the moov atom is placed at the front for instantaneous browser streaming
          try {
            const tmpFile = `${targetPath}.faststart.mp4`;
            execSync(`ffmpeg -y -i "${targetPath}" -c copy -movflags +faststart "${tmpFile}" 2>/dev/null && mv "${tmpFile}" "${targetPath}"`, { stdio: 'ignore' });
          } catch {
            // keep original if faststart is not supported on this container
          }
        }

        if (fs.existsSync(distUploads)) {
          try {
            fs.copyFileSync(targetPath, path.join(distUploads, safeFilename));
          } catch {
            // ignore
          }
        }
      } else {
        return res.status(400).json({ error: 'No video binary received or body is empty' });
      }

      const finalSize = fs.existsSync(targetPath) ? fs.statSync(targetPath).size : req.body.length;
      const streamUrl = `/api/videos/stream/${safeFilename}`;
      console.log(`[Video Storage] Successfully stored ${safeFilename} (${finalSize} bytes) -> ${streamUrl}`);

      return res.json({
        success: true,
        id: videoId,
        filename: safeFilename,
        url: streamUrl,
        size: finalSize
      });
    } catch (err: any) {
      console.error('[Video Storage] Upload error:', err);
      return res.status(500).json({ error: err.message || 'Failed to save video file' });
    }
  });

  // Stream endpoints CORS and public access middleware
  const setVideoCorsHeaders = (res: express.Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, Content-Type');
    res.setHeader('Cache-Control', 'public, max-age=3600');
  };

  // OPTIONS handler for cross-origin preflight checks
  app.options('/api/videos/stream/:filename', (req, res) => {
    setVideoCorsHeaders(res);
    return res.status(204).end();
  });

  // Self-healing file lookup across public and dist uploads
  const findVideoFilePath = (filenameInput: string): string | null => {
    const rawFilename = path.basename(filenameInput);
    const baseName = rawFilename.replace(/\.(mp4|webm|mov|m4v)$/i, '');
    const dirsToCheck = [
      UPLOADS_DIR,
      path.resolve(__dirname, 'dist/uploads/videos'),
      path.resolve(__dirname, 'uploads/videos'),
    ];

    const candidates = [
      rawFilename,
      `${baseName}.mp4`,
      `${baseName}.webm`,
      `${baseName}.mov`,
      `${baseName}.m4v`,
    ];

    for (const dir of dirsToCheck) {
      if (fs.existsSync(dir)) {
        for (const cand of candidates) {
          const testPath = path.join(dir, cand);
          if (fs.existsSync(testPath)) {
            // Self-heal: ensure file is replicated in canonical public uploads
            const canonicalPath = path.join(UPLOADS_DIR, path.basename(testPath));
            if (!fs.existsSync(canonicalPath)) {
              try {
                fs.copyFileSync(testPath, canonicalPath);
              } catch {
                // ignore copy error
              }
            }
            return testPath;
          }
        }
      }
    }
    return null;
  };

  // Check if a video stream exists on server
  app.head('/api/videos/stream/:filename', (req, res) => {
    setVideoCorsHeaders(res);
    const filePath = findVideoFilePath(req.params.filename);

    if (filePath && fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = ext === '.webm' ? 'video/webm' : ext === '.mov' ? 'video/quicktime' : 'video/mp4';
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', mimeType);
      return res.status(200).end();
    }
    return res.status(404).end();
  });

  // Stream video with robust HTTP Range Requests (res.sendFile handles all RFC 7233 range specs: standard, suffix, 416, multi-range, HEAD, and client disconnects)
  app.get('/api/videos/stream/:filename', (req, res) => {
    setVideoCorsHeaders(res);
    const filePath = findVideoFilePath(req.params.filename);

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video file not found on server.' });
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.webm' 
      ? 'video/webm' 
      : ext === '.mov' 
      ? 'video/quicktime' 
      : 'video/mp4';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');

    res.sendFile(path.resolve(filePath), {
      acceptRanges: true,
      cacheControl: true,
      maxAge: '1h'
    }, (err) => {
      if (err && !res.headersSent) {
        if ((err as any).status === 416) {
          try {
            const stat = fs.statSync(filePath);
            res.setHeader('Content-Range', `bytes */${stat.size}`);
            return res.status(416).end();
          } catch {
            return res.status(416).end();
          }
        }
        // Client aborted/closed connection during stream is normal when seeking or pausing
        if ((err as any).code !== 'ECONNABORTED' && (err as any).code !== 'ECANCELED') {
          console.warn('[Video Stream] Sendfile notice:', err.message);
        }
      }
    });
  });

  // Delete stored video file from server disk
  app.delete('/api/videos/stream/:filename', (req, res) => {
    const filePath = findVideoFilePath(req.params.filename);
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err: any) {
        console.warn('[Video Storage] Could not delete video file:', err?.message || err);
      }
    }
    const distPath = path.resolve(__dirname, 'dist/uploads/videos', path.basename(req.params.filename));
    if (fs.existsSync(distPath)) {
      try {
        fs.unlinkSync(distPath);
      } catch {
        // ignore
      }
    }
    return res.status(200).json({ success: true });
  });

  // Serve static uploads
  app.use('/uploads/videos', express.static(UPLOADS_DIR));
  app.use('/public/uploads/videos', express.static(UPLOADS_DIR));

  // =========================================================================
  // Audio Upload & Streaming API (Voiceovers, Narration & Music Tracks)
  // =========================================================================

  app.use('/api/audio/upload', express.raw({ type: '*/*', limit: '100mb' }));

  app.post('/api/audio/upload', (req, res) => {
    try {
      const rawFilename = (req.headers['x-filename'] as string) || `audio_${Date.now()}.webm`;
      const rawAudioId = (req.headers['x-audio-id'] as string) || `aud_${Date.now()}`;
      const audioId = rawAudioId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 96) || `aud_${Date.now()}`;
      const filename = path.basename(rawFilename);

      let ext = path.extname(filename).toLowerCase();
      if (!ext) {
        const ct = (req.headers['content-type'] || '').toLowerCase();
        if (ct.includes('wav')) ext = '.wav';
        else if (ct.includes('mpeg') || ct.includes('mp3')) ext = '.mp3';
        else if (ct.includes('mp4') || ct.includes('m4a') || ct.includes('aac')) ext = '.m4a';
        else if (ct.includes('ogg')) ext = '.ogg';
        else ext = '.webm';
      }

      const ALLOWED_AUDIO_EXTS = new Set(['.webm', '.wav', '.mp3', '.m4a', '.ogg', '.aac', '.mp4']);
      if (!ALLOWED_AUDIO_EXTS.has(ext)) {
        return res.status(400).json({ error: 'Unsupported audio format.' });
      }

      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: 'No audio binary received or body is empty.' });
      }

      const safeFilename = `${audioId}${ext}`;
      const targetPath = path.join(AUDIO_UPLOADS_DIR, safeFilename);
      fs.writeFileSync(targetPath, req.body);

      const distAudioDir = path.resolve(__dirname, 'dist/uploads/audio');
      if (fs.existsSync(distAudioDir)) {
        try {
          fs.copyFileSync(targetPath, path.join(distAudioDir, safeFilename));
        } catch {
          // ignore
        }
      }

      const streamUrl = `/api/audio/stream/${safeFilename}`;
      return res.json({
        success: true,
        id: audioId,
        filename: safeFilename,
        url: streamUrl,
        size: req.body.length,
      });
    } catch (err: any) {
      console.error('[Audio Storage] Upload error:', err);
      return res.status(500).json({ error: err.message || 'Failed to save audio file.' });
    }
  });

  const findAudioFilePath = (filenameInput: string): string | null => {
    const rawFilename = path.basename(filenameInput);
    const baseName = rawFilename.replace(/\.(webm|wav|mp3|m4a|ogg|aac|mp4)$/i, '');
    const dirsToCheck = [
      AUDIO_UPLOADS_DIR,
      path.resolve(__dirname, 'dist/uploads/audio'),
      path.resolve(__dirname, 'uploads/audio'),
    ];
    const candidates = [
      rawFilename,
      `${baseName}.webm`,
      `${baseName}.wav`,
      `${baseName}.mp3`,
      `${baseName}.m4a`,
      `${baseName}.ogg`,
      `${baseName}.aac`,
    ];

    for (const dir of dirsToCheck) {
      if (fs.existsSync(dir)) {
        for (const cand of candidates) {
          const testPath = path.join(dir, cand);
          if (fs.existsSync(testPath)) {
            return testPath;
          }
        }
      }
    }
    return null;
  };

  const getAudioMimeType = (filePath: string): string => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.wav') return 'audio/wav';
    if (ext === '.mp3') return 'audio/mpeg';
    if (ext === '.m4a' || ext === '.mp4') return 'audio/mp4';
    if (ext === '.ogg') return 'audio/ogg';
    if (ext === '.aac') return 'audio/aac';
    return 'audio/webm';
  };

  app.options('/api/audio/stream/:filename', (_req, res) => {
    setVideoCorsHeaders(res);
    return res.status(204).end();
  });

  app.head('/api/audio/stream/:filename', (req, res) => {
    setVideoCorsHeaders(res);
    const filePath = findAudioFilePath(req.params.filename);
    if (filePath && fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', getAudioMimeType(filePath));
      return res.status(200).end();
    }
    return res.status(404).end();
  });

  app.get('/api/audio/stream/:filename', (req, res) => {
    setVideoCorsHeaders(res);
    const filePath = findAudioFilePath(req.params.filename);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found on server.' });
    }
    res.setHeader('Content-Type', getAudioMimeType(filePath));
    res.setHeader('Accept-Ranges', 'bytes');
    res.sendFile(path.resolve(filePath), { acceptRanges: true, cacheControl: true, maxAge: '1h' }, (err) => {
      if (err && !res.headersSent && (err as any).code !== 'ECONNABORTED' && (err as any).code !== 'ECANCELED') {
        console.warn('[Audio Stream] Sendfile notice:', err.message);
      }
    });
  });

  app.use('/uploads/audio', express.static(AUDIO_UPLOADS_DIR));
  app.use('/public/uploads/audio', express.static(AUDIO_UPLOADS_DIR));

  // =========================================================================
  // Studio FFmpeg Multi-Track Video Assembly & Render Engine
  // =========================================================================

  interface ProbedMediaInfo {
    hasVideo: boolean;
    hasAudio: boolean;
    durationSec: number;
    width: number;
    height: number;
  }

  const probeMediaInfo = async (filePath: string): Promise<ProbedMediaInfo> => {
    try {
      const { stdout } = await execFileAsync('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_streams',
        '-show_format',
        filePath,
      ]);
      const data = JSON.parse(stdout || '{}');
      const streams: any[] = Array.isArray(data.streams) ? data.streams : [];
      const videoStream = streams.find((s) => s.codec_type === 'video');
      const audioStream = streams.find((s) => s.codec_type === 'audio');
      const fmtDur = parseFloat(data?.format?.duration || '0');
      const streamDur = parseFloat(videoStream?.duration || audioStream?.duration || '0');
      const durationSec = Number.isFinite(fmtDur) && fmtDur > 0 ? fmtDur : Number.isFinite(streamDur) ? streamDur : 0;

      return {
        hasVideo: Boolean(videoStream),
        hasAudio: Boolean(audioStream),
        durationSec,
        width: Number(videoStream?.width) || 1280,
        height: Number(videoStream?.height) || 720,
      };
    } catch {
      return { hasVideo: true, hasAudio: false, durationSec: 0, width: 1280, height: 720 };
    }
  };

  const pickSystemFontPath = (): string | null => {
    const candidates = [
      '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
      '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
      '/System/Library/Fonts/Helvetica.ttc',
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  };

  app.use('/api/videos/render', express.json({ limit: '5mb' }));

  app.post('/api/videos/render', async (req, res) => {
    const tempFilesToCleanup: string[] = [];
    try {
      const {
        outputVideoId,
        clips,
        audioTracks = [],
        textOverlays = [],
        cropRatio = 'original',
        rotation = 0,
        originalAudioVolume = 1,
        originalAudioMuted = false,
      } = req.body || {};

      if (!Array.isArray(clips) || clips.length === 0) {
        return res.status(400).json({ error: 'At least one video clip is required to render.' });
      }

      const cleanOutId =
        String(outputVideoId || `studio_${Date.now()}`)
          .replace(/[^a-zA-Z0-9_-]/g, '')
          .slice(0, 96) || `studio_${Date.now()}`;

      // Resolve and probe every video clip
      const resolvedClips: Array<{
        filePath: string;
        info: ProbedMediaInfo;
        trimStart: number;
        trimEnd: number;
        segDur: number;
        transition: string;
        volume: number;
        muted: boolean;
      }> = [];

      for (const clip of clips) {
        const rawUrl = String(clip?.serverUrl || '');
        const baseName = path.basename(rawUrl.split('?')[0]);
        const filePath = baseName ? findVideoFilePath(baseName) : null;
        if (!filePath || !fs.existsSync(filePath)) {
          return res.status(400).json({ error: `Video clip source not found on server (${baseName || 'unknown'}).` });
        }
        const info = await probeMediaInfo(filePath);
        const maxDur = info.durationSec > 0 ? info.durationSec : Math.max(1, Number(clip?.trimEndSec) || 5);
        const trimStart = Math.max(0, Math.min(maxDur - 0.25, Number(clip?.trimStartSec) || 0));
        const rawEnd = Number(clip?.trimEndSec) > 0 ? Number(clip.trimEndSec) : maxDur;
        const trimEnd = Math.max(trimStart + 0.2, Math.min(maxDur, rawEnd));
        const segDur = Math.max(0.2, trimEnd - trimStart);

        resolvedClips.push({
          filePath,
          info,
          trimStart,
          trimEnd,
          segDur,
          transition: String(clip?.transition || 'none'),
          volume: Number.isFinite(Number(clip?.volume)) ? Math.max(0, Math.min(2, Number(clip.volume))) : 1,
          muted: Boolean(clip?.muted),
        });
      }

      // Resolve & probe active unmuted audio tracks
      const resolvedAudio: Array<{
        filePath: string;
        info: ProbedMediaInfo;
        startOffsetSec: number;
        trimStart: number;
        trimEnd: number;
        volume: number;
      }> = [];

      if (Array.isArray(audioTracks)) {
        for (const tr of audioTracks) {
          if (tr?.muted) continue;
          const vol = Number.isFinite(Number(tr?.volume)) ? Math.max(0, Math.min(2, Number(tr.volume))) : 1;
          if (vol <= 0.01) continue;

          const rawUrl = String(tr?.serverUrl || '');
          const baseName = path.basename(rawUrl.split('?')[0]);
          const filePath = baseName ? findAudioFilePath(baseName) : null;
          if (!filePath || !fs.existsSync(filePath)) continue;

          const info = await probeMediaInfo(filePath);
          if (!info.hasAudio) continue;

          const maxDur = info.durationSec > 0 ? info.durationSec : Math.max(1, Number(tr?.trimEndSec) || 10);
          const trimStart = Math.max(0, Math.min(maxDur - 0.15, Number(tr?.trimStartSec) || 0));
          const rawEnd = Number(tr?.trimEndSec) > 0 ? Number(tr.trimEndSec) : maxDur;
          const trimEnd = Math.max(trimStart + 0.15, Math.min(maxDur, rawEnd));

          resolvedAudio.push({
            filePath,
            info,
            startOffsetSec: Math.max(0, Number(tr?.startOffsetSec) || 0),
            trimStart,
            trimEnd,
            volume: vol,
          });
        }
      }

      // Compute uniform even target dimensions honoring rotation + cropRatio
      const rotDeg = [0, 90, 180, 270].includes(Number(rotation)) ? Number(rotation) : 0;
      const baseW = rotDeg === 90 || rotDeg === 270 ? resolvedClips[0].info.height : resolvedClips[0].info.width;
      const baseH = rotDeg === 90 || rotDeg === 270 ? resolvedClips[0].info.width : resolvedClips[0].info.height;
      const clampedW = Math.max(480, Math.min(1920, baseW || 1280));
      const clampedH = Math.max(480, Math.min(1920, baseH || 720));

      let outW = clampedW;
      let outH = clampedH;
      if (cropRatio === '16:9') {
        outW = 1280;
        outH = 720;
      } else if (cropRatio === '9:16') {
        outW = 720;
        outH = 1280;
      } else if (cropRatio === '1:1') {
        outW = 1080;
        outH = 1080;
      } else if (cropRatio === '4:5') {
        outW = 864;
        outH = 1080;
      }
      // Guarantee even dimensions for H.264 yuv420p
      outW = outW % 2 === 0 ? outW : outW - 1;
      outH = outH % 2 === 0 ? outH : outH - 1;

      const transposePrefix =
        rotDeg === 90
          ? 'transpose=1,'
          : rotDeg === 180
          ? 'transpose=1,transpose=1,'
          : rotDeg === 270
          ? 'transpose=2,'
          : '';

      const ffmpegArgs: string[] = ['-y'];
      resolvedClips.forEach((c) => {
        ffmpegArgs.push('-i', c.filePath);
      });
      resolvedAudio.forEach((a) => {
        ffmpegArgs.push('-i', a.filePath);
      });

      const filterParts: string[] = [];

      // Prepare each video + base audio segment
      resolvedClips.forEach((c, idx) => {
        const effVol =
          originalAudioMuted || c.muted
            ? 0
            : Math.max(0, c.volume * (Number.isFinite(Number(originalAudioVolume)) ? Number(originalAudioVolume) : 1));

        filterParts.push(
          `[${idx}:v]trim=start=${c.trimStart.toFixed(3)}:end=${c.trimEnd.toFixed(3)},setpts=PTS-STARTPTS,${transposePrefix}scale=${outW}:${outH}:force_original_aspect_ratio=increase,crop=${outW}:${outH},fps=30,format=yuv420p,setsar=1[vseg${idx}]`
        );

        if (!c.info.hasAudio || effVol <= 0.001) {
          filterParts.push(
            `anullsrc=channel_layout=stereo:sample_rate=44100,atrim=duration=${c.segDur.toFixed(3)},asetpts=PTS-STARTPTS[aseg${idx}]`
          );
        } else {
          filterParts.push(
            `[${idx}:a]atrim=start=${c.trimStart.toFixed(3)}:end=${c.trimEnd.toFixed(3)},asetpts=PTS-STARTPTS,aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${effVol.toFixed(3)}[aseg${idx}]`
          );
        }
      });

      const nClips = resolvedClips.length;
      const allClipsAtLeast1s = resolvedClips.every((c) => c.segDur >= 1.0);
      const hasInterClipTransition =
        nClips > 1 && resolvedClips.slice(0, nClips - 1).some((c) => c.transition !== 'none');

      let vCurLabel = 'vseg0';
      let aCurLabel = 'aseg0';
      let totalOutDur = resolvedClips[0].segDur;

      if (nClips === 1) {
        if (resolvedClips[0].transition === 'fade' && resolvedClips[0].segDur >= 1.0) {
          const fadeOutSt = Math.max(0.4, resolvedClips[0].segDur - 0.35);
          filterParts.push(
            `[vseg0]fade=t=in:st=0:d=0.35,fade=t=out:st=${fadeOutSt.toFixed(3)}:d=0.35[vjoined]`
          );
          vCurLabel = 'vjoined';
        }
      } else if (hasInterClipTransition && allClipsAtLeast1s) {
        let accDur = resolvedClips[0].segDur;
        for (let i = 1; i < nClips; i++) {
          const prevTrans = resolvedClips[i - 1].transition;
          const transDur = prevTrans === 'none' ? 0.04 : 0.4;
          const offset = Math.max(0.1, accDur - transDur);
          const xfadeType = prevTrans === 'slide' ? 'slideleft' : 'fade';
          const nextV = i === nClips - 1 ? 'vjoined' : `vx${i}`;
          const nextA = i === nClips - 1 ? 'ax_base' : `ax${i}`;

          filterParts.push(
            `[${vCurLabel}][vseg${i}]xfade=transition=${xfadeType}:duration=${transDur.toFixed(3)}:offset=${offset.toFixed(3)}[${nextV}]`
          );
          filterParts.push(
            `[${aCurLabel}][aseg${i}]acrossfade=d=${transDur.toFixed(3)}[${nextA}]`
          );

          vCurLabel = nextV;
          aCurLabel = nextA;
          accDur = offset + resolvedClips[i].segDur;
        }
        totalOutDur = accDur;
      } else {
        const concatInputs = resolvedClips.map((_, i) => `[vseg${i}][aseg${i}]`).join('');
        filterParts.push(`${concatInputs}concat=n=${nClips}:v=1:a=1[vjoined][ax_base]`);
        vCurLabel = 'vjoined';
        aCurLabel = 'ax_base';
        totalOutDur = resolvedClips.reduce((acc, c) => acc + c.segDur, 0);
      }

      // Timed Text Overlays (written safely to temp UTF-8 files to avoid shell/filter escaping issues)
      const validOverlays = Array.isArray(textOverlays)
        ? textOverlays.filter((ov: any) => typeof ov?.text === 'string' && ov.text.trim().length > 0)
        : [];

      if (validOverlays.length > 0) {
        const fontPath = pickSystemFontPath();
        const fontOption = fontPath ? `fontfile='${fontPath}':` : '';
        validOverlays.forEach((ov: any, idx: number) => {
          const txtFilePath = path.join(TEMP_RENDER_DIR, `txt_${cleanOutId}_${idx}.txt`);
          fs.writeFileSync(txtFilePath, String(ov.text).trim(), 'utf8');
          tempFilesToCleanup.push(txtFilePath);

          const start = Math.max(0, Number(ov.startSec) || 0);
          const end = Math.max(start + 0.3, Math.min(totalOutDur, Number(ov.endSec) || start + 3));
          const color = /^#[0-9a-fA-F]{6}$/.test(String(ov.color || '')) ? String(ov.color) : 'white';
          const px = ov.fontSize === 'sm' ? 24 : ov.fontSize === 'lg' ? 44 : 32;
          const yExpr =
            ov.position === 'top' ? '40' : ov.position === 'middle' ? '(h-text_h)/2' : 'h-text_h-48';

          const outLabel = idx === validOverlays.length - 1 ? 'vfinal' : `vtxt${idx}`;
          filterParts.push(
            `[${vCurLabel}]drawtext=${fontOption}textfile='${txtFilePath}':fontcolor=${color}:fontsize=${px}:box=1:boxcolor=black@0.65:boxborderw=12:x=(w-text_w)/2:y=${yExpr}:enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'[${outLabel}]`
          );
          vCurLabel = outLabel;
        });
      }

      // Mix Additional Voiceover / Music Tracks into Audio Output
      if (resolvedAudio.length > 0) {
        const mixInputs: string[] = [`[${aCurLabel}]`];
        resolvedAudio.forEach((aud, idx) => {
          const inputIdx = nClips + idx;
          const delayMs = Math.max(0, Math.round(aud.startOffsetSec * 1000));
          const lbl = `audmix${idx}`;
          filterParts.push(
            `[${inputIdx}:a]atrim=start=${aud.trimStart.toFixed(3)}:end=${aud.trimEnd.toFixed(3)},asetpts=PTS-STARTPTS,aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${aud.volume.toFixed(3)},adelay=${delayMs}|${delayMs},apad=whole_dur=${totalOutDur.toFixed(3)}[${lbl}]`
          );
          mixInputs.push(`[${lbl}]`);
        });
        filterParts.push(
          `${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=first:dropout_transition=0:normalize=0,atrim=duration=${totalOutDur.toFixed(3)}[afinal]`
        );
        aCurLabel = 'afinal';
      }

      const finalFilename = `${cleanOutId}.mp4`;
      const finalOutputPath = path.join(UPLOADS_DIR, finalFilename);

      ffmpegArgs.push(
        '-filter_complex', filterParts.join(';'),
        '-map', `[${vCurLabel}]`,
        '-map', `[${aCurLabel}]`,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '22',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '160k',
        '-movflags', '+faststart',
        '-t', totalOutDur.toFixed(3),
        finalOutputPath
      );

      await execFileAsync('ffmpeg', ffmpegArgs, { maxBuffer: 1024 * 1024 * 16 });

      if (!fs.existsSync(finalOutputPath) || fs.statSync(finalOutputPath).size === 0) {
        throw new Error('FFmpeg render completed without producing a valid output file.');
      }

      const distUploads = path.resolve(__dirname, 'dist/uploads/videos');
      if (fs.existsSync(distUploads)) {
        try {
          fs.copyFileSync(finalOutputPath, path.join(distUploads, finalFilename));
        } catch {
          // ignore
        }
      }

      const stat = fs.statSync(finalOutputPath);
      const streamUrl = `/api/videos/stream/${finalFilename}`;
      console.log(`[Studio Render] Rendered ${finalFilename} (${stat.size} bytes, ${totalOutDur.toFixed(2)}s)`);

      return res.json({
        success: true,
        id: cleanOutId,
        filename: finalFilename,
        url: streamUrl,
        size: stat.size,
        durationSec: Number(totalOutDur.toFixed(2)),
      });
    } catch (err: any) {
      console.error('[Studio Render] Error:', err?.stderr || err?.message || err);
      return res.status(500).json({
        error: err?.message || 'Failed to render video composition on server.',
      });
    } finally {
      tempFilesToCleanup.forEach((f) => {
        try {
          if (fs.existsSync(f)) fs.unlinkSync(f);
        } catch {
          // ignore cleanup failure
        }
      });
    }
  });

  // Social Crawler Preview Middleware for Link Sharing System (WhatsApp, Twitter/X, Facebook, Telegram, etc.)
  app.use(async (req, res, next) => {
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const isBot = /bot|facebookexternalhit|twitterbot|whatsapp|telegrambot|linkedinbot|slackbot|discordbot|googlebot/i.test(userAgent);

    if (isBot && (req.query.video || req.query.v || req.query.chef || req.query.user || req.query.recipe)) {
      const videoId = (req.query.video || req.query.v) as string;
      const chefId = req.query.chef as string;
      const userId = req.query.user as string;
      const recipeId = req.query.recipe as string;

      let title = 'DellyChow | Cooking & Recipe-Sharing Community';
      let description = 'Connect with chefs and food lovers worldwide. Discover artisan recipes and master video classes.';
      const image = 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80';
      const shareUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

      if (videoId) {
        title = `Watch Cooking Masterclass on DellyChow`;
        description = `Watch step-by-step culinary techniques and master kitchen skills on DellyChow.`;
      } else if (chefId) {
        title = `Master Chef Profile | DellyChow`;
        description = `Discover handcrafted recipes and culinary masterclasses on DellyChow.`;
      } else if (userId) {
        title = `Food Lover Culinary Profile | DellyChow`;
        description = `Explore culinary honors and favorite dishes on DellyChow.`;
      } else if (recipeId) {
        title = `Artisan Recipe | DellyChow`;
        description = `Discover detailed ingredients and cooking steps on DellyChow.`;
      }

      const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:url" content="${shareUrl}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <a href="${shareUrl}">Open on DellyChow</a>
</body>
</html>`;
      return res.status(200).send(html);
    }

    next();
  });

  // Ensure browsers never serve a stale Service Worker script from HTTP cache
  app.get('/sw.js', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // Mount Vite in development or serve static build in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        allowedHosts: true,
        hmr: false,
        ws: false,
        watch: process.env.DISABLE_HMR === 'true' ? null : undefined
      },
      appType: 'spa',
    });

    // Serve WebSocket-free @vite/client shim when HMR/WS is disabled in preview environments
    app.get('/@vite/client', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      return res.send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else {
    style.textContent = content;
  }
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url) { return url; }
export class ErrorOverlay {}
`);
    });

    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DellyChow Full-Stack Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
