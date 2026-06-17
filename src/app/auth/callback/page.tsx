'use client'

import { Suspense, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

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
          window.location.replace(`${siteUrl}/login?error=auth_failed`)
        } else {
          window.location.replace(`${siteUrl}/dashboard`)
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
        window.location.replace(`${siteUrl}/dashboard`)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe()
        clearTimeout(timeout)
        window.location.replace(`${siteUrl}/dashboard`)
      }
    })

    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      window.location.replace(`${siteUrl}/login?error=auth_failed`)
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
