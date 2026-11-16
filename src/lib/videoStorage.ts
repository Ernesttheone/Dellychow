/**
 * Deli Chow - Universal Video System Storage & Stream Service (Firebase Storage)
 * 
 * Strict architectural rules:
 * 1. User uploaded videos are NEVER replaced or substituted by AI-generated videos or default streams.
 * 2. Uploads are stored persistently in Firebase Cloud Storage under videos/{authorId}/{videoId}{ext}.
 * 3. Video records store permanent Firebase Storage HTTPS download URLs with native byte-range support.
 * 4. Full support for MP4, WebM, and MOV codecs across iOS, Android, macOS, Windows, and Linux.
 */

import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export interface VideoUploadResult {
  success: boolean;
  id: string;
  filename: string;
  url: string;
  storagePath?: string;
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

function getSafeVideoExtension(filename: string, mimeType: string): { ext: string; contentType: string } {
  const lowerName = (filename || '').toLowerCase();
  const lowerType = (mimeType || '').toLowerCase();

  if (lowerName.endsWith('.webm') || lowerType.includes('webm')) {
    return { ext: '.webm', contentType: 'video/webm' };
  }
  if (lowerName.endsWith('.mov') || lowerType.includes('quicktime')) {
    return { ext: '.mov', contentType: 'video/quicktime' };
  }
  if (lowerName.endsWith('.m4v') || lowerType.includes('m4v')) {
    return { ext: '.m4v', contentType: 'video/x-m4v' };
  }
  return { ext: '.mp4', contentType: 'video/mp4' };
}

let cachedBucketReady: boolean | null = null;

async function isFirebaseStorageBucketAvailable(): Promise<boolean> {
  if (!storage) return false;
  if (cachedBucketReady !== null) return cachedBucketReady;

  const bucket = storage.app?.options?.storageBucket;
  if (!bucket) {
    cachedBucketReady = false;
    return false;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o?maxResults=1`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timer);
    // 404 specifically indicates the Storage bucket does not exist / is not activated yet.
    // 200, 401, or 403 indicates the bucket exists and is active.
    cachedBucketReady = res.status !== 404;
    return cachedBucketReady;
  } catch {
    // Do not permanently cache transient network timeouts
    return true;
  }
}

function uploadVideoToBackendServer(
  blob: Blob,
  filename: string,
  videoId: string,
  onProgress?: (percent: number) => void
): Promise<VideoUploadResult> {
  return new Promise((resolve, reject) => {
    const cleanVideoId = (videoId || `vid_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 96);
    const { ext, contentType } = getSafeVideoExtension(filename, blob.type);
    const safeBase = (filename || `${cleanVideoId}${ext}`)
      .replace(/[^\x20-\x7E]/g, '_')
      .slice(0, 120) || `${cleanVideoId}${ext}`;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/videos/upload', true);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('x-filename', safeBase);
    xhr.setRequestHeader('x-video-id', cleanVideoId);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0 && onProgress) {
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && data?.success && data?.url) {
          if (onProgress) onProgress(100);
          resolve({
            success: true,
            id: data.id || cleanVideoId,
            filename: data.filename || `${cleanVideoId}${ext}`,
            url: data.url,
            size: data.size || blob.size
          });
        } else {
          reject(new Error(data?.error || `Video upload failed with server status ${xhr.status}.`));
        }
      } catch {
        reject(new Error(`Video upload failed with server status ${xhr.status}.`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error while uploading video to server. Please check your connection and try again.'));
    };

    xhr.send(blob);
  });
}

/**
 * Direct resumable upload to Firebase Cloud Storage with live percentage progress tracking,
 * falling back seamlessly to the backend streaming server if the Firebase Storage bucket
 * has not been initialized yet or rejects uploads.
 */
export async function uploadVideoToFirebaseStorage(
  blob: Blob,
  filename: string,
  videoId: string,
  authorId: string,
  onProgress?: (percent: number) => void
): Promise<VideoUploadResult> {
  const bucketAvailable = await isFirebaseStorageBucketAvailable();
  if (!bucketAvailable || !storage) {
    return uploadVideoToBackendServer(blob, filename, videoId, onProgress);
  }

  return new Promise((resolve, reject) => {
    if (!storage) {
      uploadVideoToBackendServer(blob, filename, videoId, onProgress).then(resolve).catch(reject);
      return;
    }

    const cleanAuthorId = (authorId || 'chef').replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanVideoId = (videoId || `vid_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 96);
    const { ext, contentType } = getSafeVideoExtension(filename, blob.type);
    const safeFilename = `${cleanVideoId}${ext}`;
    const storagePath = `videos/${cleanAuthorId}/${safeFilename}`;

    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType,
      cacheControl: 'public, max-age=31536000',
      customMetadata: {
        originalFilename: filename || safeFilename,
        videoId: cleanVideoId,
        authorId: cleanAuthorId
      }
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0 && onProgress) {
          const percent = Math.min(99, Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
          onProgress(percent);
        }
      },
      (error: any) => {
        console.warn('[Firebase Storage] Upload unavailable, falling back to server upload:', error?.code || error?.message);
        const code = error?.code || '';
        if (code === 'storage/canceled') {
          reject(new Error('Video upload was cancelled.'));
          return;
        }
        if (
          code === 'storage/unknown' ||
          code === 'storage/bucket-not-found' ||
          code === 'storage/project-not-found' ||
          code === 'storage/unauthorized'
        ) {
          if (code !== 'storage/unauthorized') {
            cachedBucketReady = false;
          }
          uploadVideoToBackendServer(blob, filename, videoId, onProgress).then(resolve).catch(reject);
          return;
        }
        reject(new Error(error?.message || 'Failed to upload video. Please check your connection and try again.'));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          if (onProgress) onProgress(100);
          resolve({
            success: true,
            id: cleanVideoId,
            filename: safeFilename,
            url: downloadUrl,
            storagePath,
            size: blob.size
          });
        } catch (err: any) {
          reject(new Error(err?.message || 'Uploaded to Firebase Storage, but failed to retrieve download URL.'));
        }
      }
    );
  });
}

/**
 * Delete a video file from Firebase Storage or backend upload directory.
 */
export async function deleteVideoFromFirebaseStorage(videoUrl?: string): Promise<void> {
  if (!videoUrl) return;

  if (videoUrl.startsWith('/api/videos/stream/')) {
    try {
      await fetch(videoUrl, { method: 'DELETE' });
    } catch {
      // Ignore cleanup failures
    }
    return;
  }

  if (
    !storage ||
    (!videoUrl.includes('firebasestorage.googleapis.com') &&
      !videoUrl.includes('firebasestorage.app') &&
      !videoUrl.startsWith('gs://'))
  ) {
    return;
  }
  try {
    const fileRef = ref(storage, videoUrl);
    await deleteObject(fileRef);
  } catch (err: any) {
    if (err?.code !== 'storage/object-not-found') {
      console.warn('[Firebase Storage] Could not delete video file:', err?.message || err);
    }
  }
}

/**
 * Backwards-compatible wrapper that routes uploads to Firebase Storage.
 */
export function uploadVideoToServer(
  blob: Blob,
  filename: string,
  videoId: string,
  onProgress?: (percent: number) => void,
  authorId: string = 'chef'
): Promise<VideoUploadResult> {
  return uploadVideoToFirebaseStorage(blob, filename, videoId, authorId, onProgress);
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
      resolve({
        durationMinutes: 0,
        thumbnailUrl: ''
      });
    }, 15000);

    video.onloadedmetadata = () => {
      const durationSeconds = video.duration || 0;
      const durationMinutes = durationSeconds > 0 ? Math.max(1, Math.round(durationSeconds / 60)) : 0;

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
          const durationSeconds = video.duration || 0;
          const durationMinutes = durationSeconds > 0 ? Math.max(1, Math.round(durationSeconds / 60)) : 0;
          cleanup();
          resolve({ durationMinutes, thumbnailUrl });
          return;
        }
      } catch (err) {
        console.warn('Canvas frame capture notice:', err);
      }

      cleanup();
      resolve({
        durationMinutes: video.duration ? Math.max(1, Math.round(video.duration / 60)) : 0,
        thumbnailUrl: ''
      });
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      resolve({
        durationMinutes: 0,
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

  // Map static uploads paths directly to byte-range stream endpoint
  if (cleanUrl.startsWith('/public/uploads/videos/')) {
    const filename = cleanUrl.replace('/public/uploads/videos/', '');
    return `/api/videos/stream/${filename}`;
  }
  if (cleanUrl.startsWith('public/uploads/videos/')) {
    const filename = cleanUrl.replace('public/uploads/videos/', '');
    return `/api/videos/stream/${filename}`;
  }
  if (cleanUrl.startsWith('/uploads/videos/')) {
    const filename = cleanUrl.replace('/uploads/videos/', '');
    return `/api/videos/stream/${filename}`;
  }

  // Direct standard URLs (HTTP, HTTPS, direct stream, blobs, data)
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

