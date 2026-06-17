'use client'

import { Suspense, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

function CallbackHandler() {
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true

    const supabase = createClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

    // @supabase/supabase-js auto-processes ?code= from URL (detectSessionInUrl: true)
    // Wait for SIGNED_IN event instead of manually calling exchangeCodeForSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        clearTimeout(timeout)
        window.location.replace(`${siteUrl}/dashboard`)
      }
    })

    // Already signed in (e.g. revisit)
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
    }, 10000)

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
