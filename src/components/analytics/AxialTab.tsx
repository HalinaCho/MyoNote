'use client'

import { useChild } from '@/context/ChildContext'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

export default function AxialTab() {
  const { exams } = useChild()
  const sorted = [...exams]
    .filter(e => e.axOD || e.axOS)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (sorted.length < 2) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm text-center text-gray-400 text-sm">
        안축장 기록이 2개 이상 있어야 추세를 볼 수 있습니다.
      </div>
    )
  }

  const labels = sorted.map(e => e.date.slice(2, 7).replace('-', '.'))
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

function linearSlope(xs: number[], ys: (number | null)[]): number {
  const pairs = xs
    .map((x, i) => [x, ys[i]] as [number, number | null])
    .filter((p): p is [number, number] => p[1] != null)
  if (pairs.length < 2) return 0
  const n = pairs.length
  const sx  = pairs.reduce((s, [x])    => s + x,     0)
  const sy  = pairs.reduce((s, [, y])  => s + y,     0)
  const sxy = pairs.reduce((s, [x, y]) => s + x * y, 0)
  const sx2 = pairs.reduce((s, [x])    => s + x * x, 0)
  const denom = n * sx2 - sx * sx
  return denom === 0 ? 0 : ((n * sxy - sx * sy) / denom) * 12
}

function GrowthRateCard({ exams }: { exams: { date: string; axOD: string; axOS: string }[] }) {
  if (exams.length < 2) return null

  const first = new Date(exams[0].date).getTime()
  const xs    = exams.map(e => (new Date(e.date).getTime() - first) / (1000 * 60 * 60 * 24 * 30.4))
  const odData = exams.map(e => parseFloat(e.axOD) || null)
  const osData = exams.map(e => parseFloat(e.axOS) || null)
  const growthOD = linearSlope(xs, odData)
  const growthOS = linearSlope(xs, osData)

  const badge = (g: number) =>
    Math.abs(g) < 0.2  ? { label: '안정', cls: 'bg-green-100 text-green-700' }
    : Math.abs(g) < 0.35 ? { label: '주의', cls: 'bg-yellow-100 text-yellow-700' }
    : { label: '진행', cls: 'bg-red-100 text-red-700' }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-bold text-gray-800">연간 성장률 분석</h3>
        <span className="text-xs text-gray-400">전체 {exams.length}회 기준</span>
      </div>
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
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"/>안정 &lt;0.20</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"/>주의 0.20–0.35</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"/>진행 &gt;0.35</span>
      </div>
    </div>
  )
}
