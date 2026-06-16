'use client'

import { useChild } from '@/context/ChildContext'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { calcMonthCompliance } from '@/lib/utils/compliance'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function ComplianceTab() {
  const { logs, activeTreatments } = useChild()

  if (!activeTreatments.length) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm text-center text-gray-400 text-sm">
        설정에서 자녀의 케어 항목을 등록해주세요.
      </div>
    )
  }

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    return { year: d.getFullYear(), month: d.getMonth(), label: `${d.getMonth() + 1}월` }
  })

  const data = months.map(m => calcMonthCompliance(logs, activeTreatments, m.year, m.month))

  const hasLogs = (year: number, month: number) => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
    return Object.keys(logs).some(k => k.startsWith(prefix))
  }

  const avg3 = (() => {
    const vals = months.slice(-3)
      .map((m, i) => ({ v: data[months.length - 3 + i], active: hasLogs(m.year, m.month) }))
      .filter(x => x.active).map(x => x.v)
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
  })()

  const avgAll = (() => {
    const vals = months
      .map((m, i) => ({ v: data[i], active: hasLogs(m.year, m.month) }))
      .filter(x => x.active).map(x => x.v)
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
  })()

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3">월별 케어 달성률</h3>
        <Bar
          data={{
            labels: months.map(m => m.label),
            datasets: [{
              data,
              backgroundColor: data.map(v => v >= 90 ? '#10bcad' : v >= 70 ? '#fde68a' : '#fda4af'),
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

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '이번 달', value: `${data[data.length - 1]}%`, current: true },
          { label: '3개월 평균', value: `${avg3}%`, current: false },
          { label: '6개월 평균', value: `${avgAll}%`, current: false },
        ].map(({ label, value, current }) => (
          <div key={label} className="bg-white rounded-xl p-3 text-center shadow-sm">
            <div className="text-xl font-bold text-gray-800">{value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
            {current && <div className="text-xs text-teal-400 mt-0.5">진행 중</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
