import { createBrowserClient } from '@supabase/ssr'

// 세션을 쿠키에 저장한다(@supabase/ssr). 예전에는 supabase-js의 createClient를 써서
// 세션이 localStorage에 있었는데, 그러면 서버(API 라우트·미들웨어)가 로그인 상태를
// 전혀 볼 수 없다 — 실제로 /api/exam-notify와 /api/link-preview가 그 탓에 401을 냈다.
//
// 쿠키는 요청마다 자동으로 같이 가므로 서버가 그대로 읽는다. Next.js App Router에서
// 서버 쪽 인증을 하려면 이 방식이어야 한다.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
