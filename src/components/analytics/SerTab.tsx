'use client'

import { useState, useRef, useEffect } from 'react'
import { useChild } from '@/context/ChildContext'
import TabSkeleton from '@/components/ui/TabSkeleton'
import EmptyState from '@/components/ui/EmptyState'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const SCROLL_THRESHOLD = 8
const PER_POINT = 52

export default function SerTab() {
  const { exams, isLoading } = useChild()
  const [showOD, setShowOD] = useState(true)
  const [showOS, setShowOS] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const sorted = [...exams].sort((a, b) => a.date.localeCompare(b.date))

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    })
    return () => cancelAnimationFrame(id)
  }, [exams.length])

  // 선택 데이터 (기본 null = 최신), 수직선/박스용 ref·상태
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const chartRef = useRef<any>(null)
  const idxRef = useRef(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const [boxX, setBoxX] = useState<number | null>(null)
  const [innerW, setInnerW] = useState(0)
  const [boxW, setBoxW] = useState(0)
  useEffect(() => {
    const syncFn = () => {
      const chart = chartRef.current
      if (!chart) return
      chart.update()
      const metas = chart.getSortedVisibleDatasetMetas?.() ?? []
      const pt = metas[0]?.data?.[idxRef.current]
      if (pt) setBoxX(pt.x)
      if (scrollRef.current) setInnerW(scrollRef.current.scrollWidth)
    }
    syncFn()
    window.addEventListener('resize', syncFn)
    return () => window.removeEventListener('resize', syncFn)
  }, [activeIdx, showOD, showOS, sorted.length])
  useEffect(() => {
    if (boxRef.current) setBoxW(boxRef.current.offsetWidth)
  }, [activeIdx, showOD, showOS, sorted.length, boxX])

  if (isLoading) return <TabSkeleton />

  if (sorted.length < 2) {
    return <EmptyState message="검사기록이 2개 이상 있어야 추세를 볼 수 있습니다." />
  }

  const labels = sorted.map(e => e.date.slice(2, 7).replace('-', '.'))
  const odData = sorted.map(e => { const v = parseFloat(e.serOD); return isNaN(v) ? null : -v })
  const osData = sorted.map(e => { const v = parseFloat(e.serOS); return isNaN(v) ? null : -v })

  // Y축 고정: 표시 여부와 관계없이 전체 데이터 기준, 0.5 단위로 스냅
  const allVals = [...odData, ...osData].filter((v): v is number => v !== null)
  const yMin = Math.floor((Math.min(...allVals) - 0.3) * 2) / 2
  const yMax = Math.ceil((Math.max(...allVals) + 0.3) * 2) / 2

  const allDatasets = [
    { label: '우안(OD)', data: odData, borderColor: '#10bcad', backgroundColor: 'rgba(16,188,173,0.08)', pointBackgroundColor: '#10bcad', tension: 0.4, pointRadius: 4, fill: true },
    { label: '좌안(OS)', data: osData, borderColor: '#9CA3AF', backgroundColor: 'rgba(156,163,175,.08)', pointBackgroundColor: '#9CA3AF', tension: 0.4, pointRadius: 4, fill: true },
  ]
  const datasets = allDatasets.filter((_, i) => (i === 0 ? showOD : showOS))

  // 선택 데이터 (raw SEQ는 음수 그대로 표시)
  const idx = Math.min(Math.max(activeIdx ?? (sorted.length - 1), 0), sorted.length - 1)
  idxRef.current = idx
  const activeExam = sorted[idx]
  const activeOD = parseFloat(activeExam.serOD)
  const activeOS = parseFloat(activeExam.serOS)

  const half = (boxW ? boxW / 2 : 50) + 4
  const boxLeft = boxX == null ? null
    : Math.max(half, Math.min(boxX, (innerW || boxX + half) - half))

  // 선택 지점 수직선: 데이터 선 뒤, 점선 그레이, 박스까지 연결
  const crosshair = {
    id: 'crosshair',
    beforeDatasetsDraw(chart: any) {
      const metas = chart.getSortedVisibleDatasetMetas()
      if (!metas.length) return
      const pt = metas[0].data[idxRef.current]
      if (!pt) return
      const { ctx, chartArea } = chart
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(pt.x, 0)
      ctx.lineTo(pt.x, chartArea.bottom)
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 3])
      ctx.strokeStyle = '#9CA3AF'
      ctx.stroke()
      ctx.restore()
    },
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800">굴절도수 변화 추이</h3>
          <div className="flex gap-1.5">
            <button
              onClick={() => { if (showOD && !showOS) { setShowOS(true) } else { setShowOD(true); setShowOS(false) } }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                showOD
                  ? 'bg-teal-50 text-[#10bcad] border border-[#10bcad]/30'
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
        <div className="flex" style={{ aspectRatio: '3/2' }}>
          {/* Y축 고정 차트 */}
          <div style={{ width: 38, flexShrink: 0, position: 'relative' }}>
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
                    afterFit: (s: any) => { s.width = 38 },
                    ticks: { stepSize: 0.5, callback: v => `-${(v as number).toFixed(1)}D`, font: { size: 10 } },
                    grid: { color: '#F3F4F6' },
                  },
                },
                layout: { padding: { top: 40, bottom: 22 } },
              }}
            />
          </div>
          {/* 스크롤 데이터 차트 */}
          <div ref={scrollRef} style={{ flex: 1, overflowX: 'auto' }}>
            <div style={{ width: sorted.length > SCROLL_THRESHOLD ? sorted.length * PER_POINT : undefined, height: '100%', position: 'relative' }}>
              {/* 선택 데이터 박스 (수직선 끝과 연결) */}
              {boxLeft != null && (
                <div className="absolute z-20 -translate-x-1/2" style={{ left: boxLeft, top: 0 }}>
                  <div
                    ref={boxRef}
                    className="rounded-xl px-2.5 py-1.5 text-center whitespace-nowrap"
                    style={{ backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.05), 0 6px 16px -4px rgba(17,24,39,0.12)' }}
                  >
                    <div className="text-[10px] text-gray-500 leading-tight">{activeExam.date.replace(/-/g, '.')}</div>
                    <div className="flex items-center justify-center gap-1.5 leading-tight mt-0.5 text-[11px] font-bold text-gray-800">
                      {showOD && !isNaN(activeOD) && (
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#10bcad]" />{activeOD.toFixed(2)}</span>
                      )}
                      {showOS && !isNaN(activeOS) && (
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />{activeOS.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <Line
                ref={chartRef}
                data={{ labels, datasets }}
                plugins={[crosshair]}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  onClick: (_evt, els) => { if (els.length) setActiveIdx(els[0].index) },
                  plugins: { legend: { display: false }, tooltip: { enabled: false } },
                  scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                    y: { display: false, min: yMin, max: yMax },
                  },
                  layout: { padding: { top: 40, left: 0 } },
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-teal-50 rounded-2xl p-4 text-sm text-teal-700">
        <div className="font-semibold mb-1 flex items-center gap-1.5"><FontAwesomeIcon icon={faCircleInfo} /> SEQ 해석 가이드</div>
        <div className="text-xs leading-relaxed">SEQ는 근시 정도를 나타내는 굴절값입니다. 그래프가 위로 올라갈수록 근시가 강해지는 것을 의미합니다. 연간 −0.50D 이상 진행 시 전문의 상담을 권장합니다.</div>
      </div>
    </div>
  )
}
