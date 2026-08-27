'use client'

import { Suspense, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

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

    // PKCE flow: ?code= query param
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error || !data.session) {
          const detail = encodeURIComponent(error?.message ?? '세션 없음')
          window.location.replace(`${siteUrl}/login?error=auth_failed&detail=${detail}`)
        } else {
          window.location.replace(`${siteUrl}${consumePostLoginRedirect()}`)
        }
      })
      return
    }

    // Implicit flow: #access_token= in hash
    // supabase-js (detectSessionInUrl: true) auto-processes the hash on init
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        clearTimeout(timeout)
        window.location.replace(`${siteUrl}${consumePostLoginRedirect()}`)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe()
        clearTimeout(timeout)
        window.location.replace(`${siteUrl}${consumePostLoginRedirect()}`)
      }
    })

    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      window.location.replace(`${siteUrl}/login?error=auth_failed&detail=${encodeURIComponent('5초 내 세션 미생성')}`)
    }, 5000)

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
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
