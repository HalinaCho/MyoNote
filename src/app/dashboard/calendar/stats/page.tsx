'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useChild } from '@/context/ChildContext'
import TabSkeleton from '@/components/ui/TabSkeleton'
import ComplianceTab from '@/components/analytics/ComplianceTab'
import LifestyleMonthlyTab, { type Half } from '@/components/analytics/LifestyleMonthlyTab'
import LifestyleTab from '@/components/analytics/LifestyleTab'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons'

export default function CareStatsPage() {
  const { isLoading } = useChild()
  const [statsTab, setStatsTab] = useState<'care' | 'lifestyle'>('care')

  const now = new Date()
  const curYear = now.getFullYear()
  const curHalf: Half = now.getMonth() < 6 ? '상' : '하'
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

  if (isLoading) return <TabSkeleton />

  return (
    <>
      <Link href="/dashboard/calendar"
        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2">
        <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" /> 오늘의 케어
      </Link>

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
  )
}
