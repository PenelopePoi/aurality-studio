const CACHE_NAME = 'aurality-studio-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/aurality.css',
  '/js/app.js',
  '/js/audio-engine.js',
  '/js/deck.js',
  '/js/mixer.js',
  '/js/midi.js',
  '/js/effects.js',
  '/js/library.js',
  '/js/waveform.js',
  '/js/visualizer.js',
  '/js/ai-assist.js',
  '/js/recorder.js',
  '/js/stem-separator.js',
  '/js/practice-mode.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
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
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetched = fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
