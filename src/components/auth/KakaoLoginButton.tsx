'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function KakaoLoginButton() {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleLogin = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const supabase = createClient()
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
      const redirectTo = `${siteUrl}/auth/callback`
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: { redirectTo },
      })
      if (error) setErrorMsg(error.message)
    } catch (e: any) {
      setErrorMsg(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 bg-[#FEE500] hover:bg-[#F5DC00] active:bg-[#EDD200] disabled:opacity-60 text-[#191919] font-semibold py-3.5 px-4 rounded-xl transition-colors text-sm"
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-[#191919]/30 border-t-[#191919] rounded-full animate-spin" />
      ) : (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path fillRule="evenodd" clipRule="evenodd"
            d="M9 1.5C4.86 1.5 1.5 4.19 1.5 7.5c0 2.1 1.29 3.95 3.24 5.06l-.83 3.08a.19.19 0 0 0 .28.21L7.7 13.7c.42.06.85.09 1.3.09 4.14 0 7.5-2.69 7.5-6s-3.36-6-7.5-6z"
            fill="#191919"/>
        </svg>
      )}
      {loading ? '로그인 중...' : '카카오로 시작하기'}
    </button>
    {errorMsg && (
      <p className="mt-2 text-xs text-rose-500 text-center break-all">{errorMsg}</p>
    )}
    <p className="mt-2 text-[10px] text-gray-300 text-center break-all">
      url:{process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓' : '✗'}&nbsp;
      key:{process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓' : '✗'}&nbsp;
      site:{process.env.NEXT_PUBLIC_SITE_URL ?? '(없음)'}
    </p>
  )
}
