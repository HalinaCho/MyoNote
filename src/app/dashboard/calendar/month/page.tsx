'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useChild } from '@/context/ChildContext'
import TabSkeleton from '@/components/ui/TabSkeleton'
import DayDetailSheet from '@/components/care/DayDetailSheet'
import { today } from '@/lib/utils/date'
import { getDayStatus } from '@/lib/utils/compliance'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons'

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']

export default function CareMonthPage() {
  const { logs, lifestyle, treatmentsForDate, isLoading } = useChild()
  const [calYear, setCalYear]   = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [daySheet, setDaySheet] = useState<string | null>(null)

  const todayStr = today()
  const firstDay    = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()

  // 표시 중인 달에 케어 2개 이상이던 날이 있으면 '부분' 범례 노출
  const monthHasPartial = Array.from({ length: daysInMonth }, (_, i) =>
    `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
  ).some(ds => treatmentsForDate(ds).length >= 2)

  const changeMonth = (delta: number) => {
    let m = calMonth + delta, y = calYear
    if (m > 11) { m = 0; y++ }
    if (m < 0)  { m = 11; y-- }
    setCalMonth(m); setCalYear(y)
  }

  if (isLoading) return <TabSkeleton />

  return (
    <>
      <Link href="/dashboard/calendar"
        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2">
        <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" /> 오늘의 케어
      </Link>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        {/* 월 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => changeMonth(-1)} aria-label="이전 달"
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 text-lg">‹</button>
          <span className="font-bold text-gray-800">{calYear}년 {calMonth + 1}월</span>
          <button onClick={() => changeMonth(1)} aria-label="다음 달"
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 text-lg">›</button>
        </div>

        {/* 요일 */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_KO.map(d => <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>)}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d  = i + 1
            const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            const status    = getDayStatus(logs, treatmentsForDate, ds)
            const isToday   = ds === todayStr
            const clickable = ds <= todayStr
            const life      = lifestyle[ds]
            const hasLife   = !!life && (life.outdoor > 0 || life.phone > 0)   // 0값 유령 기록은 도트 제외

            const bg =
              status === 'done'    ? 'bg-teal-100 text-teal-700'
              : status === 'partial' ? 'bg-amber-100 text-amber-700'
              : status === 'missed'  ? 'bg-rose-100 text-rose-600'
              : 'bg-gray-50 text-gray-300'

            return (
              <button
                key={ds}
                disabled={!clickable}
                onClick={() => clickable && setDaySheet(ds)}
                className={`aspect-square flex flex-col items-center justify-between py-1.5 rounded-lg transition-colors
                  ${bg} ${isToday ? 'ring-2 ring-teal-500' : ''} ${clickable ? 'hover:opacity-80 active:scale-95' : ''}`}
              >
                <span className="text-sm sm:text-base font-semibold leading-none">{d}</span>
                <div className="h-1.5 flex items-center justify-center">
                  {hasLife && <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
                </div>
              </button>
            )
          })}
        </div>

        {/* 범례 */}
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-teal-100"/>케어완료</span>
          {monthHasPartial && (
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-100"/>부분</span>
          )}
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-rose-100"/>미완료</span>
          <span className="w-px h-3 bg-gray-200 mx-0.5" />
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            생활습관 기록
          </span>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-gray-400 text-center">날짜를 누르면 그날의 기록을 고칠 수 있어요.</p>

      {daySheet && <DayDetailSheet key={daySheet} date={daySheet} onClose={() => setDaySheet(null)} />}
    </>
  )
}
