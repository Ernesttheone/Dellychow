import { collection, doc, setDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Universal video storage and cross-device stream resolver.
 * Combines local IndexedDB high-speed caching with Firestore cloud binary chunk sync.
 * Ensures recorded and uploaded videos play reliably across ALL devices
 * (mobile phones, tablets, laptops, and desktop computers).
 */

const DB_NAME = 'DellyChowStorageDB';
const DB_VERSION = 1;
const STORE_NAME = 'videos';
const CHUNK_SIZE_BYTES = 512 * 1024; // 512 KB per chunk for reliable Firestore storage

interface StoredVideoRecord {
  id: string;
  blob: Blob;
  mimeType: string;
  filename?: string;
  sizeBytes: number;
  createdAt: string;
}

// In-memory cache of object URLs to avoid recreating them
const objectUrlCache = new Map<string, string>();

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported on this browser.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open video database.'));
  });
}

/**
 * Save a video blob (from device recording or native file upload) to IndexedDB storage.
 * Returns the storage protocol URL (e.g. dellychow-video://vid_123) and an active Blob URL.
 */
export async function saveVideoBlob(
  blob: Blob,
  filename?: string,
  onProgress?: (percent: number) => void
): Promise<{ id: string; storageUrl: string; blobUrl: string }> {
  const db = await openDatabase();
  const id = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  if (onProgress) onProgress(30);

  const record: StoredVideoRecord = {
    id,
    blob,
    mimeType: blob.type || 'video/mp4',
    filename,
    sizeBytes: blob.size,
    createdAt: new Date().toISOString()
  };

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(record);

    transaction.oncomplete = () => {
      if (onProgress) onProgress(80);
      resolve();
    };
    transaction.onerror = () => reject(transaction.error || new Error('Failed to save video to storage.'));
    request.onerror = () => reject(request.error || new Error('Failed to put video record.'));
  });

  const blobUrl = URL.createObjectURL(blob);
  objectUrlCache.set(id, blobUrl);
  objectUrlCache.set(`dellychow-video://${id}`, blobUrl);

  if (onProgress) onProgress(100);

  return {
    id,
    storageUrl: `dellychow-video://${id}`,
    blobUrl
  };
}

/**
 * Retrieve a stored video Blob by its ID.
 */
export async function getVideoBlob(id: string): Promise<Blob | null> {
  const cleanId = id.replace('dellychow-video://', '').split('?')[0];
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(cleanId);

    request.onsuccess = () => {
      const record = request.result as StoredVideoRecord | undefined;
      resolve(record ? record.blob : null);
    };
    request.onerror = () => reject(request.error || new Error('Failed to retrieve video.'));
  });
}

/**
 * Cache an assembled video Blob into the local device's IndexedDB.
 */
export async function saveVideoBlobLocally(
  id: string,
  blob: Blob,
  mimeType: string = 'video/mp4'
): Promise<void> {
  const dbInst = await openDatabase();
  const record: StoredVideoRecord = {
    id,
    blob,
    mimeType: mimeType || blob.type || 'video/mp4',
    sizeBytes: blob.size,
    createdAt: new Date().toISOString()
  };

  return new Promise<void>((resolve, reject) => {
    const transaction = dbInst.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Failed to cache video in IndexedDB.'));
    request.onerror = () => reject(request.error || new Error('Failed to put video record.'));
  });
}

/**
 * Convert a video Blob slice to Base64 string for Firestore chunk storage.
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      const base64 = res.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert Base64 string back to Uint8Array binary byte stream.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Upload video chunks into Firestore so ANY mobile, tablet, or desktop device can stream it.
 */
export async function uploadVideoChunksToFirestore(
  videoId: string,
  blob: Blob,
  onProgress?: (percent: number) => void
): Promise<number> {
  const totalChunks = Math.max(1, Math.ceil(blob.size / CHUNK_SIZE_BYTES));
  const mimeType = blob.type || 'video/mp4';

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE_BYTES;
    const end = Math.min(start + CHUNK_SIZE_BYTES, blob.size);
    const chunkBlob = blob.slice(start, end, mimeType);
    const base64Data = await blobToBase64(chunkBlob);

    const chunkDocRef = doc(db, 'videos', videoId, 'chunks', `chunk_${String(i).padStart(4, '0')}`);
    await setDoc(chunkDocRef, {
      chunkIndex: i,
      totalChunks,
      data: base64Data,
      mimeType,
      createdAt: new Date().toISOString()
    });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalChunks) * 100));
    }
  }

  return totalChunks;
}

/**
 * Upload video file or blob directly to the backend server.
 * Returns the permanent public stream URL that can be played by any food lover or guest on any device.
 */
export async function uploadVideoToServer(
  blob: Blob,
  filename: string,
  videoId: string,
  onProgress?: (percent: number) => void
): Promise<{ url: string; id: string; size: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/videos/upload');
    xhr.setRequestHeader('x-filename', filename);
    xhr.setRequestHeader('x-video-id', videoId);
    xhr.setRequestHeader('Content-Type', blob.type || 'video/mp4');

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          onProgress(pct);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve(res);
        } catch {
          resolve({ url: `/api/videos/stream/${videoId}.mp4`, id: videoId, size: blob.size });
        }
      } else {
        reject(new Error(`Server video upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during video upload'));
    xhr.send(blob);
  });
}

/**
 * Check if a stream URL exists on the server.
 */
export async function checkServerStreamExists(streamUrl: string): Promise<boolean> {
  try {
    const res = await fetch(streamUrl, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Automatically sync any videos stored in local device's IndexedDB to the server
 * so that food lovers and other users can immediately stream the published video.
 */
export async function syncPublishedVideosToServer(
  videos: Array<{ id: string; videoUrl: string; title?: string }>,
  onSynced?: (videoId: string, newUrl: string) => void
): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) return;

  for (const v of videos) {
    if (v.videoUrl && v.videoUrl.startsWith('dellychow-video://')) {
      const cleanId = v.videoUrl.replace('dellychow-video://', '').split('?')[0];
      try {
        const blob = await getVideoBlob(cleanId);
        if (blob && blob.size > 0) {
          const ext = blob.type.includes('webm') ? '.webm' : blob.type.includes('mov') ? '.mov' : '.mp4';
          const filename = `${cleanId}${ext}`;
          const res = await uploadVideoToServer(blob, filename, cleanId);
          if (res?.url) {
            console.log(`[Video Storage] Synced local video "${v.title || v.id}" to server:`, res.url);
            if (onSynced) {
              onSynced(v.id, res.url);
            }
          }
        }
      } catch (err) {
        console.warn(`[Video Storage] Auto-sync skipped for ${v.id}:`, err);
      }
    }
  }
}

/**
 * Resolve any video URL (http:, https:, /uploads/, /api/videos/stream/, dellychow-video://, blob:, data:)
 * to an immediately playable URL.
 */
export async function resolveVideoUrl(url: string, videoId?: string): Promise<string> {
  if (!url) return '';

  // Direct server stream or web URL (YouTube, Vimeo, MP4, /api/videos/stream/..., /uploads/...)
  if (!url.startsWith('dellychow-video://')) {
    return url;
  }

  // Parse custom storage URI: dellychow-video://vid_123?vid=XYZ
  const rawPath = url.replace('dellychow-video://', '');
  const [cleanId, queryString] = rawPath.split('?');
  const params = new URLSearchParams(queryString || '');
  const effectiveVideoId = videoId || params.get('vid') || cleanId;

  // 1. Check in-memory URL cache
  if (objectUrlCache.has(cleanId)) {
    return objectUrlCache.get(cleanId)!;
  }
  if (objectUrlCache.has(url)) {
    return objectUrlCache.get(url)!;
  }

  // 2. Check local device's IndexedDB (if the current user is the chef who recorded/uploaded on this browser)
  try {
    const localBlob = await getVideoBlob(cleanId);
    if (localBlob && localBlob.size > 0) {
      const blobUrl = URL.createObjectURL(localBlob);
      objectUrlCache.set(cleanId, blobUrl);

      // In background, ensure it is also saved to the server so food lovers on other devices can stream it
      const ext = localBlob.type.includes('webm') ? '.webm' : '.mp4';
      uploadVideoToServer(localBlob, `${cleanId}${ext}`, cleanId).catch(() => {});

      return blobUrl;
    }
  } catch (err) {
    console.warn('Local video lookup notice:', err);
  }

  // 3. Check if server stream is ready for this video ID
  const candidateStreamUrls = [
    `/api/videos/stream/${cleanId}.mp4`,
    `/api/videos/stream/${cleanId}.webm`,
    `/api/videos/stream/${effectiveVideoId}.mp4`,
    `/api/videos/stream/${effectiveVideoId}.webm`,
    `/uploads/videos/${cleanId}.mp4`,
    `/uploads/videos/${cleanId}.webm`
  ];

  for (const streamUrl of candidateStreamUrls) {
    const exists = await checkServerStreamExists(streamUrl);
    if (exists) {
      objectUrlCache.set(cleanId, streamUrl);
      return streamUrl;
    }
  }

  // 4. Cross-Device Cloud Retrieval: Fetch assembled chunks from Firestore if available
  if (effectiveVideoId) {
    try {
      const chunksRef = collection(db, 'videos', effectiveVideoId, 'chunks');
      const snap = await getDocs(query(chunksRef, orderBy('chunkIndex', 'asc')));

      if (!snap.empty) {
        const byteArrays: Uint8Array[] = [];
        let mimeType = 'video/mp4';

        snap.forEach((docSnap) => {
          const cData = docSnap.data();
          if (cData.mimeType) mimeType = cData.mimeType;
          if (cData.data) {
            byteArrays.push(base64ToUint8Array(cData.data));
          }
        });

        if (byteArrays.length > 0) {
          const assembledBlob = new Blob(byteArrays as BlobPart[], { type: mimeType });
          
          // Cache in local IndexedDB
          try {
            await saveVideoBlobLocally(cleanId, assembledBlob, mimeType);
          } catch {}

          // Upload to server stream in background
          const ext = mimeType.includes('webm') ? '.webm' : '.mp4';
          uploadVideoToServer(assembledBlob, `${cleanId}${ext}`, cleanId).catch(() => {});

          const blobUrl = URL.createObjectURL(assembledBlob);
          objectUrlCache.set(cleanId, blobUrl);
          return blobUrl;
        }
      }
    } catch (firestoreErr) {
      console.warn('Firestore video chunks retrieval notice:', firestoreErr);
    }
  }

  // Fallback candidate stream URL on the server
  return `/api/videos/stream/${cleanId}.mp4`;
}

/**
 * Extract video duration (in minutes) and a high-resolution snapshot thumbnail frame from a Blob.
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

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(tempUrl);
      reject(new Error('Video processing timed out. Please verify that the video format is supported.'));
    }, 12000);

    video.onloadedmetadata = () => {
      const durationSeconds = video.duration || 60;
      const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

      // Seek to 0.5 second or 20% of duration to capture a representative thumbnail
      const seekTime = Math.min(Math.max(0.2, durationSeconds * 0.15), 2.0);
      video.currentTime = seekTime;

      video.onseeked = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          const width = video.videoWidth || 640;
          const height = video.videoHeight || 360;

          // Limit thumbnail size to 640 max width for fast loading
          const maxDim = 640;
          let targetW = width;
          let targetH = height;
          if (width > maxDim) {
            targetH = Math.round((height * maxDim) / width);
            targetW = maxDim;
          }

          canvas.width = Math.max(1, targetW);
          canvas.height = Math.max(1, targetH);

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.82);
            URL.revokeObjectURL(tempUrl);
            resolve({ durationMinutes, thumbnailUrl });
            return;
          }

          URL.revokeObjectURL(tempUrl);
          resolve({ durationMinutes, thumbnailUrl: '' });
        } catch (err) {
          URL.revokeObjectURL(tempUrl);
          resolve({ durationMinutes, thumbnailUrl: '' });
        }
      };
    };

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(tempUrl);
      reject(new Error('Unable to read video file. Please check that the file is not corrupted.'));
    };
  });
}

/**
 * Backs up metadata for all stored video blobs in IndexedDB before deletion.
 */
export async function backupStoredVideos(): Promise<Array<{ id: string; sizeBytes: number; mimeType: string; filename?: string; createdAt: string }>> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const records = (request.result as StoredVideoRecord[]) || [];
      const metadata = records.map(r => ({
        id: r.id,
        sizeBytes: r.sizeBytes,
        mimeType: r.mimeType,
        filename: r.filename,
        createdAt: r.createdAt
      }));
      resolve(metadata);
    };
    request.onerror = () => reject(request.error || new Error('Failed to backup stored videos.'));
  });
}

/**
 * Permanently deletes all binary video Blobs from IndexedDB storage.
 * Revokes all cached object URLs.
 */
export async function clearAllStoredVideos(): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Count records before clearing
    const countReq = store.count();
    countReq.onsuccess = () => {
      const count = countReq.result || 0;
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        // Revoke all in-memory object URLs
        for (const url of objectUrlCache.values()) {
          try {
            URL.revokeObjectURL(url);
          } catch {}
        }
        objectUrlCache.clear();
        resolve(count);
      };
      clearReq.onerror = () => reject(clearReq.error || new Error('Failed to clear video storage store.'));
    };
    countReq.onerror = () => reject(countReq.error || new Error('Failed to count stored videos.'));
  });
}
