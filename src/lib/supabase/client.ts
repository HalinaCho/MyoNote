import { createBrowserClient } from '@supabase/ssr'

// 세션을 쿠키에 저장한다(@supabase/ssr).
//
// localStorage에 두면 요청에 실리지 않아 서버가 로그인 상태를 전혀 볼 수 없다.
// 그 탓에 /api/exam-notify(검사 알림 푸시)가 오랫동안 조용히 401로 실패하고 있었다.
// 쿠키는 요청마다 자동으로 함께 가므로 서버가 그대로 읽는다.
//
// 2026-08-27 1차 시도 때 카카오 로그인이 실패해 되돌렸다가, 파일럿 단계(실사용자 없음)라
// 지금 제대로 잡는 게 낫다고 판단해 재적용. 실패 시 사유가 /login 화면에 표시된다.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
