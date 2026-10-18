self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open('dilshan-store').then((cache) => {
            return cache.addAll(['/', '/admin-updates.html']);
        })
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
