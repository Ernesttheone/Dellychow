/**
 * Service Worker Registration for DellyChow Progressive Web App
 */
export function registerServiceWorker(): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then((registration) => {
          registration.update().catch(() => {});
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.info('DellyChow updated content available in offline cache.');
                  } else {
                    console.info('DellyChow is now cached for offline viewing.');
                  }
                }
              };
            }
          };
        })
        .catch((error) => {
          console.warn('Service Worker registration skipped or failed:', error);
        });
    });
  }
}
