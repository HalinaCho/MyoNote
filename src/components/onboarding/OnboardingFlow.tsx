'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import ChildFormModal from '@/components/child/ChildFormModal'

const STEPS = [
  {
    title: '자녀 등록',
    desc: '이름·생년월일과 진행 중인 케어를 입력해요',
    circle: 'bg-teal-50 text-teal-600',
  },
  {
    title: '기록하기',
    desc: '안과 검사 결과와 매일 케어·생활습관을 남겨요',
    circle: 'bg-amber-50 text-amber-600',
  },
  {
    title: '변화 확인',
    desc: '안축장 변화와 케어 달성률을 차트로 한눈에',
    circle: 'bg-rose-50 text-rose-500',
  },
]

export default function OnboardingFlow() {
  const [addOpen, setAddOpen] = useState(false)

  return (
    <>
      <div className="pt-7 pb-4">
        {/* 인사 */}
        <div className="text-4xl mb-3">😊</div>
        <h1 className="text-xl font-bold text-gray-800 leading-snug mb-1.5">
          환영합니다!<br />내 아이의 근시 관리를 체계적으로
        </h1>
        <p className="text-sm text-gray-400 mb-6">딱 3단계면 준비가 끝나요</p>

        {/* 사용 3단계 */}
        <div className="space-y-2.5 mb-6">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex items-center gap-3.5 bg-white rounded-2xl px-4 py-3.5 shadow-sm">
              <div className={`w-9 h-9 rounded-full font-bold flex items-center justify-center flex-shrink-0 ${s.circle}`}>
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
          className="mx-auto w-fit flex items-center gap-2 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-sm"
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
