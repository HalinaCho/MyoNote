import { createBrowserClient } from '@supabase/ssr'

// 세션을 쿠키에 저장한다(@supabase/ssr).
//
// localStorage에 두면 요청에 실리지 않아 서버가 로그인 상태를 전혀 볼 수 없다.
// 그 탓에 /api/exam-notify(검사 알림 푸시)가 오랫동안 조용히 401로 실패하고 있었다.
//
// detectSessionInUrl을 끄는 이유: @supabase/ssr은 flowType을 'pkce'로 하드코딩한다
// (node_modules/@supabase/ssr/dist/main/createBrowserClient.js). PKCE는 일회용 검증값을
// 쓰는데, 자동 처리와 /auth/callback의 수동 처리가 겹치면 먼저 처리한 쪽이 검증값을 소비해
// 나머지 한쪽이 "PKCE code verifier not found"로 실패한다. 처리 주체를 콜백 한 곳으로 못 박는다.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { detectSessionInUrl: false } }
  )
}
