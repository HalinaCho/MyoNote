'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import KakaoLoginButton from '@/components/auth/KakaoLoginButton'
import { recordConsent } from '@/lib/consent'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck } from '@fortawesome/free-solid-svg-icons'

function ErrorMessage() {
  const searchParams = useSearchParams()
  if (!searchParams.get('error')) return null
  return (
    <p className="mt-3 text-center text-sm text-rose-500">
      로그인에 실패했습니다. 다시 시도해주세요.
    </p>
  )
}

function Check({ checked, onToggle, children }: {
  checked: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={checked}
        className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border transition-colors ${
          checked ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white border-gray-300 text-transparent'
        }`}
      >
        <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
      </button>
      <div onClick={onToggle} className="text-sm text-gray-600 leading-snug cursor-pointer select-none">
        {children}
      </div>
    </div>
  )
}

export default function LoginPage() {
  const [privacy, setPrivacy] = useState(false)
  const [sensitive, setSensitive] = useState(false)
  const allAgreed = privacy && sensitive
  const toggleAll = () => {
    const next = !allAgreed
    setPrivacy(next)
    setSensitive(next)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#edf7f6] px-4 py-10">
      <div className="w-full max-w-sm">

        {/* 로고 */}
        <div className="text-center mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/icon.svg`}
            alt="마이오노트"
            width={72}
            height={72}
            className="mx-auto mb-2"
          />
          <h1 className="text-2xl font-bold text-gray-900">마이오노트</h1>
          <p className="mt-1 text-sm text-gray-500">내 아이 근시 관리</p>
        </div>

        {/* 한 줄 가치 제안 */}
        <p className="text-center text-sm text-gray-500 leading-relaxed mb-7 px-2">
          안축장 변화 추적부터 매일 케어 습관까지,<br />
          내 아이 근시 관리를 한 곳에서 시작하세요
        </p>

        {/* 동의 */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100 space-y-3">
          <Check checked={allAgreed} onToggle={toggleAll}>
            <b className="text-gray-800 font-semibold">전체 동의</b>
          </Check>
          <div className="border-t border-gray-100" />
          <Check checked={privacy} onToggle={() => setPrivacy(v => !v)}>
            <span className="text-teal-600 font-medium">(필수)</span>{' '}
            <Link href="/privacy" onClick={e => e.stopPropagation()} className="underline">개인정보 처리방침</Link>에 동의합니다
          </Check>
          <Check checked={sensitive} onToggle={() => setSensitive(v => !v)}>
            <span className="text-teal-600 font-medium">(필수)</span>{' '}
            자녀의 안과 검사 기록 등 <b className="text-gray-700">민감정보(건강정보)</b>의 수집·이용에 동의합니다
          </Check>
        </div>

        {/* 카카오 로그인 */}
        <KakaoLoginButton agreed={allAgreed} onProceed={recordConsent} />

        {!allAgreed && (
          <p className="mt-2 text-center text-xs text-gray-400">필수 항목에 동의하면 시작할 수 있어요</p>
        )}

        {/* 에러 메시지 */}
        <Suspense>
          <ErrorMessage />
        </Suspense>
      </div>
    </div>
  )
}
