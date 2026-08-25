'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import QRCode from 'qrcode'
import { useHospital } from '@/context/HospitalContext'
import * as q from '@/lib/supabase/queries'

export default function ClinicSettingsPage() {
  const { hospital, isLoading, error } = useHospital()
  const [token, setToken] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    if (!hospital) return
    q.fetchConnectToken(hospital.id).then(setToken).catch(() => {})
  }, [hospital])

  useEffect(() => {
    if (!token) return
    const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/connect/${token}`
    QRCode.toDataURL(url, { width: 220, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(null))
  }, [token])

  const handleRegenerate = async () => {
    if (!hospital) return
    setRegenerating(true)
    try {
      const newToken = await q.regenerateConnectToken(hospital.id)
      setToken(newToken)
      toast.success('QR이 재발급되었습니다. 이전 QR은 더 이상 쓸 수 없어요.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '재발급에 실패했습니다')
    } finally {
      setRegenerating(false)
    }
  }

  if (error) return <p className="text-sm text-rose-500">{error}</p>
  if (isLoading || !hospital) {
    return <div className="animate-pulse text-sm text-gray-400">불러오는 중…</div>
  }

  return (
    <div className="space-y-4">
      <h1 className="font-bold text-gray-800">설정</h1>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="text-sm text-gray-500 mb-1">병원명</div>
        <div className="text-base font-semibold text-gray-800">{hospital.name}</div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col items-center gap-3">
        <div className="text-sm text-gray-500 self-start">환자 연결 QR</div>
        {qrDataUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={qrDataUrl} alt="환자 연결 QR 코드" width={220} height={220} />
        ) : (
          <div className="w-[220px] h-[220px] bg-gray-100 rounded animate-pulse" />
        )}
        <p className="text-xs text-gray-400 text-center">
          환자(보호자)가 이 QR을 스캔하면 자동으로 병원과 연결됩니다.
        </p>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="text-xs text-gray-400 hover:text-rose-500 underline disabled:opacity-50"
        >
          {regenerating ? '재발급 중…' : 'QR 재발급 (이전 QR 무효화)'}
        </button>
      </div>

      <p className="text-xs text-gray-400">
        로고·브랜드 컬러 설정은 다음 업데이트에서 제공됩니다.
      </p>
    </div>
  )
}
