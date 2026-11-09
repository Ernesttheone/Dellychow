/**
 * Deli Chow - Rebuilt Universal Video System Storage & Stream Service
 * 
 * Strict architectural rules:
 * 1. User uploaded videos are NEVER replaced or substituted by AI-generated videos or default streams.
 * 2. Uploads are streamed directly to persistent disk (/public/uploads/videos/) via /api/videos/upload.
 * 3. Video records store and stream exact public URLs (/api/videos/stream/:filename).
 * 4. Full support for MP4, WebM, and MOV codecs across iOS, Android, macOS, Windows, and Linux.
 */

export interface VideoUploadResult {
  success: boolean;
  id: string;
  filename: string;
  url: string;
  size: number;
}

export interface VideoValidationResult {
  valid: boolean;
  error?: string;
  detectedFormat?: string;
}

const MAX_VIDEO_SIZE_BYTES = 250 * 1024 * 1024; // 250 MB
const SUPPORTED_VIDEO_FORMATS = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];

/**
 * Validate video file format and size before upload.
 */
export function validateVideoFile(file: File): VideoValidationResult {
  if (!file) {
    return { valid: false, error: 'No video file selected.' };
  }

  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Video size (${sizeMb} MB) exceeds maximum allowed size of 250 MB. Please compress or select a shorter video.`
    };
  }

  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  const isSupportedType = SUPPORTED_VIDEO_FORMATS.some(f => type.includes(f));
  const isSupportedExt = name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.mov') || name.endsWith('.m4v');

  if (!isSupportedType && !isSupportedExt) {
    return {
      valid: false,
      error: 'Unsupported video format. Please upload an MP4, WebM, or QuickTime (MOV) video.'
    };
  }

  const detectedFormat = name.endsWith('.webm') || type.includes('webm') 
    ? 'WebM' 
    : name.endsWith('.mov') || type.includes('quicktime') 
    ? 'QuickTime (MOV)' 
    : 'MP4';

  return { valid: true, detectedFormat };
}

/**
 * Direct binary upload to the server streaming repository with live percentage progress tracking.
 */
export function uploadVideoToServer(
  blob: Blob,
  filename: string,
  videoId: string,
  onProgress?: (percent: number) => void
): Promise<VideoUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/videos/upload');
    xhr.setRequestHeader('x-filename', filename);
    xhr.setRequestHeader('x-video-id', videoId);
    xhr.setRequestHeader('Content-Type', blob.type || 'video/mp4');

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (onProgress) onProgress(100);
          resolve(response);
        } catch {
          const streamUrl = `/api/videos/stream/${videoId}.mp4`;
          if (onProgress) onProgress(100);
          resolve({
            success: true,
            id: videoId,
            filename: `${videoId}.mp4`,
            url: streamUrl,
            size: blob.size
          });
        }
      } else {
        reject(new Error(`Server rejected video upload with status HTTP ${xhr.status}. Please check your connection.`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during video transfer. Please verify server connection.'));
    };

    xhr.onabort = () => {
      reject(new Error('Video upload cancelled.'));
    };

    xhr.send(blob);
  });
}

/**
 * Extract exact video duration (in minutes) and high-resolution thumbnail from original video.
 */
export function extractVideoMetadataAndThumbnail(
  fileOrBlob: Blob
): Promise<{ durationMinutes: number; thumbnailUrl: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const tempUrl = URL.createObjectURL(fileOrBlob);
    video.src = tempUrl;

    const cleanup = () => {
      URL.revokeObjectURL(tempUrl);
      video.remove();
    };

    const timeout = setTimeout(() => {
      cleanup();
      // Graceful fallback with standard 10m duration if browser canvas extraction takes too long
      resolve({
        durationMinutes: 10,
        thumbnailUrl: ''
      });
    }, 15000);

    video.onloadedmetadata = () => {
      const durationSeconds = video.duration || 60;
      const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

      // Seek to 1 second into video (or 10% for short clips) to capture an active cooking frame
      video.currentTime = Math.min(1.0, durationSeconds * 0.1);
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
          const durationSeconds = video.duration || 60;
          const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
          cleanup();
          resolve({ durationMinutes, thumbnailUrl });
          return;
        }
      } catch (err) {
        console.warn('Canvas frame capture notice:', err);
      }

      cleanup();
      resolve({
        durationMinutes: Math.max(1, Math.round((video.duration || 60) / 60)),
        thumbnailUrl: ''
      });
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      resolve({
        durationMinutes: 10,
        thumbnailUrl: ''
      });
    };
  });
}

/**
 * Resolve any video URL into a direct, standard streaming URL.
 * NEVER substitutes an AI video or generic default video.
 */
export async function resolveVideoUrl(url: string, videoId?: string): Promise<string> {
  if (!url) return '';

  const cleanUrl = url.trim();

  // Direct standard URLs (HTTP, HTTPS, direct stream, blobs)
  if (
    cleanUrl.startsWith('http://') ||
    cleanUrl.startsWith('https://') ||
    cleanUrl.startsWith('/api/videos/stream/') ||
    cleanUrl.startsWith('/uploads/') ||
    cleanUrl.startsWith('blob:') ||
    cleanUrl.startsWith('data:')
  ) {
    return cleanUrl;
  }

  // Normalize legacy dellychow-video:// protocol to direct server streaming path
  if (cleanUrl.startsWith('dellychow-video://')) {
    const rawPath = cleanUrl.replace('dellychow-video://', '');
    const [cleanId, queryString] = rawPath.split('?');
    const params = new URLSearchParams(queryString || '');
    const effectiveId = cleanId || videoId || params.get('vid') || 'video';
    return `/api/videos/stream/${effectiveId}.mp4`;
  }

  // If passed an ID directly, map to stream endpoint
  if (/^[a-zA-Z0-9_-]+$/.test(cleanUrl)) {
    return `/api/videos/stream/${cleanUrl}.mp4`;
  }

  return cleanUrl;
}

/**
 * Check if a server stream exists.
 */
export async function checkServerStreamExists(streamUrl: string): Promise<boolean> {
  if (!streamUrl || streamUrl.startsWith('blob:') || streamUrl.startsWith('data:')) return true;
  try {
    const res = await fetch(streamUrl, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Sync legacy video records to standard server URLs so all users and food lovers can play them directly.
 */
export async function syncPublishedVideosToServer(
  videos: Array<{ id: string; videoUrl: string; title?: string }>,
  onSynced?: (videoId: string, newUrl: string) => void
): Promise<void> {
  for (const v of videos) {
    if (v.videoUrl && v.videoUrl.startsWith('dellychow-video://')) {
      const cleanId = v.videoUrl.replace('dellychow-video://', '').split('?')[0];
      const newUrl = `/api/videos/stream/${cleanId}.mp4`;
      if (onSynced) {
        onSynced(v.id, newUrl);
      }
    }
  }
}

// Backwards-compatible stubs for older components
export async function saveVideoBlob(
  blob: Blob,
  filename?: string
): Promise<{ id: string; storageUrl: string; blobUrl: string }> {
  const id = `vid_${Date.now()}`;
  const blobUrl = URL.createObjectURL(blob);
  return {
    id,
    storageUrl: `/api/videos/stream/${id}.mp4`,
    blobUrl
  };
}

export async function getVideoBlob(_id: string): Promise<Blob | null> {
  return null;
}

export async function uploadVideoChunksToFirestore(_videoId: string, _blob: Blob): Promise<number> {
  return 0;
}

export async function backupStoredVideos(): Promise<any[]> {
  return [];
}

export async function clearAllStoredVideos(): Promise<{ clearedCount: number }> {
  return { clearedCount: 0 };
}

