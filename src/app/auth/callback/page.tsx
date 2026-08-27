'use client'

import { Suspense, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// 카카오 로그인 후 돌아오는 자리. 세션 생성은 여기 한 곳에서만 한다
// (클라이언트의 detectSessionInUrl을 꺼둔 이유 — @/lib/supabase/client 주석 참고).

// QR 연결(/connect/[token])처럼 로그인 후 특정 페이지로 돌아가야 할 때
// 로그인 시작 전 저장해둔 경로 — 있으면 소비하고 지운다(없으면 기본 /dashboard).
function consumePostLoginRedirect(): string {
  const path = localStorage.getItem('mn_post_login_redirect')
  if (path) localStorage.removeItem('mn_post_login_redirect')
  return path || '/dashboard'
}

function CallbackHandler() {
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const supabase = createClient()
    const fail = (detail: string) =>
      window.location.replace(`${siteUrl}/login?error=auth_failed&detail=${encodeURIComponent(detail)}`)
    const succeed = () => window.location.replace(`${siteUrl}${consumePostLoginRedirect()}`)

    const run = async () => {
      const code = new URLSearchParams(window.location.search).get('code')

      // 인증 서버가 에러를 실어 보내는 경우(동의 거부 등)는 그대로 보여준다
      const oauthError = new URLSearchParams(window.location.search).get('error_description')
      if (oauthError) { fail(oauthError); return }

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) { fail(error.message); return }
        if (!data.session) { fail('세션이 생성되지 않았습니다'); return }
        succeed()
        return
      }

      // code 없이 들어온 경우 — 이미 로그인돼 있으면 그대로 통과시킨다
      const { data: { session } } = await supabase.auth.getSession()
      if (session) succeed()
      else fail('인증 코드가 없습니다')
    }

    run().catch(err => fail(err instanceof Error ? err.message : '알 수 없는 오류'))
  }, [])

  return null
}

export default function AuthCallbackPage() {
  return (
    <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">
      <Suspense>
        <CallbackHandler />
      </Suspense>
      로그인 처리 중...
    </div>
  )
}
