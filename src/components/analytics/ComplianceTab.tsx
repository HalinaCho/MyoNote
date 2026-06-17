'use client'

import { useState } from 'react'
import { useChild } from '@/context/ChildContext'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { calcMonthCompliance } from '@/lib/utils/compliance'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

type Half = '상' | '하'

export default function ComplianceTab() {
  const { logs, activeTreatments } = useChild()

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

  const periodAvg = activeData.length
    ? Math.round(activeData.reduce((a, b) => a + b, 0) / activeData.length)
    : 0
  const periodBest = activeData.length ? Math.max(...activeData) : 0
  const periodWorst = activeData.length ? Math.min(...activeData) : 0

  const isCurrentPeriod = year === curYear && half === curHalf

  const summaryCards = isCurrentPeriod
    ? [
        { label: '이번 달',  value: `${data[data.length - 1]}%`, sub: '진행 중' },
        { label: '기간 평균', value: `${periodAvg}%`, sub: '' },
        { label: '최고 달성', value: `${periodBest}%`, sub: '' },
      ]
    : [
        { label: '기간 평균', value: `${periodAvg}%`, sub: '' },
        { label: '최고 달성', value: `${periodBest}%`, sub: '' },
        { label: '최저 달성', value: `${periodWorst}%`, sub: '' },
      ]

  if (!activeTreatments.length) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm text-center text-gray-400 text-sm">
        설정에서 자녀의 케어 항목을 등록해주세요.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 연도 네비게이션 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setYear(y => y - 1)}
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
        </button>
        <span className="font-bold text-gray-700 text-base">{year}년</span>
        <button
          onClick={() => setYear(y => y + 1)}
          disabled={year >= curYear}
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
        </button>
      </div>

      {/* 상반기 / 하반기 칩 */}
      <div className="flex gap-2">
        {(['상', '하'] as Half[]).map(h => {
          const disabled = isFuture(year, h)
          const active = half === h
          return (
            <button
              key={h}
              disabled={disabled}
              onClick={() => setHalf(h)}
              className={`flex-1 py-1.5 rounded-full text-sm font-semibold transition-colors
                ${active
                  ? 'bg-[#10bcad] text-white'
                  : disabled
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
            >
              {h}반기
            </button>
          )
        })}
      </div>

      {/* 차트 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3">월별 케어 달성률</h3>
        <Bar
          data={{
            labels: months.map(m => m.label),
            datasets: [{
              data,
              backgroundColor: data.map(v =>
                !hasLogs(months[data.indexOf(v)]?.year ?? year, months[data.indexOf(v)]?.month ?? 0)
                  ? '#F3F4F6'
                  : v >= 90 ? '#10bcad' : v >= 70 ? '#fde68a' : '#fda4af'
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
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-2">
        {summaryCards.map(({ label, value, sub }) => (
          <div key={label} className="bg-white rounded-xl p-3 text-center shadow-sm">
            <div className="text-xl font-bold text-gray-800">{value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
            {sub && <div className="text-xs text-teal-400 mt-0.5">{sub}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
