/* SOLO SUITS — service worker (offline-first, works on any GitHub user/repo: all paths are relative) */
const VERSION = 'solo-shell-v1.0.0';
const RUNTIME = 'solo-runtime-v1';

const SHELL = [
  './',
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'site-data.json',
  'admin.html',
  'admin.js',
  'assets/images/logo-dark.png',
  'assets/images/logo-light.png',
  'assets/images/banner.jpg',
  'assets/images/icon-192.png',
  'assets/images/icon-512.png',
  'assets/images/favicon.png',
  'assets/images/splash-poster.jpg',
  'assets/images/splash.mp4'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // one by one, so a missing file never breaks the whole install
    await Promise.all(SHELL.map((u) => cache.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if (k.startsWith('solo-shell-') && k !== VERSION) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (err) => { clearTimeout(t); reject(err); });
  });
}

async function networkFirst(req, fallbackUrl) {
  const cache = await caches.open(VERSION);
  try {
    const res = await withTimeout(fetch(req, { cache: 'no-cache' }), 5000);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = (await cache.match(req, { ignoreSearch: true })) || (fallbackUrl && (await cache.match(fallbackUrl)));
    if (hit) return hit;
    return new Response('offline', { status: 503, statusText: 'offline' });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req, { ignoreSearch: true });
  const refresh = fetch(req).then((res) => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return hit || (await refresh) || new Response('', { status: 504 });
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req.url);
  if (hit) return hit;
  try {
    const sameOrigin = new URL(req.url).origin === self.location.origin;
    // cross-origin: ask with CORS so the cached copy has a real (small) size instead of an opaque one
    const res = await fetch(sameOrigin ? req : new Request(req.url, { mode: 'cors', credentials: 'omit' }));
    if (res && res.ok) cache.put(req.url, res.clone());
    return res;
  } catch (err) {
    try { return await fetch(req); } catch (e2) { return new Response('', { status: 504 }); }
  }
}

// Safari/iOS asks for video in byte ranges; answer them from the cached full file
async function rangeResponse(req) {
  const hit = await caches.match(req.url, { ignoreSearch: true });
  if (!hit) return fetch(req);
  const buf = await hit.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  let start = m && m[1] ? parseInt(m[1], 10) : 0;
  let end = m && m[2] ? parseInt(m[2], 10) : buf.byteLength - 1;
  if (end >= buf.byteLength) end = buf.byteLength - 1;
  if (start > end) start = 0;
  const slice = buf.slice(start, end + 1);
  return new Response(slice, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': hit.headers.get('Content-Type') || 'video/mp4',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + buf.byteLength,
      'Content-Length': String(slice.byteLength),
      'Accept-Ranges': 'bytes'
    }
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.hostname === 'api.github.com') return; // admin dashboard talks to GitHub live

  const same = url.origin === self.location.origin;

  if (same && req.headers.has('range')) { e.respondWith(rangeResponse(req)); return; }
  if (req.mode === 'navigate') { e.respondWith(networkFirst(req, 'index.html')); return; }
  if (same && url.pathname.endsWith('/site-data.json')) { e.respondWith(networkFirst(req)); return; }
  if (same && url.pathname.indexOf('/assets/uploads/') !== -1) { e.respondWith(cacheFirst(req, RUNTIME)); return; }
  if (same) { e.respondWith(staleWhileRevalidate(req)); return; }
  e.respondWith(cacheFirst(req, RUNTIME)); // fonts + Unsplash images
});

// the page sends every image URL it knows about, so the store also opens fully offline
self.addEventListener('message', (e) => {
  const msg = e.data || {};
  if (msg.type !== 'CACHE_URLS' || !Array.isArray(msg.urls)) return;
  e.waitUntil((async () => {
    const cache = await caches.open(RUNTIME);
    const queue = msg.urls.slice();
    const worker = async () => {
      while (queue.length) {
        const u = queue.shift();
        try {
          if (await cache.match(u)) continue;
          const abs = new URL(u, self.location.href);
          const same = abs.origin === self.location.origin;
          const res = await fetch(same ? abs.href : new Request(abs.href, { mode: 'cors', credentials: 'omit' }));
          if (res && res.ok) await cache.put(abs.href, res);
        } catch (err) { /* ignore single failures */ }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  })());
});
