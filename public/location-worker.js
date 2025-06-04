// Cache name for the app
const CACHE_NAME = 'btcmaps-location-cache-v1';

// Install event - cache necessary files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json'
      ]);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle periodic background sync for location updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'location-update') {
    event.waitUntil(updateLocation());
  }
});

// Handle background fetch
self.addEventListener('fetch', (event) => {
  // Only handle location update requests
  if (event.request.url.includes('location-update')) {
    event.respondWith(
      new Response(JSON.stringify({ status: 'Background location service active' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
  }
});

// Keep the service worker alive and maintain wake lock
let wakeLockInterval;

self.addEventListener('message', (event) => {
  if (event.data === 'keepalive') {
    // Respond to keep-alive ping
    event.waitUntil(
      Promise.resolve().then(() => {
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage('alive');
          });
        });
      })
    );

    // Set up periodic wake lock refresh
    if (!wakeLockInterval) {
      wakeLockInterval = setInterval(() => {
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage('refresh_wakelock');
          });
        });
      }, 50000); // Refresh every 50 seconds
    }
  }
});

// Clean up on service worker termination
self.addEventListener('beforeunload', () => {
  if (wakeLockInterval) {
    clearInterval(wakeLockInterval);
  }
}); 