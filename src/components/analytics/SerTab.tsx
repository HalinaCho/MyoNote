'use client'

import { useChild } from '@/context/ChildContext'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGlasses, faCircleInfo } from '@fortawesome/free-solid-svg-icons'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

export default function SerTab() {
  const { exams } = useChild()
  const sorted = [...exams].sort((a, b) => a.date.localeCompare(b.date))

  if (sorted.length < 2) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm text-center text-gray-400 text-sm">
        <FontAwesomeIcon icon={faGlasses} className="text-3xl mb-2" />
        검사기록이 2개 이상 있어야 추세를 볼 수 있습니다.
      </div>
    )
  }

  const labels = sorted.map(e => e.date.slice(2, 7).replace('-', '.'))
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3">굴절값(SEQ) 변화</h3>
        <Line
          data={{
            labels,
            datasets: [
              { label: '우안(OD)', data: sorted.map(e => parseFloat(e.serOD) || null), borderColor: '#3B82F6', tension: 0.4, pointRadius: 4, fill: false },
              { label: '좌안(OS)', data: sorted.map(e => parseFloat(e.serOS) || null), borderColor: '#F97316', tension: 0.4, pointRadius: 4, fill: false },
            ],
          }}
          options={{
            responsive: true,
            plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
            scales: {
              x: { grid: { display: false }, ticks: { font: { size: 10 } } },
              y: { ticks: { callback: v => `${v}D`, font: { size: 10 } }, grid: { color: '#F3F4F6' } },
            },
          }}
        />
      </div>
      <div className="bg-blue-50 rounded-2xl p-4 text-sm text-blue-700">
        <div className="font-semibold mb-1 flex items-center gap-1.5"><FontAwesomeIcon icon={faCircleInfo} /> SEQ 해석 가이드</div>
        <div className="text-xs leading-relaxed">SEQ는 근시 정도를 나타내는 굴절값입니다. 음수가 클수록 근시가 강합니다. 연간 −0.50D 이상 진행 시 전문의 상담을 권장합니다.</div>
      </div>
    </div>
  )
}
