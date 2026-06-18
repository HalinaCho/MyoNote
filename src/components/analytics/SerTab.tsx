'use client'

import { useState, useRef, useEffect } from 'react'
import { useChild } from '@/context/ChildContext'
import TabSkeleton from '@/components/ui/TabSkeleton'
import EmptyState from '@/components/ui/EmptyState'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const SCROLL_THRESHOLD = 8
const PER_POINT = 52

export default function SerTab() {
  const { exams, isLoading } = useChild()
  const [showOD, setShowOD] = useState(true)
  const [showOS, setShowOS] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const sorted = [...exams].sort((a, b) => a.date.localeCompare(b.date))

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
  }, [])

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -(PER_POINT * 3) : (PER_POINT * 3), behavior: 'smooth' })
  }

  if (isLoading) return <TabSkeleton />

  if (sorted.length < 2) {
    return <EmptyState message="검사기록이 2개 이상 있어야 추세를 볼 수 있습니다." />
  }

  const labels = sorted.map(e => e.date.slice(2, 7).replace('-', '.'))
  const odData = sorted.map(e => { const v = parseFloat(e.serOD); return isNaN(v) ? null : -v })
  const osData = sorted.map(e => { const v = parseFloat(e.serOS); return isNaN(v) ? null : -v })

  // Y축 고정: 표시 여부와 관계없이 전체 데이터 기준
  const allVals = [...odData, ...osData].filter((v): v is number => v !== null)
  const yMin = parseFloat((Math.min(...allVals) - 0.3).toFixed(1))
  const yMax = parseFloat((Math.max(...allVals) + 0.3).toFixed(1))

  const allDatasets = [
    { label: '우안(OD)', data: odData, borderColor: '#0D9488', tension: 0.4, pointRadius: 4, fill: false },
    { label: '좌안(OS)', data: osData, borderColor: '#9CA3AF', tension: 0.4, pointRadius: 4, fill: false },
  ]
  const datasets = allDatasets.filter((_, i) => (i === 0 ? showOD : showOS))

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800">굴절값(SEQ) 변화</h3>
          <div className="flex gap-1.5">
            <button
              onClick={() => { if (showOD && !showOS) { setShowOS(true) } else { setShowOD(true); setShowOS(false) } }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                showOD
                  ? 'bg-teal-100 text-[#10bcad] border border-[#10bcad]/30'
                  : 'bg-gray-100 text-gray-300 border border-transparent'
              }`}
            >
              <span className={`w-2 h-2 rounded-full transition-all ${showOD ? 'bg-[#10bcad]' : 'bg-gray-300'}`} />
              우안
            </button>
            <button
              onClick={() => { if (!showOD && showOS) { setShowOD(true) } else { setShowOD(false); setShowOS(true) } }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                showOS
                  ? 'bg-gray-100 text-gray-600 border border-gray-300'
                  : 'bg-gray-100 text-gray-300 border border-transparent'
              }`}
            >
              <span className={`w-2 h-2 rounded-full transition-all ${showOS ? 'bg-gray-400' : 'bg-gray-300'}`} />
              좌안
            </button>
          </div>
        </div>
        <div className="flex" style={{ height: 210 }}>
          {/* Y축 고정 차트 */}
          <div style={{ width: 52, flexShrink: 0 }}>
            <Line
              data={{ labels, datasets: [{ data: labels.map(() => null), borderColor: 'transparent', pointRadius: 0 }] }}
              options={{
                responsive: true, maintainAspectRatio: false,
                animation: { duration: 0 }, events: [],
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: {
                  x: { display: false },
                  y: {
                    min: yMin, max: yMax,
                    // @ts-ignore
                    afterFit: (s: any) => { s.width = 52 },
                    ticks: { callback: v => `${(v as number).toFixed(1)}D`, font: { size: 10 } },
                    grid: { color: '#F3F4F6' },
                  },
                },
                layout: { padding: { bottom: 22 } },
              }}
            />
          </div>
          {/* 스크롤 데이터 차트 */}
          <div ref={scrollRef} style={{ flex: 1, overflowX: 'auto' }}>
            <div style={{ width: sorted.length > SCROLL_THRESHOLD ? sorted.length * PER_POINT : undefined, height: '100%' }}>
              <Line
                data={{ labels, datasets }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                    y: { display: false, min: yMin, max: yMax },
                  },
                  layout: { padding: { left: 0 } },
                }}
              />
            </div>
          </div>
        </div>
        {sorted.length > SCROLL_THRESHOLD && (
          <div className="flex justify-end gap-1.5 mt-3" style={{ paddingLeft: 52 }}>
            <button onClick={() => scroll('left')}
              className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center text-base leading-none">
              ‹
            </button>
            <button onClick={() => scroll('right')}
              className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center text-base leading-none">
              ›
            </button>
          </div>
        )}
      </div>
      <div className="bg-teal-50 rounded-2xl p-4 text-sm text-teal-700">
        <div className="font-semibold mb-1 flex items-center gap-1.5"><FontAwesomeIcon icon={faCircleInfo} /> SEQ 해석 가이드</div>
        <div className="text-xs leading-relaxed">SEQ는 근시 정도를 나타내는 굴절값입니다. 그래프가 위로 올라갈수록 근시가 강해지는 것을 의미합니다. 연간 −0.50D 이상 진행 시 전문의 상담을 권장합니다.</div>
      </div>
    </div>
  )
}
