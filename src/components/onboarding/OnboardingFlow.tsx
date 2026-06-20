'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faPen, faChartLine } from '@fortawesome/free-solid-svg-icons'
import ChildFormModal from '@/components/child/ChildFormModal'

type Step = {
  title: string
  desc: string
  tile: string
  emoji?: string
  icon?: typeof faArrowRight
  iconColor?: string
}

const STEPS: Step[] = [
  {
    title: '자녀 등록',
    desc: '이름·생년월일과 진행 중인 케어를 입력해요',
    tile: 'bg-teal-50',
    emoji: '👦',
  },
  {
    title: '기록하기',
    desc: '안과 검사 결과와 매일 케어·생활습관을 남겨요',
    tile: 'bg-amber-50',
    icon: faPen,
    iconColor: 'text-amber-500',
  },
  {
    title: '변화 확인',
    desc: '안축장 변화와 케어 달성률을 차트로 한눈에',
    tile: 'bg-rose-50',
    icon: faChartLine,
    iconColor: 'text-rose-400',
  },
]

export default function OnboardingFlow() {
  const [addOpen, setAddOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col justify-center min-h-[78vh] py-6">
        {/* 안내 헤딩 */}
        <h1 className="text-xl font-bold text-gray-800 leading-snug mb-1.5">
          환영합니다!<br />내 아이의 근시, 체계적으로 관리해요
        </h1>
        <p className="text-sm text-gray-400">딱 3단계면 준비가 끝나요</p>

        {/* 사용 3단계 */}
        <div className="space-y-3 mt-7 mb-8">
          {STEPS.map(s => (
            <div key={s.title} className="flex items-center gap-4 bg-white rounded-2xl px-4 py-4 shadow-sm">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${s.tile}`}>
                {s.emoji
                  ? <span className="text-2xl leading-none">{s.emoji}</span>
                  : <FontAwesomeIcon icon={s.icon!} className={`text-xl ${s.iconColor}`} />}
              </div>
              <div>
                <div className="text-[15px] font-semibold text-gray-800">{s.title}</div>
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
