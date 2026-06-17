'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import KakaoLoginButton from '@/components/auth/KakaoLoginButton'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboardList, faChartLine, faUserGroup } from '@fortawesome/free-solid-svg-icons'

function ErrorMessage() {
  const searchParams = useSearchParams()
  if (!searchParams.get('error')) return null
  return (
    <p className="mt-3 text-center text-sm text-rose-500">
      로그인에 실패했습니다. 다시 시도해주세요.
    </p>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">

        {/* 로고 */}
        <div className="text-center mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/icon.svg`}
            alt="마이오노트"
            width={80}
            height={80}
            className="mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900">마이오노트</h1>
          <p className="mt-1 text-sm text-gray-500">내 아이 근시 관리</p>
        </div>

        {/* 설명 */}
        <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-100 space-y-3">
          {[
            { icon: faClipboardList, text: '케어 달성률을 매일 간편하게 기록' },
            { icon: faChartLine,     text: '안축장 변화를 차트로 한눈에' },
            { icon: faUserGroup,     text: '보호자 여러 명이 함께 관리' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-gray-600">
              <FontAwesomeIcon icon={icon} className="text-base text-teal-500 w-4" />
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* 카카오 로그인 */}
        <KakaoLoginButton />

        {/* 에러 메시지 */}
        <Suspense>
          <ErrorMessage />
        </Suspense>

        <p className="mt-6 text-center text-xs text-gray-400">
          로그인 시{' '}
          <span className="underline cursor-pointer">개인정보 처리방침</span>에 동의하게 됩니다
        </p>
      </div>
    </div>
  )
}
