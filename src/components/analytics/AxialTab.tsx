'use client'

import { useState, useRef, useEffect } from 'react'
import { useChild } from '@/context/ChildContext'
import TabSkeleton from '@/components/ui/TabSkeleton'
import EmptyState from '@/components/ui/EmptyState'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { calcAgeYears, calcPercentile, pctLabel, normCurve } from '@/lib/axialPercentile'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

export default function AxialTab() {
  const { exams, activeChild, isLoading } = useChild()

  const sorted = [...exams]
    .filter(e => e.axOD || e.axOS)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (isLoading) return <TabSkeleton />

  if (sorted.length < 2) {
    return <EmptyState message="안축장 기록이 2개 이상 있어야 추세를 볼 수 있습니다." />
  }

  return (
    <div className="space-y-3">
      <TrendView exams={sorted} />
      <PctView exams={sorted} birth={activeChild?.birth} />
    </div>
  )
}

// ── 변화 추이 뷰 ──────────────────────────────────────────────────

const SCROLL_THRESHOLD = 8
const PER_POINT = 52

function TrendView({ exams }: { exams: { date: string; axOD: string; axOS: string }[] }) {
  const [showOD, setShowOD] = useState(true)
  const [showOS, setShowOS] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    })
    return () => cancelAnimationFrame(id)
  }, [exams.length])

  const labels = exams.map(e => e.date.slice(2, 7).replace('-', '.'))
  const odData = exams.map(e => parseFloat(e.axOD) || null)
  const osData = exams.map(e => parseFloat(e.axOS) || null)

  // Y축 고정: 표시 여부와 관계없이 전체 데이터 기준, 0.5 단위로 스냅
  const allVals = [...odData, ...osData].filter((v): v is number => v !== null)
  const yMin = Math.floor((Math.min(...allVals) - 0.3) * 2) / 2
  const yMax = Math.ceil((Math.max(...allVals) + 0.3) * 2) / 2

  const allDatasets = [
    { label: '우안(OD)', data: odData, borderColor: '#10bcad', backgroundColor: 'rgba(16,188,173,0.08)', pointBackgroundColor: '#10bcad', tension: 0.4, fill: true, pointRadius: 4 },
    { label: '좌안(OS)', data: osData, borderColor: '#9CA3AF', backgroundColor: 'rgba(156,163,175,.08)', pointBackgroundColor: '#9CA3AF', tension: 0.4, fill: true, pointRadius: 4 },
  ]
  const datasets = allDatasets.filter((_, i) => (i === 0 ? showOD : showOS))

  // 선택된 데이터 (기본: 최신)
  const [activeIdx, setActiveIdx] = useState(exams.length - 1)
  const idx = Math.min(Math.max(activeIdx, 0), exams.length - 1)
  const activeExam = exams[idx]
  const activeOD = parseFloat(activeExam.axOD)
  const activeOS = parseFloat(activeExam.axOS)

  // 플러그인이 항상 최신 idx를 읽도록 ref 사용 (closure 고정 방지)
  const chartRef = useRef<any>(null)
  const idxRef = useRef(idx)
  idxRef.current = idx

  // 값 박스 위치 (선택 지점의 픽셀 x) + 컨테이너 너비
  const [boxX, setBoxX] = useState<number | null>(null)
  const [innerW, setInnerW] = useState(0)
  useEffect(() => {
    const sync = () => {
      const chart = chartRef.current
      if (!chart) return
      chart.update()
      const metas = chart.getSortedVisibleDatasetMetas?.() ?? []
      const pt = metas[0]?.data?.[idxRef.current]
      if (pt) setBoxX(pt.x)
      if (scrollRef.current) setInnerW(scrollRef.current.scrollWidth)
    }
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [activeIdx, showOD, showOS, exams.length])

  // 박스 실제 너비 측정 → 양끝에서 잘리지 않도록 클램프 (선은 실제 지점, 박스만 살짝 이동)
  const boxRef = useRef<HTMLDivElement>(null)
  const [boxW, setBoxW] = useState(0)
  useEffect(() => {
    if (boxRef.current) setBoxW(boxRef.current.offsetWidth)
  }, [activeIdx, showOD, showOS, exams.length, boxX])
  const half = (boxW ? boxW / 2 : 50) + 4
  const boxLeft = boxX == null ? null
    : Math.max(half, Math.min(boxX, (innerW || boxX + half) - half))

  // 선택 지점 수직선: 데이터 선 뒤(beforeDatasetsDraw), 연한 그레이, 박스까지 연결
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
    <>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800">안축장 변화 추이</h3>
          {/* 커스텀 범례 토글 */}
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
          <div style={{ width: 34, flexShrink: 0, position: 'relative' }}>
            <span className="absolute top-0 text-[9px] text-gray-400 leading-none text-right" style={{ left: 0, width: 31, zIndex: 1 }}>(mm)</span>
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
                    afterFit: (s: any) => { s.width = 34 },
                    ticks: { stepSize: 0.5, callback: v => `${(v as number).toFixed(1)}`, font: { size: 10 } },
                    grid: { color: '#F3F4F6' },
                  },
                },
                layout: { padding: { top: 40, bottom: 22 } },
              }}
            />
          </div>
          {/* 스크롤 데이터 차트 */}
          <div ref={scrollRef} style={{ flex: 1, overflowX: 'auto' }}>
            <div style={{ width: exams.length > SCROLL_THRESHOLD ? exams.length * PER_POINT : undefined, height: '100%', position: 'relative' }}>
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
      <GrowthRateCard exams={exams} />
    </>
  )
}

// ── 또래 비교 뷰 ──────────────────────────────────────────────────

function PctView({
  exams, birth,
}: { exams: { date: string; axOD: string; axOS: string }[]; birth?: string }) {
  const [showPctInfo, setShowPctInfo] = useState(false)
  if (!birth) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm text-center text-gray-400 text-sm">
        또래 비교를 사용하려면 설정에서 생년월일을 등록해주세요.
      </div>
    )
  }

  const withBoth = exams.filter(e => e.axOD && e.axOS)
  const childOD = withBoth.map(e => ({ x: parseFloat(calcAgeYears(birth, e.date).toFixed(2)), y: parseFloat(e.axOD) }))
  const childOS = withBoth.map(e => ({ x: parseFloat(calcAgeYears(birth, e.date).toFixed(2)), y: parseFloat(e.axOS) }))

  // X축: 오늘 기준 현재 나이 ±3세, 참조 데이터 범위(6–18) 내 클램프
  const today = new Date().toISOString().slice(0, 10)
  const curAge = Math.floor(calcAgeYears(birth, today))
  const xMin = Math.max(6,  curAge - 3)
  const xMax = Math.min(18, curAge + 3)

  // 참조 데이터 범위(6~18세) 밖이면 차트 대신 안내
  if (xMin >= xMax) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm text-center space-y-1">
        <p className="text-sm text-gray-500">또래 비교 기준 데이터는 만 6~18세까지 제공됩니다.</p>
        <p className="text-xs text-gray-400">현재 만 {curAge}세</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800">또래 안축장 백분위 비교</h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 rounded bg-[#10bcad] inline-block"/>우안
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 rounded bg-gray-400 inline-block"/>좌안
            </span>
          </div>
        </div>
        </div>

        <div className="relative">
        <span className="absolute top-0 text-[9px] text-gray-400 leading-none text-right" style={{ left: 0, width: 31, zIndex: 1 }}>(mm)</span>
        <Line
          data={{
            datasets: [
              // P25–P75 채움 밴드
              {
                label: 'P25', data: normCurve('p25'),
                borderColor: 'rgba(13,148,136,0.25)', borderWidth: 1,
                // @ts-ignore
                borderDash: [4, 4], fill: '+1',
                backgroundColor: 'rgba(13,148,136,0.08)',
                pointRadius: 0, tension: 0.4,
              },
              {
                label: 'P75', data: normCurve('p75'),
                borderColor: 'rgba(13,148,136,0.25)', borderWidth: 1,
                // @ts-ignore
                borderDash: [4, 4], fill: false,
                pointRadius: 0, tension: 0.4,
              },
              // P50 중앙값
              {
                label: 'P50', data: normCurve('p50'),
                borderColor: 'rgba(13,148,136,0.55)', borderWidth: 1.5,
                // @ts-ignore
                borderDash: [6, 3], fill: false,
                pointRadius: 0, tension: 0.4,
              },
              // P90
              {
                label: 'P90', data: normCurve('p90'),
                borderColor: 'rgba(251,113,133,0.6)', borderWidth: 1.5,
                // @ts-ignore
                borderDash: [4, 3], fill: false,
                pointRadius: 0, tension: 0.4,
              },
              // P10
              {
                label: 'P10', data: normCurve('p10'),
                borderColor: 'rgba(156,163,175,0.45)', borderWidth: 1,
                // @ts-ignore
                borderDash: [3, 3], fill: false,
                pointRadius: 0, tension: 0.4,
              },
              // 아이 실측값
              {
                label: '우안(OD)', data: childOD,
                borderColor: '#10bcad', backgroundColor: '#10bcad',
                borderWidth: 2.5, pointRadius: 3, pointHoverRadius: 5,
                fill: false, tension: 0.3,
              },
              {
                label: '좌안(OS)', data: childOS,
                borderColor: '#9CA3AF', backgroundColor: '#9CA3AF',
                borderWidth: 2.5, pointRadius: 3, pointHoverRadius: 5,
                fill: false, tension: 0.3,
              },
            ],
          }}
          options={{
            responsive: true, aspectRatio: 1.5,
            layout: { padding: { top: 16 } },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: ctx => {
                    const n = ctx.dataset.label ?? ''
                    const y = (ctx.parsed.y ?? 0).toFixed(2)
                    if (['P10','P25','P50','P75','P90'].includes(n)) return `${n}: ${y}mm`
                    return `${n}: ${y}mm (${(ctx.parsed.x ?? 0).toFixed(1)}세)`
                  },
                },
              },
            },
            scales: {
              x: {
                type: 'linear' as const,
                min: xMin, max: xMax,
                border: { display: false },
                ticks: { stepSize: 1, callback: v => `${v}세`, font: { size: 11 } },
                grid: { color: '#F3F4F6' },
              },
              y: {
                min: 21, max: 27,
                border: { display: false },
                // @ts-ignore
                afterFit: (s: any) => { s.width = 34 },
                ticks: { stepSize: 1, callback: v => (v as number).toFixed(0), font: { size: 10 } },
                grid: { color: '#F3F4F6' },
              },
            },
          }}
        />
        </div>

        {/* 차트 범례 */}
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-5 h-2 rounded" style={{ backgroundColor: 'rgba(13,148,136,0.15)', border: '1px dashed rgba(13,148,136,0.4)' }}/>
            정상범위 (P25–P75)
          </span>
          <span className="flex items-center gap-1">
            <svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke="rgba(13,148,136,0.6)" strokeWidth="1.5" strokeDasharray="6,3"/></svg>
            P50 중앙값
          </span>
          <span className="flex items-center gap-1">
            <svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke="rgba(251,113,133,0.7)" strokeWidth="1.5" strokeDasharray="4,3"/></svg>
            P90
          </span>
        </div>
        <div className="mt-2 text-center">
          <button
            type="button"
            onClick={() => setShowPctInfo(v => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            <FontAwesomeIcon icon={faCircleInfo} className="text-[#10bcad]" />
            백분위(P)란?
            <FontAwesomeIcon icon={showPctInfo ? faChevronUp : faChevronDown} className="text-[9px] text-gray-400" />
          </button>
          {showPctInfo && (
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
              백분위(P)는 같은 나이 또래 100명 중 순위예요.<br />높을수록 안축장이 긴 편입니다.
            </p>
          )}
        </div>

        <PctSummaryInline exams={withBoth} birth={birth} />
      </div>

      <p className="text-[10px] text-gray-400 px-1">
        * 만 6~13세: 한국 소아 근시 코호트 기준값. 만 14~18세: 동아시아 코호트 추정값(SCORM 등). 정확한 평가는 전문의와 상담하세요.
      </p>
    </>
  )
}

// ── 백분위 바 ────────────────────────────────────────────────────

function PctBar({ pct }: { pct: number }) {
  return (
    <div className="mt-2.5">
      <div className="relative h-1 bg-white rounded-full overflow-visible">
        <div className="h-full bg-[#10bcad] rounded-full opacity-40" style={{ width: `${pct}%` }} />
        <div
          className="absolute top-1/2 w-2.5 h-2.5 bg-[#10bcad] rounded-full border-2 border-white shadow-sm"
          style={{ left: `${Math.min(pct, 97)}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-gray-300 mt-1.5">
        <span>P0</span><span>P50</span><span>P100</span>
      </div>
    </div>
  )
}

// ── 또래 비교 요약 (인라인) ───────────────────────────────────────

function PctSummaryInline({
  exams, birth,
}: { exams: { date: string; axOD: string; axOS: string }[]; birth: string }) {
  const latest = [...exams].sort((a, b) => b.date.localeCompare(a.date))[0]
  if (!latest) return null

  const ageYears = calcAgeYears(birth, latest.date)
  const ageInt   = Math.floor(ageYears)
  const odMm = parseFloat(latest.axOD)
  const osMm = parseFloat(latest.axOS)
  if (isNaN(odMm) || isNaN(osMm)) return null

  const pOD = calcPercentile(odMm, ageYears)
  const pOS = calcPercentile(osMm, ageYears)
  const lOD = pctLabel(pOD)
  const lOS = pctLabel(pOS)

  return (
    <div className="mt-4 pt-3 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500">최근 검사 기준</span>
        <span className="text-xs text-gray-400">만 {ageInt}세 기준</span>
      </div>

      <div className="flex gap-3">
        {[
          { label: '우안 (OD)', mm: odMm, pct: pOD, l: lOD },
          { label: '좌안 (OS)', mm: osMm, pct: pOS, l: lOS },
        ].map(({ label, mm, pct, l }) => (
          <div key={label} className="flex-1 bg-[#edf7f6] rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-2">{label}</div>
            <div className="text-xl font-black text-gray-800 leading-none">
              {mm.toFixed(2)}<span className="text-xs font-normal text-gray-400 ml-0.5">mm</span>
            </div>
            <div className="mt-2 text-xl font-black text-[#10bcad] leading-none">
              {l.prefix} {l.value}
            </div>
            <PctBar pct={pct} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 성장률 카드 ───────────────────────────────────────────────────

function linearSlope(xs: number[], ys: (number | null)[]): number {
  const pairs = xs
    .map((x, i) => [x, ys[i]] as [number, number | null])
    .filter((p): p is [number, number] => p[1] != null)
  if (pairs.length < 2) return 0
  const n   = pairs.length
  const sx  = pairs.reduce((s, [x])    => s + x,     0)
  const sy  = pairs.reduce((s, [, y])  => s + y,     0)
  const sxy = pairs.reduce((s, [x, y]) => s + x * y, 0)
  const sx2 = pairs.reduce((s, [x])    => s + x * x, 0)
  const denom = n * sx2 - sx * sx
  return denom === 0 ? 0 : ((n * sxy - sx * sy) / denom) * 12
}

function GrowthRateCard({ exams }: { exams: { date: string; axOD: string; axOS: string }[] }) {
  if (exams.length < 2) return null

  const first  = new Date(exams[0].date).getTime()
  const xs     = exams.map(e => (new Date(e.date).getTime() - first) / (1000 * 60 * 60 * 24 * 30.4))
  const odData = exams.map(e => parseFloat(e.axOD) || null)
  const osData = exams.map(e => parseFloat(e.axOS) || null)
  const growthOD = linearSlope(xs, odData)
  const growthOS = linearSlope(xs, osData)

  const badge = (g: number) =>
    Math.abs(g) < 0.2  ? { label: '안정', cls: 'bg-teal-100 text-teal-700' }
    : Math.abs(g) < 0.35 ? { label: '주의', cls: 'bg-amber-100 text-amber-700' }
    : { label: '진행', cls: 'bg-rose-100 text-rose-700' }

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
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500"/>안정 &lt;0.20</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"/>주의 0.20–0.35</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400"/>진행 &gt;0.35</span>
      </div>
    </div>
  )
}
