// 검사기록이 병원 위치와 매칭되었을 때(= 실제 방문으로 확인됨) 보호자들에게 즉시 발송.
// 호출자는 부모 세션(쿠키)이며, 서버에서 is_guardian으로 권한 확인 후 service_role로 발송한다.

import { createClient as createServerClient } from '@/lib/supabase/server'
import { getServiceClient, configureWebPush, sendPushToUsers } from '@/lib/server/push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  let body: { childId?: string; hospitalName?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }
  const { childId, hospitalName } = body
  if (!childId) return Response.json({ error: 'childId가 필요합니다.' }, { status: 400 })

  const authed = await createServerClient()
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { data: isGuardian } = await authed.rpc('is_guardian', { p_child_id: childId })
  if (!isGuardian) return Response.json({ error: '권한이 없습니다.' }, { status: 403 })

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT
  ) {
    return Response.json({ error: '서버 환경변수(Supabase service role / VAPID)가 설정되지 않았습니다.' }, { status: 500 })
  }

  configureWebPush()
  const sb = getServiceClient()

  const { data: guardians } = await sb
    .from('eyebody_child_guardians')
    .select('user_id')
    .eq('child_id', childId)
  const userIds = (guardians ?? []).map(g => g.user_id as string)

  const { sent, removed } = await sendPushToUsers(sb, userIds, {
    title: '새 검사 결과가 도착했어요',
    body: hospitalName ? `${hospitalName}에서 새 검사 결과를 등록했어요` : '새 검사 결과를 확인해보세요',
    url: '/dashboard/analytics',
    tag: `exam-new-${childId}`,
  })

  return Response.json({ ok: true, sent, removed })
}
