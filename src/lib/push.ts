// 웹 푸시 구독 — 클라이언트 헬퍼 (브라우저 전용)
//
// 흐름: 권한 요청 → SW registration.pushManager.subscribe(VAPID 공개키)
//       → 구독정보(endpoint/keys)를 Supabase(eyebody_push_subscriptions)에 저장.
// iOS는 홈화면 설치(standalone) PWA에서만 동작 → isPushSupported로 게이팅.

import { createClient } from './supabase/client'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

// base64url VAPID 공개키 → ArrayBuffer (applicationServerKey 형식)
// (ArrayBuffer로 직접 할당해 BufferSource 타입 요구를 만족시킨다)
function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const buffer = new ArrayBuffer(raw.length)
  const out = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return buffer
}

// 홈화면 설치(standalone) 여부 — iOS 웹푸시는 설치본에서만 가능
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari 전용 플래그
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

// 이 브라우저가 웹 푸시를 지원하는지 (+ VAPID 키 존재)
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    !!VAPID_PUBLIC_KEY
  )
}

export type PushState = 'unsupported' | 'denied' | 'granted-off' | 'granted-on' | 'default'

// 현재 구독 상태 — 토글 UI 렌더용
export async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (Notification.permission === 'granted') return sub ? 'granted-on' : 'granted-off'
  return 'default'
}

// 구독 시작: 권한 요청 → subscribe → DB 저장. 성공 시 true.
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) throw new Error('이 브라우저에서는 알림을 지원하지 않아요.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('알림 권한이 허용되지 않았어요.')

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBuffer(VAPID_PUBLIC_KEY),
    })
  }

  const json = sub.toJSON()
  const keys = json.keys || {}
  const sb = createClient()
  const { data: userData } = await sb.auth.getUser()
  const userId = userData.user?.id
  if (!userId) throw new Error('로그인이 필요해요.')

  // endpoint unique → 같은 기기 재구독 시 갱신
  const { error } = await sb
    .from('eyebody_push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        ua: navigator.userAgent.slice(0, 300),
      },
      { onConflict: 'endpoint' }
    )
  if (error) throw error
  return true
}

// 구독 해제: 브라우저 구독 취소 + DB에서 삭제
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe().catch(() => {})
  const sb = createClient()
  await sb.from('eyebody_push_subscriptions').delete().eq('endpoint', endpoint)
}
