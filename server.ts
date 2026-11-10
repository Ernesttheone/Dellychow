import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

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

  // Raw body parser for video uploads (up to 300MB)
  app.use('/api/videos/upload', express.raw({ type: '*/*', limit: '300mb' }));

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
        const distUploads = path.resolve(__dirname, 'dist/uploads/videos');
        if (fs.existsSync(distUploads)) {
          try {
            fs.writeFileSync(path.join(distUploads, safeFilename), req.body);
          } catch {
            // ignore
          }
        }

        // Apply faststart so the moov atom is placed at the front for instantaneous browser streaming
        if (ext === '.mp4' || ext === '.mov' || ext === '.m4v') {
          try {
            const tmpFile = `${targetPath}.faststart.mp4`;
            execSync(`ffmpeg -y -i "${targetPath}" -c copy -movflags +faststart "${tmpFile}" 2>/dev/null && mv "${tmpFile}" "${targetPath}"`, { stdio: 'ignore' });
            if (fs.existsSync(distUploads)) {
              try {
                fs.copyFileSync(targetPath, path.join(distUploads, safeFilename));
              } catch {
                // ignore
              }
            }
          } catch {
            // keep original if faststart is not supported on this container
          }
        }
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

  // Serve static uploads
  app.use('/uploads/videos', express.static(UPLOADS_DIR));
  app.use('/public/uploads/videos', express.static(UPLOADS_DIR));

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
