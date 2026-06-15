'use client'

import { useChild } from '@/context/ChildContext'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

export default function AxialTab() {
  const { exams } = useChild()
  const sorted = [...exams].sort((a, b) => a.date.localeCompare(b.date))

  if (sorted.length < 2) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm text-center text-gray-400 text-sm">
        <div className="text-3xl mb-2">📏</div>
        검사기록이 2개 이상 있어야 추세를 볼 수 있습니다.
      </div>
    )
  }

  const labels = sorted.map(e => e.date.slice(0, 7))
  const odData = sorted.map(e => parseFloat(e.axOD) || null)
  const osData = sorted.map(e => parseFloat(e.axOS) || null)

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3">안축장 변화 추이</h3>
        <Line
          data={{
            labels,
            datasets: [
              { label: '우안(OD)', data: odData, borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,.1)', tension: 0.4, fill: true, pointRadius: 4 },
              { label: '좌안(OS)', data: osData, borderColor: '#F97316', backgroundColor: 'rgba(249,115,22,.06)', tension: 0.4, fill: true, pointRadius: 4 },
            ],
          }}
          options={{
            responsive: true,
            plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
            scales: {
              x: { grid: { display: false }, ticks: { font: { size: 10 } } },
              y: { ticks: { callback: v => `${v}mm`, font: { size: 10 } }, grid: { color: '#F3F4F6' } },
            },
          }}
        />
      </div>

      {/* 성장률 분석 */}
      <GrowthRateCard exams={sorted} />
    </div>
  )
}

function GrowthRateCard({ exams }: { exams: { date: string; axOD: string; axOS: string }[] }) {
  if (exams.length < 2) return null
  const last = exams[exams.length - 1]
  const prev = exams[exams.length - 2]
  const months = (new Date(last.date).getTime() - new Date(prev.date).getTime()) / (1000 * 60 * 60 * 24 * 30.4)
  const growthOD = months > 0 ? ((parseFloat(last.axOD) - parseFloat(prev.axOD)) / months * 12) : 0
  const growthOS = months > 0 ? ((parseFloat(last.axOS) - parseFloat(prev.axOS)) / months * 12) : 0

  const badge = (g: number) =>
    Math.abs(g) < 0.2 ? { label: 'STABLE', cls: 'bg-green-100 text-green-700' }
    : Math.abs(g) < 0.35 ? { label: 'WATCH', cls: 'bg-yellow-100 text-yellow-700' }
    : { label: 'RAPID', cls: 'bg-red-100 text-red-700' }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="font-bold text-gray-800 mb-3">연간 성장률 분석</h3>
      {[['우안 (OD)', growthOD], ['좌안 (OS)', growthOS]].map(([eye, g]) => {
        const b = badge(g as number)
        return (
          <div key={eye as string} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-600">{eye as string}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-800">
                {(g as number) >= 0 ? '+' : ''}{(g as number).toFixed(2)} mm/yr
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${b.cls}`}>{b.label}</span>
            </div>
          </div>
        )
      })}
      <div className="flex gap-3 mt-3 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"/>&lt;0.20 Stable</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"/>0.20–0.35 Watch</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"/>&gt;0.35 Rapid</span>
      </div>
    </div>
  )
}
