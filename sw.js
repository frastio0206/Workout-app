const CACHE_NAME = 'workout-cache-v2';
const URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/192.jpg',
  './icons/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.8/hammer.min.js',
  'https://cdn.jsdelivr.net/npm/idb@8/build/umd.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

// Фоновая синхронизация
self.addEventListener('sync', event => {
  if (event.tag === 'workout-sync') {
    event.waitUntil(syncWorkouts());
  }
});

async function syncWorkouts() {
  try {
    const db = await idb.openDB('workout-offline-db', 1);
    const tx = db.transaction('pending', 'readwrite');
    const store = tx.objectStore('pending');
    let cursor = await store.openCursor();
    while (cursor) {
      const record = cursor.value;
      // Отправляем на сервер
      const response = await fetch('https://your-server.com/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record.data)
      });
      if (response.ok) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  } catch (e) {
    console.log('Sync failed, will retry later', e);
  }
}
