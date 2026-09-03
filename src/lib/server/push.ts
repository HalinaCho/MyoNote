// 서버측 웹푸시 발송 공용 로직 — pg_cron 예약 알림(/api/push/cron)과
// 신규 검사결과 알림(/api/exam-notify)이 공유. Node 런타임 전용(web-push가 Node crypto 필요).

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export function configureWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
}

export interface SubRow { user_id: string; endpoint: string; p256dh: string; auth: string }
// icon: 알림 오른쪽 큰 아이콘 URL(병원 로고). 없으면 서비스워커가 앱 아이콘으로 떨어진다.
export interface PushPayload { title: string; body: string; url: string; tag: string; icon?: string }

export async function fetchSubscriptions(
  sb: ReturnType<typeof getServiceClient>, userIds: string[]
): Promise<SubRow[]> {
  if (!userIds.length) return []
  const { data } = await sb
    .from('eyebody_push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', userIds)
  return (data ?? []) as SubRow[]
}

// 발송 옵션 — 기본값을 그대로 쓰면 늦게 오거나 뒤늦게 뜬다.
//  urgency 'high': 푸시 서비스에 "미루지 말고 지금 배달"이라고 알린다. 지정하지 않으면
//    normal로 취급돼 절전 중인 기기에서 배달이 뒤로 밀린다.
//  TTL 12시간: web-push 기본값은 4주다. 그대로 두면 그날 못 받은 "내일 병원 예약" 알림이
//    몇 주 뒤에 튀어나올 수 있다. 하루 안에 못 받으면 의미가 없으므로 그때 버려지게 한다.
const PUSH_OPTIONS = { urgency: 'high', TTL: 12 * 60 * 60 } as const

// 구독별로 다른 payload를 보낼 수 있는 저수준 발송기 — 만료(404/410) 구독은 자동 정리.
export async function sendPushJobs(
  sb: ReturnType<typeof getServiceClient>,
  jobs: { sub: SubRow; payload: PushPayload }[]
): Promise<{ sent: number; removed: number }> {
  let sent = 0
  const stale: string[] = []
  await Promise.allSettled(
    jobs.map(async ({ sub, payload }) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          PUSH_OPTIONS
        )
        sent++
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 404 || status === 410) stale.push(sub.endpoint)
      }
    })
  )
  if (stale.length) {
    await sb.from('eyebody_push_subscriptions').delete().in('endpoint', stale)
  }
  return { sent, removed: stale.length }
}

// userIds에 속한 모든 구독에 동일 payload 발송
export async function sendPushToUsers(
  sb: ReturnType<typeof getServiceClient>,
  userIds: string[],
  payload: PushPayload
): Promise<{ sent: number; removed: number }> {
  const subs = await fetchSubscriptions(sb, userIds)
  return sendPushJobs(sb, subs.map(sub => ({ sub, payload })))
}
