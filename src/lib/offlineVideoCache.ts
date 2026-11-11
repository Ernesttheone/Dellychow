import { useState, useEffect } from 'react';
import { CookingVideo } from '../types';

export const CACHE_METADATA_NAME = 'dellychow-video-metadata-v1';
export const CACHE_THUMBNAILS_NAME = 'dellychow-thumbnails-v1';
const INDEX_STORAGE_KEY = 'dellychow_cached_videos_index';

/**
 * Hook to monitor online/offline network connectivity.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Saves video metadata into Cache API and localStorage index.
 * Also pre-caches the video thumbnail image into the Cache API for offline visual fidelity.
 */
export async function recordWatchedVideoOffline(video: CookingVideo): Promise<void> {
  if (!video || !video.id) return;

  try {
    // 1. Cache metadata in Browser Cache API
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const metaCache = await window.caches.open(CACHE_METADATA_NAME);
        const metaResponse = new Response(JSON.stringify(video), {
          headers: {
            'Content-Type': 'application/json',
            'X-Cached-At': new Date().toISOString()
          }
        });
        await metaCache.put(`/_offline_metadata/videos/${video.id}`, metaResponse);
      } catch (err) {
        console.warn('Cache API metadata save notice:', err);
      }

      // 2. Cache Thumbnail Image in Cache API
      const thumbUrl = video.thumbnailUrl;
      if (thumbUrl && !thumbUrl.startsWith('data:')) {
        try {
          const thumbCache = await window.caches.open(CACHE_THUMBNAILS_NAME);
          const thumbExists = await thumbCache.match(thumbUrl);
          if (!thumbExists) {
            // Fetch thumbnail and cache in background
            fetch(thumbUrl, { mode: 'cors' })
              .then(async (response) => {
                if (response && (response.status === 200 || response.type === 'opaque')) {
                  await thumbCache.put(thumbUrl, response.clone());
                }
              })
              .catch(() => {
                // Ignore cross-origin blocking or network errors silently
              });
          }
        } catch (err) {
          console.warn('Cache API thumbnail save notice:', err);
        }
      }
    }

    // 3. Keep rapid local index for offline instant retrieval
    try {
      const existingRaw = localStorage.getItem(INDEX_STORAGE_KEY);
      let list: CookingVideo[] = existingRaw ? JSON.parse(existingRaw) : [];
      // Remove previous entry if exists and prepend to front
      list = list.filter((v) => v.id !== video.id);
      list.unshift(video);
      // Keep up to 50 most recently watched videos offline
      if (list.length > 50) list = list.slice(0, 50);
      localStorage.setItem(INDEX_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore localStorage quota errors
    }
  } catch (e) {
    console.warn('Failed to record watched video offline:', e);
  }
}

/**
 * Retrieves all previously watched videos and metadata from Cache API and local index.
 */
export async function getWatchedVideosOffline(): Promise<CookingVideo[]> {
  const result: CookingVideo[] = [];
  const seenIds = new Set<string>();

  // 1. Check local index first for instantaneous response
  try {
    const raw = localStorage.getItem(INDEX_STORAGE_KEY);
    if (raw) {
      const parsed: CookingVideo[] = JSON.parse(raw);
      for (const v of parsed) {
        if (v && v.id && !seenIds.has(v.id)) {
          seenIds.add(v.id);
          result.push(v);
        }
      }
    }
  } catch {
    // ignore
  }

  // 2. Also query Cache API if available
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const metaCache = await window.caches.open(CACHE_METADATA_NAME);
      const keys = await metaCache.keys();
      for (const req of keys) {
        try {
          const res = await metaCache.match(req);
          if (res) {
            const data: CookingVideo = await res.json();
            if (data && data.id && !seenIds.has(data.id)) {
              seenIds.add(data.id);
              result.push(data);
            }
          }
        } catch {
          // ignore individual item parse failure
        }
      }
    } catch {
      // ignore
    }
  }

  return result;
}

/**
 * Checks whether a specific video thumbnail is currently cached offline.
 */
export async function isThumbnailCachedOffline(thumbnailUrl: string): Promise<boolean> {
  if (!thumbnailUrl || typeof window === 'undefined' || !('caches' in window)) {
    return false;
  }
  try {
    const cache = await window.caches.open(CACHE_THUMBNAILS_NAME);
    const match = await cache.match(thumbnailUrl);
    return Boolean(match);
  } catch {
    return false;
  }
}
