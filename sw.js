/* ============================================================
   Huang Lab Tools — Service Worker
   改版重點：
   1. 相對路徑（GitHub Pages 在 /tools/ 子目錄也能用）
   2. HTML 用 network-first → 你一更新，使用者重開就是新版
   3. 圖片等靜態資源用 cache-first → 快、也能離線
   4. 每次改 CACHE_VERSION，舊快取自動清掉
   更新工具後：只要把下面的 v1 改成 v2（v3、v4…）再推上去即可。
   ============================================================ */

const CACHE_VERSION = 'huang-lab-v4';

// 用相對路徑（相對於 sw.js 所在的目錄），不要用開頭的 "/"
const PRECACHE_URLS = [
  './',
  './index.html',
  './timer.html',
  './dilution.html',
  './rodent_age.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

// 安裝：預先快取核心檔案
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())   // 新版 SW 立即接手，不用等所有分頁關閉
  );
});

// 啟用：刪掉舊版本快取
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())   // 立即控制已開啟的分頁
  );
});

// 抓取策略
self.addEventListener('fetch', event => {
  const req = event.request;

  // 只處理 GET；其他（POST 等）直接放行
  if (req.method !== 'GET') return;

  // HTML 頁面 → network-first：優先拿最新版，沒網路才用快取
  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // 其他靜態資源（圖示、CSS…）→ cache-first：快取有就用，沒有再抓並存起來
  event.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(req, copy));
        return res;
      }).catch(() => cached)
    )
  );
});
