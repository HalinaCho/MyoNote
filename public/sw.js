const CACHE = 'myonote-v2'
const BASE = ''

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Supabase API: 항상 네트워크
  if (url.hostname.includes('supabase.co')) return

  // Next.js 정적 청크 (콘텐츠 해시 → 영구 캐시)
  if (url.pathname.startsWith(`${BASE}/_next/static/`)) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, copy))
        return res
      }))
    )
    return
  }

  // 앱 페이지: 네트워크 우선, 실패 시 캐시 폴백
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, copy))
          return res
        })
        .catch(() => caches.match(e.request))
    )
  }
})
