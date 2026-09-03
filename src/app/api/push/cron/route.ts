// 병원 예약 알림 발송 (Supabase pg_cron이 하루 1회 호출) — 서버측 service_role 키 사용
//
// 흐름: pg_cron(00:00 UTC = 09:00 KST, docs/sql/2026-07-07-pg-cron-push.sql) → 이 라우트 →
//   ① 오늘(KST) 이후 예약 조회 → ② 각 예약의 dDays 계산 →
//   ③ 자녀의 보호자 중 alertDay가 dDays와 같거나(며칠 전) 예약 당일(0)인 사용자에게 →
//   ④ 그 사용자의 모든 구독으로 web-push 발송. 410/404(만료) 구독은 삭제.
//
// ※ 원래 Vercel Cron이었으나 Hobby 플랜은 시각 정확도가 없어(최대 수 시간 지연 관측)
//   2026-07-07 Supabase pg_cron + pg_net 호출로 이전. vercel.json 크론은 제거됨.
//
// 보안: 호출자(pg_cron)가 Authorization: Bearer <CRON_SECRET> 헤더를 붙여 호출한다.
// web-push는 Node crypto 필요 → Node 런타임 고정.

import { getServiceClient, configureWebPush, fetchSubscriptions, sendPushJobs, type SubRow, type PushPayload } from '@/lib/server/push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT
  ) {
    return Response.json({ error: '서버 환경변수(Supabase service role / VAPID)가 설정되지 않았습니다.' }, { status: 500 })
  }

  configureWebPush()
  const sb = getServiceClient()

  const today = kstToday()

  // ① 오늘 이후 다음 예약 — 예약일은 아이 행에 있다(검사 기록이 아니라)
  const { data: children, error: childErr } = await sb
    .from('eyebody_children')
    .select('id, next_appointment')
    .not('next_appointment', 'is', null)
    .gte('next_appointment', today)
  if (childErr) return Response.json({ error: childErr.message }, { status: 500 })
  if (!children?.length) return Response.json({ ok: true, sent: 0, note: '예정된 예약 없음' })

  const childIds = children.map(c => c.id)

  // 알림 제목에 쓸 병원명 — 부모 폰에는 "마이오노트"보다 다니는 병원 이름이 먼저 읽힌다.
  // 연결이 끊긴(superseded) 건은 제외. 미연결 아이는 앱 이름으로 떨어진다.
  const { data: links } = await sb
    .from('eyebody_hospital_patients')
    .select('child_id, hospital_id')
    .in('child_id', childIds)
    .is('superseded_at', null)
  const hospitalIds = [...new Set((links ?? []).map(l => l.hospital_id))]
  const { data: hospitals } = hospitalIds.length
    ? await sb.from('eyebody_hospitals').select('id, name, logo_url').in('id', hospitalIds)
    : { data: [] }
  const byId = new Map((hospitals ?? []).map(h => [h.id, h as { name: string; logo_url: string | null }]))
  const hospitalByChild = new Map<string, { name: string; logoUrl: string | null }>()
  for (const l of links ?? []) {
    const h = byId.get(l.hospital_id)
    if (h?.name) hospitalByChild.set(l.child_id, { name: h.name, logoUrl: h.logo_url })
  }

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

  const subs = await fetchSubscriptions(sb, userIds)
  const subsByUser = new Map<string, SubRow[]>()
  for (const s of subs) {
    const arr = subsByUser.get(s.user_id) ?? []
    arr.push(s)
    subsByUser.set(s.user_id, arr)
  }

  // ④ 발송 대상 구성 (같은 구독에 중복 발송 방지)
  const jobs: { sub: SubRow; payload: PushPayload }[] = []
  const seen = new Set<string>()   // `${endpoint}|${childId}`

  for (const child of children) {
    const dDays = dayDiff(today, child.next_appointment as string)
    const users = guardiansByChild.get(child.id) ?? []
    for (const uid of users) {
      const alertDay = alertDayByUser.get(uid)
      if (alertDay == null) continue
      const hit = dDays === alertDay || dDays === 0
      if (!hit) continue
      // 제목은 병원명, 본문이 언제인지를 말한다. 며칠 전 알림(alertDay)이든 당일이든
      // 같은 문장 틀이라 부모가 알림만 보고 바로 판단할 수 있다.
      const hos = hospitalByChild.get(child.id)
      const title = hos?.name ?? '마이오노트'
      const body = dDays === 0 ? '오늘 병원 방문일이에요'
        : dDays === 1 ? '내일 병원 방문일이에요'
        : `${dDays}일 뒤 병원 방문일이에요`
      const payload: PushPayload = {
        title, body, url: '/dashboard', tag: `appt-${child.id}`,
        // 오른쪽 큰 아이콘을 병원 로고로 — 왼쪽 앱 아이콘과 겹쳐 보이지 않게
        ...(hos?.logoUrl ? { icon: hos.logoUrl } : {}),
      }
      for (const sub of subsByUser.get(uid) ?? []) {
        const key = `${sub.endpoint}|${child.id}`
        if (seen.has(key)) continue
        seen.add(key)
        jobs.push({ sub, payload })
      }
    }
  }

  const { sent, removed } = await sendPushJobs(sb, jobs)
  return Response.json({ ok: true, candidates: jobs.length, sent, removed })
}
