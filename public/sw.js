// DellyChow Progressive Web App Service Worker with Cache API Support
const CACHE_STATIC_NAME = 'dellychow-static-v2';
const CACHE_THUMBNAILS_NAME = 'dellychow-thumbnails-v1';
const CACHE_METADATA_NAME = 'dellychow-video-metadata-v1';

const STATIC_PRECACHE_URLS = [
  '/manifest.json',
  '/icon.svg'
];

// 1. Install Event: Precache Static Shell Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE_URLS).catch((err) => {
        console.warn('Pre-caching partial notice:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up outdated caches (including dellychow-static-v1)
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

// 3. Fetch Event: Network-first for app scripts/HTML, never cache Vite dev modules
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip streaming video binary ranges, API endpoints, and Vite dev server / source modules
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/@') ||
    url.pathname === '/sw.js' ||
    url.search.includes('v=') ||
    url.search.includes('t=') ||
    url.search.includes('import')
  ) {
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
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Handle HTML Page Navigation (Network-First)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Handle Production App Assets (Network-First so fresh updates always apply immediately)
  if (url.origin === location.origin) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_STATIC_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
  }
});
