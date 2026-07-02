// 병원 예약 알림 발송 (Vercel Cron, 하루 1회) — 서버측 service_role 키 사용
//
// 흐름: 크론(00:00 UTC = 09:00 KST) → 이 라우트 →
//   ① 오늘(KST) 이후 예약 조회 → ② 각 예약의 dDays 계산 →
//   ③ 자녀의 보호자 중 alertDay가 dDays와 같거나(며칠 전) 예약 당일(0)인 사용자에게 →
//   ④ 그 사용자의 모든 구독으로 web-push 발송. 410/404(만료) 구독은 삭제.
//
// 보안: Vercel은 CRON_SECRET env가 있으면 요청에 Authorization: Bearer <CRON_SECRET>를 붙인다.
// web-push는 Node crypto 필요 → Node 런타임 고정.

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface SubRow { user_id: string; endpoint: string; p256dh: string; auth: string }

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)
}
function dayDiff(fromStr: string, toStr: string): number {
  return Math.round((Date.parse(toStr + 'T00:00:00Z') - Date.parse(fromStr + 'T00:00:00Z')) / 86400000)
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  const vapidSubject = process.env.VAPID_SUBJECT
  if (!url || !serviceKey || !vapidPublic || !vapidPrivate || !vapidSubject) {
    return Response.json({ error: '서버 환경변수(Supabase service role / VAPID)가 설정되지 않았습니다.' }, { status: 500 })
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } })

  const today = kstToday()

  // ① 오늘 이후 다음 예약
  const { data: exams, error: examErr } = await sb
    .from('eyebody_exam_records')
    .select('id, child_id, clinic, next_appointment')
    .not('next_appointment', 'is', null)
    .gte('next_appointment', today)
  if (examErr) return Response.json({ error: examErr.message }, { status: 500 })
  if (!exams?.length) return Response.json({ ok: true, sent: 0, note: '예정된 예약 없음' })

  const childIds = [...new Set(exams.map(e => e.child_id))]

  // ② 자녀별 보호자
  const { data: guardians } = await sb
    .from('eyebody_child_guardians')
    .select('child_id, user_id')
    .in('child_id', childIds)
  const guardiansByChild = new Map<string, string[]>()
  for (const g of guardians ?? []) {
    const arr = guardiansByChild.get(g.child_id) ?? []
    arr.push(g.user_id)
    guardiansByChild.set(g.child_id, arr)
  }

  const userIds = [...new Set((guardians ?? []).map(g => g.user_id))]
  if (!userIds.length) return Response.json({ ok: true, sent: 0 })

  // ③ 사용자별 알림일(설정) + 구독
  const { data: prefs } = await sb
    .from('eyebody_notification_prefs')
    .select('user_id, appt_alert_day')
    .in('user_id', userIds)
    .not('appt_alert_day', 'is', null)
  const alertDayByUser = new Map<string, number>()
  for (const p of prefs ?? []) alertDayByUser.set(p.user_id, p.appt_alert_day as number)

  const { data: subs } = await sb
    .from('eyebody_push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', userIds)
  const subsByUser = new Map<string, SubRow[]>()
  for (const s of (subs ?? []) as SubRow[]) {
    const arr = subsByUser.get(s.user_id) ?? []
    arr.push(s)
    subsByUser.set(s.user_id, arr)
  }

  // ④ 발송 대상 구성 (같은 구독에 중복 발송 방지)
  const jobs: { sub: SubRow; payload: string }[] = []
  const seen = new Set<string>()   // `${endpoint}|${examId}`

  for (const exam of exams) {
    const dDays = dayDiff(today, exam.next_appointment as string)
    const users = guardiansByChild.get(exam.child_id) ?? []
    for (const uid of users) {
      const alertDay = alertDayByUser.get(uid)
      if (alertDay == null) continue
      const hit = dDays === alertDay || dDays === 0
      if (!hit) continue
      const clinic = exam.clinic ? ` · ${exam.clinic}` : ''
      const title = dDays === 0 ? '오늘 병원 예약일이에요' : `병원 예약 D-${dDays}`
      const body = `${exam.next_appointment}${clinic}`
      const payload = JSON.stringify({ title, body, url: '/dashboard', tag: `appt-${exam.id}` })
      for (const sub of subsByUser.get(uid) ?? []) {
        const key = `${sub.endpoint}|${exam.id}`
        if (seen.has(key)) continue
        seen.add(key)
        jobs.push({ sub, payload })
      }
    }
  }

  // 발송 + 만료 구독 정리
  let sent = 0
  const stale: string[] = []
  await Promise.allSettled(
    jobs.map(async ({ sub, payload }) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
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

  return Response.json({ ok: true, candidates: jobs.length, sent, removed: stale.length })
}
