'use client'

import { useState } from 'react'
import { useChild } from '@/context/ChildContext'
import TabSkeleton from '@/components/ui/TabSkeleton'
import EmptyState from '@/components/ui/EmptyState'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { calcMonthCompliance } from '@/lib/utils/compliance'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

type Half = '상' | '하'

export default function ComplianceTab() {
  const { logs, activeTreatments, isLoading } = useChild()

  const today = new Date()
  const curYear = today.getFullYear()
  const curHalf: Half = today.getMonth() < 6 ? '상' : '하'

  const [year, setYear] = useState(curYear)
  const [half, setHalf] = useState<Half>(curHalf)

  const isFuture = (y: number, h: Half) => {
    if (y > curYear) return true
    if (y === curYear && h === '하' && curHalf === '상') return true
    return false
  }

  const handlePrev = () => {
    if (half === '상') { setYear(y => y - 1); setHalf('하') }
    else setHalf('상')
  }

  const handleNext = () => {
    if (half === '하') { setYear(y => y + 1); setHalf('상') }
    else setHalf('하')
  }

  const isNextFuture = isFuture(half === '하' ? year + 1 : year, half === '하' ? '상' : '하')

  const months = Array.from({ length: 6 }, (_, i) => {
    const monthIndex = half === '상' ? i : i + 6
    return { year, month: monthIndex, label: `${monthIndex + 1}월` }
  })

  const data = months.map(m => calcMonthCompliance(logs, activeTreatments, m.year, m.month))

  const hasLogs = (y: number, month: number) => {
    const prefix = `${y}-${String(month + 1).padStart(2, '0')}`
    return Object.keys(logs).some(k => k.startsWith(prefix))
  }

  const activeData = months
    .map((m, i) => ({ v: data[i], active: hasLogs(m.year, m.month) }))
    .filter(x => x.active)
    .map(x => x.v)

  const periodAvg  = activeData.length ? Math.round(activeData.reduce((a, b) => a + b, 0) / activeData.length) : 0
  const periodBest = activeData.length ? Math.max(...activeData) : 0
  const periodWorst = activeData.length ? Math.min(...activeData) : 0

  const isCurrentPeriod = year === curYear && half === curHalf

  const summaryCards = isCurrentPeriod
    ? [
        { label: '이번 달',  value: `${data[data.length - 1]}%`, sub: '진행 중' },
        { label: '기간 평균', value: `${periodAvg}%`,  sub: '' },
        { label: '최고 달성', value: `${periodBest}%`, sub: '' },
      ]
    : [
        { label: '기간 평균', value: `${periodAvg}%`,   sub: '' },
        { label: '최고 달성', value: `${periodBest}%`,  sub: '' },
        { label: '최저 달성', value: `${periodWorst}%`, sub: '' },
      ]

  if (isLoading) return <TabSkeleton />
  if (!activeTreatments.length) return <EmptyState message="설정에서 자녀의 케어 항목을 등록해주세요." />

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
      {/* 헤더: 제목 + 네비게이션 */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800">케어 달성률</h3>
        <div className="flex items-center gap-0.5">
          <button
            onClick={handlePrev}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
          </button>
          <span className="text-sm font-semibold text-gray-600 w-[90px] text-center">
            {year}년 {half}반기
          </span>
          <button
            onClick={handleNext}
            disabled={isNextFuture}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
          </button>
        </div>
      </div>

      {/* 차트 */}
      <Bar
        data={{
          labels: months.map(m => m.label),
          datasets: [{
            data,
            backgroundColor: months.map((m, i) =>
              !hasLogs(m.year, m.month) ? '#F3F4F6'
              : data[i] >= 90 ? '#10bcad'
              : data[i] >= 70 ? '#fde68a'
              : '#fda4af'
            ),
            borderRadius: 6,
          }],
        }}
        options={{
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
            y: { min: 0, max: 100, ticks: { callback: v => `${v}%`, font: { size: 11 } }, grid: { color: '#F3F4F6' } },
          },
        }}
      />

      {/* 요약 통계 */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
        {summaryCards.map(({ label, value, sub }) => (
          <div key={label} className="text-center">
            <div className="text-lg font-bold text-gray-800">{value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
            {sub && <div className="text-xs text-teal-400 mt-0.5">{sub}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
