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
    // 오른쪽 큰 아이콘 — 병원 로고가 있으면 그걸 쓴다. 왼쪽 작은 아이콘은 안드로이드가
    // 설치된 앱 아이콘으로 그리는 자리라 없앨 수 없으니, 왼쪽=앱 / 오른쪽=병원으로 나눈다.
    // icon을 아예 비우면 앱 이름 첫 글자로 모노그램("M")이 대신 그려진다.
    icon: data.icon || '/icon-192.png',
    // badge는 알파 채널만 써서 단색 실루엣으로 그린다. 배경이 꽉 찬 icon-192를 쓰면
    // 상태바에 통짜 네모가 뜬다 — 투명 배경에 흰 글리프인 전용 이미지를 쓴다.
    badge: '/badge-96.png',
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
