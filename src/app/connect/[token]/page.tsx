'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { ChildProvider, useChild } from '@/context/ChildContext'
import { connectHospitalByToken } from '@/lib/supabase/queries'

export default function ConnectPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        localStorage.setItem('mn_post_login_redirect', `/connect/${params.token}`)
        router.replace('/login')
        return
      }
      setReady(true)
    })
  }, [params.token, router])

  if (!ready) return null

  return (
    <ChildProvider>
      <ConnectConfirm token={params.token} />
    </ChildProvider>
  )
}

function ConnectConfirm({ token }: { token: string }) {
  const router = useRouter()
  const { children, activeChildId, isLoading } = useChild()
  const [selectedOverride, setSelectedOverride] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const selected = selectedOverride ?? activeChildId

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">불러오는 중…</div>
  }

  if (!children.length) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <p className="text-sm text-gray-500">먼저 자녀를 등록한 뒤 다시 QR을 스캔해주세요.</p>
      </div>
    )
  }

  if (result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center gap-4 bg-[#edf7f6]">
        <p className="text-lg font-bold text-gray-800">{result}와 연결되었어요</p>
        <button
          onClick={() => router.replace('/dashboard')}
          className="bg-teal-500 hover:bg-teal-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          홈으로
        </button>
      </div>
    )
  }

  const handleConnect = async () => {
    if (!selected) return
    setConnecting(true)
    try {
      const hospitalName = await connectHospitalByToken(selected, token)
      setResult(hospitalName)
      toast.success('병원과 연결되었습니다')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '연결에 실패했습니다')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-5 bg-[#edf7f6]">
      <p className="text-base font-semibold text-gray-800 text-center">QR로 인식된 병원과 연결할까요?</p>

      {children.length > 1 && (
        <div className="w-full max-w-xs space-y-2">
          {children.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedOverride(c.id)}
              className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors
                ${selected === c.id ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 bg-white text-gray-600'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={handleConnect}
        disabled={connecting || !selected}
        className="bg-teal-500 hover:bg-teal-600 disabled:bg-teal-200 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
      >
        {connecting ? '연결 중…' : '연결하기'}
      </button>
    </div>
  )
}
