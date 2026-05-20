/* ============================================================
   Service Worker - המעקב שלי
   גרסה: 1.3.0
   תפקיד: caching בסיסי + הצגת התראות יומיות
   
   שינויים בגרסה 1.3.0:
   - הסרת splash.mp4 מה-cache (הפיצ'ר הוסר לטובת פתיחה מהירה)
   - אייקונים חדשים (לוגו Health Mate החדש)
   - bumped cache name לאלץ עדכון מלא אצל המשתמשים
   ============================================================ */

const CACHE_NAME = 'nutrition-tracker-v1-3';
const CORE_FILES = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './icon-maskable-512.png',
    './sw.js'
];

// ===== Install =====
self.addEventListener('install', (event) => {
    console.log('[SW] Installing v1.3.0...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(CORE_FILES))
            .then(() => self.skipWaiting())
            .catch(err => console.warn('[SW] Cache failed:', err))
    );
});

// ===== Activate =====
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating v1.3.0... clearing old caches');
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
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.location.origin)) return;
    
    event.respondWith(
        fetch(event.request)
            .then(response => {
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
                for (const client of clientList) {
                    if ('focus' in client) return client.focus();
                }
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
