// API 라우트에서 "요청을 보낸 사용자" 컨텍스트를 만드는 헬퍼.
//
// 이 앱의 브라우저 클라이언트는 @supabase/supabase-js의 createClient라서 세션을
// localStorage에 둔다 — 쿠키가 아니다. 그래서 서버에서 cookies()로 세션을 읽으면
// 로그인이 되어 있어도 항상 비어 있다(그 탓에 라우트가 401을 냈다).
//
// 쿠키 기반(@supabase/ssr의 createBrowserClient)으로 바꾸는 게 정석이지만, 저장 위치가
// 바뀌면서 이미 로그인해 쓰고 있는 사용자가 전부 로그아웃된다. 실사용 중이므로
// 호출부가 액세스 토큰을 Authorization 헤더로 실어 보내는 방식을 쓴다.
//
// 토큰을 그대로 클라이언트에 붙여 보내는 것이라, 이 클라이언트로 하는 모든 질의는
// 그 사용자 권한(RLS)으로 실행된다 — service_role 우회가 아니다.

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

export function createRouteClient(req: Request): SupabaseClient | null {
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
