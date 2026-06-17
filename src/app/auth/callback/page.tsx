'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function CallbackHandler() {
  const done = useRef(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  useEffect(() => {
    if (done.current) return
    done.current = true

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const code = new URLSearchParams(window.location.search).get('code')

    if (!code) {
      setErrMsg('URL에 code 없음')
      return
    }

    createClient().auth.exchangeCodeForSession(code).then(({ data, error }) => {
      if (error) {
        setErrMsg(`${error.message} [${error.status ?? '?'}]`)
      } else if (!data.session) {
        setErrMsg('session null')
      } else {
        window.location.replace(`${siteUrl}/dashboard`)
      }
    })
  }, [])

  if (errMsg) {
    return (
      <p className="text-rose-500 text-sm text-center px-4 mt-4 break-all border border-rose-200 rounded p-2">
        {errMsg}
      </p>
    )
  }
  return null
}

export default function AuthCallbackPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-gray-400 text-sm px-4">
      <Suspense>
        <CallbackHandler />
      </Suspense>
      로그인 처리 중...
    </div>
  )
}
