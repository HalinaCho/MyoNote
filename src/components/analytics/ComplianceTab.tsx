'use client'

import { useChild } from '@/context/ChildContext'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { calcMonthCompliance } from '@/lib/utils/compliance'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function ComplianceTab() {
  const { logs, activeTreatments } = useChild()

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    return { year: d.getFullYear(), month: d.getMonth(), label: `${d.getMonth() + 1}월` }
  })

  const data = months.map(m => calcMonthCompliance(logs, activeTreatments, m.year, m.month))
  const avg3   = Math.round(data.slice(-3).reduce((a, b) => a + b, 0) / 3)
  const avgAll = Math.round(data.reduce((a, b) => a + b, 0) / data.length)

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3">월별 케어 달성률</h3>
        <Bar
          data={{
            labels: months.map(m => m.label),
            datasets: [{
              data,
              backgroundColor: data.map(v => v >= 90 ? '#10B981' : v >= 70 ? '#3B82F6' : '#F59E0B'),
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
          { label: '이번 달',    value: `${data[data.length - 1]}%` },
          { label: '3개월 평균', value: `${avg3}%` },
          { label: '6개월 평균', value: `${avgAll}%` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl p-3 text-center shadow-sm">
            <div className="text-xl font-bold text-gray-800">{value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
