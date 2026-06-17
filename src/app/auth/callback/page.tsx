'use client'

import { Suspense, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CallbackHandler() {
  const searchParams = useSearchParams()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true

    const code = searchParams.get('code')
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const loginUrl = (suffix = '') => `${siteUrl}/login${suffix}`

    if (!code) { window.location.replace(loginUrl('?error=auth_failed')); return }
    createClient().auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) window.location.replace(loginUrl('?error=auth_failed'))
      else window.location.replace(`${siteUrl}/dashboard`)
    })
  }, [searchParams])

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
