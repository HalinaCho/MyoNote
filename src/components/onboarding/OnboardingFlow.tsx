'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import ChildFormModal from '@/components/child/ChildFormModal'

const STEPS = [
  {
    title: '자녀 등록',
    desc: '이름·생년월일과 진행 중인 케어를 입력해요',
  },
  {
    title: '기록하기',
    desc: '안과 검사 결과와 매일 케어·생활습관을 남겨요',
  },
  {
    title: '변화 확인',
    desc: '안축장 변화와 케어 달성률을 차트로 한눈에',
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
          3단계로 바로 시작할 수 있어요
        </p>

        {/* 사용 3단계 */}
        <div className="w-full space-y-2.5 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex items-center gap-3.5 bg-white rounded-2xl px-4 py-3.5 shadow-sm">
              <div className="w-9 h-9 rounded-full bg-[#edf7f6] text-teal-600 font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-800">{s.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.desc}</div>
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
