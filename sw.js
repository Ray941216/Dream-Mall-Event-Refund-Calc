// sw.js

const CACHE_NAME = 'msm-coupon-cache-v1';
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/app.js',
    '/sw.js',
    'https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js',
    'https://code.jquery.com/jquery-3.7.1.min.js',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon-180.png'
];

// 安裝階段：先快取所有必要資源
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(URLS_TO_CACHE);
        })
    );
});

// 啟用階段：刪除舊版快取
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
});

// 攔截所有 fetch 請求，優先從快取拿，若沒有再去網路抓
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedRes) => {
            if (cachedRes) {
                return cachedRes;
            }
            return fetch(event.request)
                .then((networkRes) => {
                    // 若是 GET 且成功，就把資源放進快取
                    if (event.request.method === 'GET' && networkRes && networkRes.ok) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, networkRes.clone());
                        });
                    }
                    return networkRes.clone();
                })
                .catch(() => {
                    // 離線且快取也沒，可自行回傳 fallback（這裡暫不實作）
                });
        })
    );
});
