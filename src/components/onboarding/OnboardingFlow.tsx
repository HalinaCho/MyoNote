'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faChildReaching, faPen, faChartLine, faXmark } from '@fortawesome/free-solid-svg-icons'
import ChildFormModal from '@/components/child/ChildFormModal'
import { useChild } from '@/context/ChildContext'
import * as q from '@/lib/supabase/queries'

type Step = {
  title: string
  desc: string
  tile: string
  icon: typeof faArrowRight
  iconColor: string
  iconSize: string
}

const STEPS: Step[] = [
  {
    title: '자녀 등록',
    desc: '이름·생년월일과 진행 중인 케어를 입력해요',
    tile: 'bg-teal-50',
    icon: faChildReaching,
    iconColor: 'text-teal-500',
    iconSize: 'text-3xl',
  },
  {
    title: '기록하기',
    desc: '안과 검사 결과와 매일 케어·생활습관을 남겨요',
    tile: 'bg-amber-50',
    icon: faPen,
    iconColor: 'text-amber-500',
    iconSize: 'text-2xl',
  },
  {
    title: '변화 확인',
    desc: '안축장 변화와 케어 달성률을 차트로 한눈에',
    tile: 'bg-rose-50',
    icon: faChartLine,
    iconColor: 'text-rose-400',
    iconSize: 'text-2xl',
  },
]

export default function OnboardingFlow() {
  const { refreshChildren } = useChild()
  const [addOpen, setAddOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)

  const handleJoin = async () => {
    if (joinCode.length < 6) { toast.error('코드를 입력해주세요'); return }
    setJoining(true)
    try {
      const name = await q.acceptInviteCode(joinCode)
      toast.success(`${name} 보호자로 등록되었습니다`)
      setJoinOpen(false)
      setJoinCode('')
      await refreshChildren()
    } catch (e: any) {
      toast.error(e.message || '코드 참여에 실패했습니다')
    } finally {
      setJoining(false)
    }
  }

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
                <FontAwesomeIcon icon={s.icon} className={`${s.iconSize} ${s.iconColor}`} />
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

        {/* 보조 동선: 초대 코드로 참여 */}
        <p className="mt-4 text-center text-sm text-gray-400">
          초대 코드를 받으셨나요?{' '}
          <button
            onClick={() => setJoinOpen(true)}
            className="font-semibold text-teal-600 hover:text-teal-700 active:text-teal-800 transition-colors"
          >
            코드로 참여하기
          </button>
        </p>
      </div>

      <ChildFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        editing={null}
      />

      {/* 초대 코드 참여 모달 */}
      {joinOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setJoinOpen(false)} />
          <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">코드로 참여하기</h2>
              <button onClick={() => setJoinOpen(false)} className="text-gray-400 text-xl"><FontAwesomeIcon icon={faXmark} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">다른 보호자에게 받은 초대 코드를 입력하면 해당 자녀를 함께 관리할 수 있어요.</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">초대 코드</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-center text-lg tracking-widest font-bold uppercase focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4"
              placeholder="AB12CD"
              maxLength={6}
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
            />
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full bg-teal-500 hover:bg-teal-600 active:bg-teal-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {joining ? '참여 중...' : '참여하기'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
