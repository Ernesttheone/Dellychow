import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const UPLOADS_DIR = path.resolve(__dirname, 'public/uploads/videos');

  // Ensure uploads directory exists
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // Raw body parser for video uploads (up to 200MB)
  app.use('/api/videos/upload', express.raw({ type: '*/*', limit: '200mb' }));

  // Video Upload API
  app.post('/api/videos/upload', (req, res) => {
    try {
      const filename = (req.headers['x-filename'] as string) || `video_${Date.now()}.mp4`;
      const videoId = (req.headers['x-video-id'] as string) || `vid_${Date.now()}`;
      
      let ext = path.extname(filename);
      if (!ext) {
        const contentType = req.headers['content-type'] || '';
        ext = contentType.includes('webm') ? '.webm' : contentType.includes('mov') ? '.mov' : '.mp4';
      }

      const safeFilename = `${videoId}${ext}`;
      const targetPath = path.join(UPLOADS_DIR, safeFilename);

      if (Buffer.isBuffer(req.body) && req.body.length > 0) {
        fs.writeFileSync(targetPath, req.body);
      } else {
        return res.status(400).json({ error: 'No video binary received or body is empty' });
      }

      const streamUrl = `/api/videos/stream/${safeFilename}`;
      console.log(`[Video Storage] Successfully stored ${safeFilename} (${req.body.length} bytes) -> ${streamUrl}`);

      return res.json({
        success: true,
        id: videoId,
        filename: safeFilename,
        url: streamUrl,
        size: req.body.length
      });
    } catch (err: any) {
      console.error('[Video Storage] Upload error:', err);
      return res.status(500).json({ error: err.message || 'Failed to save video file' });
    }
  });

  // Check if a video stream exists on server
  app.head('/api/videos/stream/:filename', (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(UPLOADS_DIR, filename);

    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Accept-Ranges', 'bytes');
      return res.status(200).end();
    }
    return res.status(404).end();
  });

  // Stream video with HTTP Range Requests (smooth seeking, iOS/Safari/Android/Desktop support)
  app.get('/api/videos/stream/:filename', (req, res) => {
    const filename = path.basename(req.params.filename);
    let filePath = path.join(UPLOADS_DIR, filename);

    // If extension wasn't specified, look for matching video file
    if (!fs.existsSync(filePath)) {
      const candidates = ['.mp4', '.webm', '.mov', '.m4v'];
      for (const c of candidates) {
        const testPath = path.join(UPLOADS_DIR, `${filename}${c}`);
        if (fs.existsSync(testPath)) {
          filePath = testPath;
          break;
        }
      }
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video stream not found' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.webm' 
      ? 'video/webm' 
      : ext === '.mov' 
      ? 'video/quicktime' 
      : 'video/mp4';

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType,
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  });

  // Serve static uploads
  app.use('/uploads/videos', express.static(UPLOADS_DIR));

  // Mount Vite in development or serve static build in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {}
      },
      appType: 'spa',
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
