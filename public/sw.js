const CACHE_NAME = 'track-sync-stream-v1';

// Εγκατάσταση του Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Ενεργεργοποίηση και καθαρισμός παλιών caches
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
  self.clients.claim();
});

//Service Worker (Fetch & Stream Caching για μεγάλα αρχεία)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Αν ζητάμε αρχείο ήχου (από Jamendo ή APIs μουσικής)
  if (url.pathname.includes('/download') || url.destination === 'audio' || url.href.includes('api.jamendo.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        
        //Offline-First
        const cachedResponse = await cache.match(event.request);
        
        if (cachedResponse) {
          // Αν υπάρχει στη μνήμη, το επιστρέφουμε αμέσως (Offline-First)
          return cachedResponse;
        }

        try {
          // Αλλιώς το ζητάμε από το δίκτυο και το αποθηκεύουμε έξυπνα
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          // Αν πέσει το ίντερνετ και δεν υπάρχει στη cache, επιστρέφουμε fallback
          return new Response('Network error & no cached audio available', { status: 404, statusText: 'Offline' });
        }
      })
    );
  }
});
// Background Sync: Αυτόματος συγχρονισμός όταν επανέλθει το δίκτυο
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(syncDataWithServer());
  }
});

async function syncDataWithServer() {
  // Εδώ η εφαρμογή μπορεί να διαβάσει τυχόν αποθηκευμένες ενέργειες 
  // από την IndexedDB και να τις στείλει στον REST server.
  console.log('Background Sync triggered: Network is back, syncing data...');
}