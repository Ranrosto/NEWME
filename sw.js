/* ============================================================
   Service Worker - המעקב שלי
   גרסה: 1.0.0
   תפקיד: caching בסיסי + הצגת התראות יומיות
   ============================================================ */

const CACHE_NAME = 'nutrition-tracker-v1';
const CORE_FILES = ['./', './index.html', './manifest.json'];

// ===== Install =====
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(CORE_FILES))
            .then(() => self.skipWaiting())
            .catch(err => console.warn('[SW] Cache failed:', err))
    );
});

// ===== Activate =====
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then(keys => 
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// ===== Fetch - network first, fallback to cache =====
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.location.origin)) return;
    
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Cache successful responses
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    }).catch(() => {});
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

// ===== Notification click - open the app =====
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // If app already open, focus it
                for (const client of clientList) {
                    if ('focus' in client) return client.focus();
                }
                // Otherwise open it
                if (clients.openWindow) return clients.openWindow('./');
            })
    );
});

// ===== Message from app - show notification =====
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, tag } = event.data;
        self.registration.showNotification(title || 'המעקב שלי', {
            body: body || '',
            tag: tag || 'daily-goals',
            icon: 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 192 192\'><rect width=\'192\' height=\'192\' rx=\'42\' fill=\'%23A9D39E\'/><text x=\'96\' y=\'138\' font-family=\'serif\' font-size=\'118\' font-weight=\'900\' fill=\'%23CEA2FD\' text-anchor=\'middle\'>ר</text></svg>',
            badge: 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 96 96\'><rect width=\'96\' height=\'96\' rx=\'24\' fill=\'%236b9c5e\'/></svg>',
            lang: 'he',
            dir: 'rtl',
            requireInteraction: false,
            vibrate: [200, 100, 200]
        });
    }
});
