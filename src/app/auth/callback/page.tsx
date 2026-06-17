'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) { router.replace('/login?error=auth_failed'); return }
    createClient().auth.exchangeCodeForSession(code).then(({ error }) => {
      router.replace(error ? '/login?error=auth_failed' : '/dashboard')
    })
  }, [router, searchParams])

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
