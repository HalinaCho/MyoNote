'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ClinicLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const sb = createClient()
      const { error: authErr } = await sb.auth.signInWithPassword({ email, password })
      if (authErr) throw authErr

      const { data: hospitalId, error: rpcErr } = await sb.rpc('my_hospital_id')
      if (rpcErr) throw rpcErr
      if (!hospitalId) {
        await sb.auth.signOut()
        throw new Error('병원 스태프 계정이 아닙니다. 운영자에게 문의해주세요.')
      }

      router.replace('/clinic')
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="text-center mb-2">
          <h1 className="text-xl font-bold text-gray-900">마이오노트 병원 포털</h1>
          <p className="mt-1 text-sm text-gray-500">스태프 계정으로 로그인하세요</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
          <input
            type="email" required autoComplete="username" value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
          <input
            type="password" required autoComplete="current-password" value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {error && <p className="text-sm text-rose-500">{error}</p>}

        <button
          type="submit" disabled={loading}
          className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-teal-200 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {loading ? '로그인 중…' : '로그인'}
        </button>

        <p className="pt-2 text-center text-xs text-gray-400">
          보호자이신가요?{' '}
          <Link href="/login" className="text-gray-500 underline underline-offset-2 hover:text-teal-600">
            보호자 로그인
          </Link>
        </p>
      </form>
    </div>
  )
}
