import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// 세션은 localStorage에 저장한다(supabase-js 기본).
//
// 2026-08-27: 쿠키 저장(@supabase/ssr createBrowserClient)으로 바꿨다가 카카오 로그인이
// 실패해서 되돌렸다. 서버에서 세션을 읽으려면 쿠키가 정석이지만, 로그인 자체가 깨지는 건
// 감수할 수 없다. 서버 라우트는 Authorization 헤더로 토큰을 받아 처리한다
// (`@/lib/supabase/route`). 쿠키 전환은 원인을 밝힌 뒤 다시 시도할 것.
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
