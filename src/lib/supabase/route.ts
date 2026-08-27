// API 라우트에서 "요청을 보낸 사용자" 컨텍스트를 만드는 헬퍼.
//
// 기본은 쿠키다 — 브라우저 클라이언트가 @supabase/ssr로 바뀌면서 세션이 쿠키에 저장되고,
// 쿠키는 요청마다 자동으로 함께 가므로 서버가 그대로 읽는다.
//
// Authorization 헤더는 폴백으로 남겨둔다. 쿠키 전환 직후라 만에 하나 쿠키가 실리지 않는
// 경로(예: 일부 인앱 브라우저)가 있어도 기능이 죽지 않게 하기 위한 안전장치이며,
// 실사용에서 쿠키 경로가 확인되면 제거해도 된다.
//
// 어느 쪽이든 그 사용자 권한(RLS)으로 질의가 실행된다 — service_role 우회가 아니다.

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { createClient as createCookieClient } from './server'

export async function createRouteClient(req: Request): Promise<SupabaseClient | null> {
  const cookieClient = await createCookieClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (user) return cookieClient

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  )
}
