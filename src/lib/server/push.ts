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
export interface PushPayload { title: string; body: string; url: string; tag: string }

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
          JSON.stringify(payload)
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
