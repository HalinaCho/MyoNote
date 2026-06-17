'use client'

import { Suspense, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

function CallbackHandler() {
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const code = new URLSearchParams(window.location.search).get('code')

    if (!code) {
      window.location.replace(`${siteUrl}/login?error=auth_failed`)
      return
    }

    createClient().auth.exchangeCodeForSession(code).then(({ data, error }) => {
      if (error || !data.session) {
        window.location.replace(`${siteUrl}/login?error=auth_failed`)
      } else {
        window.location.replace(`${siteUrl}/dashboard`)
      }
    })
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
