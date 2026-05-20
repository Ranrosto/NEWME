/* ============================================================
   Service Worker - המעקב שלי
   גרסה: 1.2.0
   תפקיד: caching בסיסי + הצגת התראות יומיות
   
   שינויים בגרסה 1.2.0:
   - שדרוג splash screen: inline CSS + preload + early init
   - background_color ב-manifest שונה ללבן צרוף (#ffffff)
   - bumped cache name לאלץ עדכון אצל המשתמשים
   ============================================================ */

const CACHE_NAME = 'nutrition-tracker-v1-2';
const CORE_FILES = [
    './',
    './index.html',
    './manifest.json',
    './splash.mp4',
    './icon-192.png',
    './icon-512.png',
    './icon-maskable-512.png',
    './sw.js'
];

// ===== Install =====
self.addEventListener('install', (event) => {
    console.log('[SW] Installing v1.2.0...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(CORE_FILES))
            .then(() => self.skipWaiting())
            .catch(err => console.warn('[SW] Cache failed:', err))
    );
});

// ===== Activate =====
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating v1.2.0... clearing old caches');
    event.waitUntil(
        caches.keys().then(keys => 
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => {
                    console.log('[SW] Deleting old cache:', k);
                    return caches.delete(k);
                })
            )
        ).then(() => self.clients.claim())
    );
});

// ===== Fetch - network first, fallback to cache =====
// Network-first means users always get latest files when online,
// and fallback to cache when offline (essential for PWA reliability).
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
            icon: 'icon-192.png',
            badge: 'icon-192.png',
            lang: 'he',
            dir: 'rtl',
            requireInteraction: false,
            vibrate: [200, 100, 200]
        });
    }
});
