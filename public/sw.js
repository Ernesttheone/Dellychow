// DellyChow Progressive Web App Service Worker with Cache API Support
const CACHE_STATIC_NAME = 'dellychow-static-v1';
const CACHE_THUMBNAILS_NAME = 'dellychow-thumbnails-v1';
const CACHE_METADATA_NAME = 'dellychow-video-metadata-v1';

const STATIC_PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

// 1. Install Event: Precache Core App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE_URLS).catch((err) => {
        console.warn('Pre-caching partial notice:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up outdated caches
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_STATIC_NAME, CACHE_THUMBNAILS_NAME, CACHE_METADATA_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (!currentCaches.includes(name)) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Intelligent routing and Cache API handling
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip streaming video binary byte ranges (these are streamed live via Range headers)
  if (url.pathname.startsWith('/api/videos/stream/')) {
    return;
  }

  // Handle Thumbnail & Image Requests (Unsplash, static assets, images)
  const isImageRequest = 
    request.destination === 'image' || 
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif|ico)$/i) ||
    url.hostname.includes('unsplash.com') ||
    url.hostname.includes('cloudinary') ||
    url.pathname.includes('/uploads/');

  if (isImageRequest) {
    event.respondWith(
      caches.open(CACHE_THUMBNAILS_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          // Fetch fresh copy from network and update cache (Stale-While-Revalidate)
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              // Network failed (offline); fallback to cached response if available
              return cachedResponse;
            });

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Handle HTML Page Navigation
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Handle App Scripts & Styles
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch in background to update
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_STATIC_NAME).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_STATIC_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        }).catch(() => {
          // Offline fallback
          return caches.match(request);
        });
      })
    );
  }
});
