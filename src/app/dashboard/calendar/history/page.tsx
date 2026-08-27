'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useChild } from '@/context/ChildContext'
import TabSkeleton from '@/components/ui/TabSkeleton'
import DayDetailSheet from '@/components/care/DayDetailSheet'
import ComplianceTab from '@/components/analytics/ComplianceTab'
import LifestyleMonthlyTab, { type Half } from '@/components/analytics/LifestyleMonthlyTab'
import LifestyleTab from '@/components/analytics/LifestyleTab'
import { today } from '@/lib/utils/date'
import { getDayStatus } from '@/lib/utils/compliance'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons'

// 되돌아보기 전용 화면. 캘린더와 통계를 한 화면에 쌓으면 첫 화면에서 겪던
// "한 번에 너무 많이 보임"이 여기로 옮겨올 뿐이라, 토글로 나눠 각각 짧게 유지한다.

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']

export default function CareHistoryPage() {
  const { logs, lifestyle, treatmentsForDate, isLoading } = useChild()
  const [view, setView] = useState<'calendar' | 'stats'>('calendar')

  const [calYear, setCalYear]   = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [daySheet, setDaySheet] = useState<string | null>(null)

  const now = new Date()
  const curYear = now.getFullYear()
  const curHalf: Half = now.getMonth() < 6 ? '상' : '하'
  const [statsTab, setStatsTab] = useState<'care' | 'lifestyle'>('care')
  const [statsYear, setStatsYear] = useState(curYear)
  const [statsHalf, setStatsHalf] = useState<Half>(curHalf)

  const handlePrev = () => {
    if (statsHalf === '상') { setStatsYear(y => y - 1); setStatsHalf('하') }
    else setStatsHalf('상')
  }
  const handleNext = () => {
    if (statsHalf === '하') { setStatsYear(y => y + 1); setStatsHalf('상') }
    else setStatsHalf('하')
  }
  const nextYear = statsHalf === '하' ? statsYear + 1 : statsYear
  const nextHalf: Half = statsHalf === '하' ? '상' : '하'
  const isNextFuture = nextYear > curYear || (nextYear === curYear && nextHalf === '하' && curHalf === '상')

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

      <div className="flex bg-gray-100 rounded-xl p-1 mb-3">
        {([['calendar', '캘린더'], ['stats', '통계']] as const).map(([v, label]) => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
              ${view === v ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {view === 'calendar' ? (
        <>
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
        </>
      ) : (
        <>
          {/* 최근 7일 생활습관 */}
          <section>
            <LifestyleTab />
          </section>

          {/* 월평균 비교 */}
          <div className="mt-3 bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800">월평균 비교</h3>
              <div className="flex items-center gap-0.5">
                <button onClick={handlePrev} aria-label="이전 반기"
                  className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 active:bg-gray-200 transition-colors">
                  ‹
                </button>
                <span className="text-sm font-semibold text-gray-600 w-[90px] text-center">
                  {statsYear}년 {statsHalf}반기
                </span>
                <button onClick={handleNext} disabled={isNextFuture} aria-label="다음 반기"
                  className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-30 disabled:pointer-events-none">
                  ›
                </button>
              </div>
            </div>

            <div className="flex bg-gray-100 rounded-xl p-1 mb-3">
              {([['care', '근시케어'], ['lifestyle', '생활습관']] as const).map(([t, label]) => (
                <button key={t} onClick={() => setStatsTab(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
                    ${statsTab === t ? 'bg-teal-500 text-white' : 'text-gray-500'}`}>
                  {label}
                </button>
              ))}
            </div>

            {statsTab === 'care'      && <ComplianceTab year={statsYear} half={statsHalf} bare />}
            {statsTab === 'lifestyle' && <LifestyleMonthlyTab year={statsYear} half={statsHalf} bare />}
          </div>
        </>
      )}

      {daySheet && <DayDetailSheet key={daySheet} date={daySheet} onClose={() => setDaySheet(null)} />}
    </>
  )
}
