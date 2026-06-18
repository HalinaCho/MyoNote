'use client'

import { useChild } from '@/context/ChildContext'
import TabSkeleton from '@/components/ui/TabSkeleton'
import EmptyState from '@/components/ui/EmptyState'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { calcMonthCompliance } from '@/lib/utils/compliance'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

type Half = '상' | '하'

interface Props { year: number; half: Half; bare?: boolean }

export default function ComplianceTab({ year, half, bare }: Props) {
  const { logs, activeTreatments, isLoading } = useChild()

  const today = new Date()
  const curYear = today.getFullYear()
  const curHalf: Half = today.getMonth() < 6 ? '상' : '하'

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

  const inner = (
    <div className="space-y-3">
      {!bare && <h3 className="font-bold text-gray-800">케어 달성률</h3>}

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
          <div key={label} className="bg-[#edf7f6] rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className="text-lg font-black text-gray-800 leading-none">{value}</div>
            {sub && <div className="text-xs text-teal-400 mt-1">{sub}</div>}
          </div>
        ))}
      </div>
    </div>
  )
  return bare ? inner : <div className="bg-white rounded-2xl p-4 shadow-sm">{inner}</div>
}
