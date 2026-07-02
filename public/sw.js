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

// ── 웹 푸시 ──────────────────────────────────────────────
// 서버(/api/push/cron)가 web-push로 보낸 payload(JSON)를 받아 알림을 띄운다.
self.addEventListener('push', e => {
  let data = {}
  try { data = e.data ? e.data.json() : {} } catch { data = { body: e.data && e.data.text() } }
  const title = data.title || '마이오노트'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'myonote',          // 같은 tag는 덮어써 알림 쌓임 방지
    data: { url: data.url || '/' },
  }
  e.waitUntil(self.registration.showNotification(title, options))
})

// 알림 클릭 → 해당 화면으로. 이미 열린 탭이 있으면 focus, 없으면 새로 연다.
self.addEventListener('notificationclick', e => {
  e.notification.close()
  const target = (e.notification.data && e.notification.data.url) || '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) { c.navigate(target); return c.focus() }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    })
  )
})
