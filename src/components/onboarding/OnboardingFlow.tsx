'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faCalendarDays, faFire, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import ChildFormModal from '@/components/child/ChildFormModal'

const FEATURES = [
  {
    icon: faEye,
    iconColor: 'text-teal-500',
    bg: 'bg-[#edf7f6]',
    title: '근시 진행 추적',
    desc: '안축장·굴절도수 변화를 차트로 한눈에',
  },
  {
    icon: faCalendarDays,
    iconColor: 'text-amber-500',
    bg: 'bg-amber-50',
    title: '병원 예약 알림',
    desc: 'D-day 배너로 예약일을 놓치지 않게',
  },
  {
    icon: faFire,
    iconColor: 'text-rose-400',
    bg: 'bg-rose-50',
    title: '케어 달성률',
    desc: '아트로핀·드림렌즈 꾸준한 습관 형성',
  },
]

export default function OnboardingFlow() {
  const [addOpen, setAddOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-[72vh] px-1">
        {/* 앱 아이콘 */}
        <div className="w-20 h-20 rounded-3xl bg-[#edf7f6] flex items-center justify-center mb-5 shadow-sm">
          <FontAwesomeIcon icon={faEye} className="text-4xl text-teal-500" />
        </div>

        {/* 환영 텍스트 */}
        <h1 className="text-xl font-bold text-gray-800 mb-1.5">마이오노트에 오신 것을 환영합니다</h1>
        <p className="text-sm text-gray-400 mb-7 text-center leading-relaxed">
          자녀의 근시를 체계적으로 관리하고<br />진행 상황을 한눈에 파악하세요
        </p>

        {/* 기능 소개 카드 */}
        <div className="w-full space-y-2.5 mb-8">
          {FEATURES.map(f => (
            <div key={f.title} className="flex items-center gap-3.5 bg-white rounded-2xl px-4 py-3.5 shadow-sm">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${f.bg}`}>
                <FontAwesomeIcon icon={f.icon} className={`text-xl ${f.iconColor}`} />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-800">{f.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => setAddOpen(true)}
          className="w-full bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          자녀 등록하고 시작하기
          <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
        </button>
      </div>

      <ChildFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        editing={null}
      />
    </>
  )
}
