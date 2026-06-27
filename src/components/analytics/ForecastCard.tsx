'use client'

import { useState } from 'react'
import { useChild } from '@/context/ChildContext'
import TabSkeleton from '@/components/ui/TabSkeleton'
import EmptyState from '@/components/ui/EmptyState'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { buildForecast, type EyeForecast } from '@/lib/forecast'
import { normCurve } from '@/lib/axialPercentile'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartLine, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const EYE_LABEL = { OD: '우안(OD)', OS: '좌안(OS)' } as const

const DISCLAIMER =
  '이 예측은 통계 모델 기반 추정치이며 개인의 실제 경과와 다를 수 있습니다(개별 예측 95% 신뢰구간 ±0.9D 이상). 측정·진단이 아닌 기록 기반 교육용 참고 자료이며, 정확한 판단은 안과 전문의와 상담하세요.'

const SOURCE =
  '근거: 안축장 또래 기준(Tideman 2018·동아시아 코호트) · 케어 감속효과(LAMP·MiYOSMART·Ortho-K RCT 평균) · 모델 한계(BHVI Myopia Calculator 검증연구).'

export default function ForecastCard() {
  const { activeChild, exams, activeTreatments, isLoading } = useChild()
  const [eye, setEye] = useState<'OD' | 'OS'>('OD')

  if (isLoading) return <TabSkeleton />
  if (!activeChild?.birth) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm text-center text-gray-400 text-sm">
        진행 예측을 사용하려면 설정에서 생년월일을 등록해주세요.
      </div>
    )
  }

  const forecast = buildForecast({ child: activeChild, exams, activeTreatments })
  if (!forecast.OD && !forecast.OS) {
    return <EmptyState message="안축장 검사가 2회 이상 있어야 진행을 예측할 수 있습니다." />
  }

  // 기본 선택 = 더 빠르게 진행하는 쪽. 선택 eye에 데이터 없으면 반대쪽으로 폴백.
  const preferred = forecast.fasterEye ?? 'OD'
  const active = forecast[eye] ?? forecast[preferred] ?? forecast.OD ?? forecast.OS!
  const shownEye = active.eye

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
      {/* 헤더 + OD/OS 토글 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-teal-50 text-teal-600 shrink-0">
            <FontAwesomeIcon icon={faChartLine} className="text-sm" />
          </span>
          <h3 className="font-semibold text-gray-800">진행 예측</h3>
        </div>
        <div className="flex gap-1.5">
          {(['OD', 'OS'] as const).map(e => {
            const has = !!forecast[e]
            const on = shownEye === e
            return (
              <button
                key={e}
                disabled={!has}
                onClick={() => setEye(e)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all disabled:opacity-30 ${
                  on
                    ? (e === 'OD' ? 'bg-teal-50 text-teal-500 border border-teal-500/30' : 'bg-gray-100 text-gray-600 border border-gray-300')
                    : 'bg-gray-100 text-gray-300 border border-transparent'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${on ? (e === 'OD' ? 'bg-teal-500' : 'bg-gray-400') : 'bg-gray-300'}`} />
                {e === 'OD' ? '우안' : '좌안'}
              </button>
            )
          })}
        </div>
      </div>

      <Hero f={active} care={forecast.care} horizon={forecast.horizon} />
      <ForecastChart f={active} />
      <ProjectionTable f={active} horizon={forecast.horizon} />
      <Assumptions f={active} careLabel={forecast.care.label} efficacy={forecast.care.efficacy} onCare={forecast.care.onCare} />

      {!active.reliable && (
        <div className="flex gap-2 bg-amber-50 rounded-xl p-3">
          <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs leading-relaxed text-amber-900">
            측정 기간이 {active.spanMonths}개월로 짧아 예측 신뢰도가 낮습니다. 검사를 더 모을수록 정확해집니다.
          </p>
        </div>
      )}

      <p className="text-[11px] text-gray-400 leading-relaxed">{DISCLAIMER}</p>
      <p className="text-[10px] text-gray-300 leading-relaxed">{SOURCE}</p>
    </div>
  )
}

// ── 결론 Hero ────────────────────────────────────────────────────
function Hero({ f, care, horizon }: { f: EyeForecast; care: { onCare: boolean; label: string }; horizon: number }) {
  const end = f.withCare[horizon]
  const stable = f.diffAL < 0.1
  const careEnd = f.withCare[horizon].al.toFixed(2)
  const noCareEnd = f.withoutCare[horizon].al.toFixed(2)

  let cap: React.ReactNode
  if (stable) {
    cap = care.onCare
      ? <>현재 진행 속도가 안정적입니다.<br />케어 유지 시 {horizon}년 뒤 안축장 <b className="text-teal-600">{careEnd}mm</b>로 예상돼요.</>
      : <>현재 진행 속도가 안정적입니다.<br />{horizon}년 뒤 안축장 <b className="text-teal-600">{careEnd}mm</b>로 예상돼요.</>
  } else {
    cap = care.onCare
      ? <>지금처럼 <b className="text-teal-600">{care.label}</b> 케어를 유지하면<br /><b>{horizon}년 뒤(만 {Math.round(end.age)}세)</b>, 케어를 중단할 때보다</>
      : <>지금 <b className="text-teal-600">근시 케어를 시작</b>하면<br /><b>{horizon}년 뒤(만 {Math.round(end.age)}세)</b>, 시작하지 않을 때보다</>
  }

  return (
    <div className="rounded-2xl p-4 border border-teal-100" style={{ background: 'linear-gradient(160deg,#ffffff 0%,#e9faf8 100%)' }}>
      <p className="text-xs text-gray-500 leading-relaxed mb-2">{cap}</p>
      {!stable && (
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-gray-800 leading-none tabular-nums">−{f.diffAL.toFixed(2)}</span>
          <span className="text-sm font-bold text-gray-500">mm</span>
          <span className="text-xs text-gray-500 ml-1">안축장 덜 길어짐</span>
        </div>
      )}
      <p className="text-[11px] text-gray-400 mt-2">
        케어 시 <b className="text-teal-600">{careEnd}mm</b> · 케어 없음 시 <b className="text-rose-500">{noCareEnd}mm</b> (예상)
      </p>
    </div>
  )
}

// ── 예측 곡선 ────────────────────────────────────────────────────
function ForecastChart({ f }: { f: EyeForecast }) {
  const isOD = f.eye === 'OD'
  const childColor = isOD ? '#14b8a6' : '#9CA3AF'

  // X축 범위: 첫 측정 ~ 예측 끝
  const firstAge = f.history[0].age
  const lastProjAge = f.withoutCare[f.withoutCare.length - 1].age
  const xMin = Math.max(6, Math.floor(firstAge - 0.5))
  const xMax = Math.min(19, Math.ceil(lastProjAge + 0.3))

  // Y축 범위: 모든 값 기준 0.5 스냅
  const allAl = [
    ...f.history.map(h => h.al),
    ...f.withCare.map(p => p.al),
    ...f.withoutCare.map(p => p.al),
  ]
  const yMin = Math.floor((Math.min(...allAl) - 0.3) * 2) / 2
  const yMax = Math.ceil((Math.max(...allAl) + 0.3) * 2) / 2

  return (
    <div>
      <div className="relative">
        <span className="absolute top-0 text-[9px] text-gray-400 leading-none" style={{ left: 0, zIndex: 1 }}>(mm)</span>
        <Line
          data={{
            datasets: [
              // 또래 정상범위 밴드 (P25–P75)
              { label: 'P25', data: normCurve('p25'), borderColor: 'rgba(13,148,136,0.25)', borderWidth: 1, borderDash: [4, 4], fill: '+1', backgroundColor: 'rgba(13,148,136,0.07)', pointRadius: 0, tension: 0.4 },
              { label: 'P75', data: normCurve('p75'), borderColor: 'rgba(13,148,136,0.25)', borderWidth: 1, borderDash: [4, 4], fill: false, pointRadius: 0, tension: 0.4 },
              { label: 'P50', data: normCurve('p50'), borderColor: 'rgba(13,148,136,0.5)', borderWidth: 1.5, borderDash: [6, 3], fill: false, pointRadius: 0, tension: 0.4 },
              { label: 'P90', data: normCurve('p90'), borderColor: 'rgba(251,113,133,0.5)', borderWidth: 1, borderDash: [4, 3], fill: false, pointRadius: 0, tension: 0.4 },
              // 케어 없음 예측 (rose 점선) — 0년차(현재점)는 실측과 겹치므로 점 숨김
              { label: '케어 없음', data: f.withoutCare.map(p => ({ x: p.age, y: p.al })), borderColor: '#f43f5e', backgroundColor: '#f43f5e', borderWidth: 2.5, borderDash: [5, 4], pointRadius: f.withoutCare.map((_, i) => (i === 0 ? 0 : 3)), fill: false, tension: 0 },
              // 케어 유지/시행 예측 (teal 점선)
              { label: '케어 유지', data: f.withCare.map(p => ({ x: p.age, y: p.al })), borderColor: '#10bcad', backgroundColor: '#10bcad', borderWidth: 2.5, borderDash: [5, 4], pointRadius: f.withCare.map((_, i) => (i === 0 ? 0 : 3)), fill: false, tension: 0 },
              // 실측 이력 (실선)
              { label: '실측', data: f.history.map(h => ({ x: h.age, y: h.al })), borderColor: childColor, backgroundColor: childColor, borderWidth: 2, pointRadius: 3, pointHoverRadius: 4, fill: false, tension: 0.3 },
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
                    if (['P25', 'P50', 'P75', 'P90'].includes(n)) return `${n}: ${y}mm`
                    return `${n}: ${y}mm (${(ctx.parsed.x ?? 0).toFixed(1)}세)`
                  },
                },
              },
            },
            scales: {
              x: {
                type: 'linear', min: xMin, max: xMax,
                border: { display: false },
                ticks: { stepSize: 1, callback: v => `${v}세`, font: { size: 11 } },
                grid: { color: '#F3F4F6' },
              },
              y: {
                min: yMin, max: yMax,
                border: { display: false },
                afterFit: (s: { width: number }) => { s.width = 34 },
                ticks: { stepSize: 0.5, callback: v => (v as number).toFixed(1), font: { size: 10 } },
                grid: { color: '#F3F4F6' },
              },
            },
          }}
        />
      </div>
      {/* 범례 */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 text-[11px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded inline-block" style={{ background: childColor }} />실측</span>
        <span className="flex items-center gap-1"><svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke="#10bcad" strokeWidth="2.5" strokeDasharray="5,4" /></svg>케어 유지</span>
        <span className="flex items-center gap-1"><svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="5,4" /></svg>케어 없음</span>
        <span className="flex items-center gap-1"><span className="w-4 h-2 rounded inline-block" style={{ backgroundColor: 'rgba(13,148,136,0.15)', border: '1px dashed rgba(13,148,136,0.4)' }} />또래(P25–75)</span>
      </div>
    </div>
  )
}

// ── 연차별 예상표 ────────────────────────────────────────────────
function ProjectionTable({ f, horizon }: { f: EyeForecast; horizon: number }) {
  const rows = Array.from({ length: horizon }, (_, i) => i + 1)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-[11px] text-gray-400 border-b border-gray-200">
            <th className="text-left font-medium py-2">시점</th>
            <th className="text-right font-medium py-2 text-teal-600">케어 유지</th>
            <th className="text-right font-medium py-2 text-rose-500">케어 없음</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(y => {
            const c = f.withCare[y], n = f.withoutCare[y]
            return (
              <tr key={y} className="border-b border-gray-50 last:border-0">
                <td className="text-left py-2 text-gray-600">{y}년 후 (만 {Math.round(c.age)}세)</td>
                <td className="text-right py-2 font-bold text-teal-600">{c.al.toFixed(2)} <span className="text-[10px] font-normal text-gray-400">P{c.pct}</span></td>
                <td className="text-right py-2 font-bold text-rose-500">{n.al.toFixed(2)} <span className="text-[10px] font-normal text-gray-400">P{n.pct}</span></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── 예측 가정 ────────────────────────────────────────────────────
function Assumptions({ f, careLabel, efficacy, onCare }: { f: EyeForecast; careLabel: string; efficacy: number; onCare: boolean }) {
  const rows: { k: string; v: React.ReactNode }[] = [
    { k: '현재 안축장', v: `${f.currentAL.toFixed(2)} mm` },
    { k: '실측 진행속도', v: `+${f.measuredRate.toFixed(2)} mm/년` },
    { k: '진행 중 케어', v: careLabel },
  ]
  if (onCare || efficacy > 0) {
    rows.push({ k: onCare ? '케어 감속 효과' : '케어 시작 시 효과', v: <span>약 {Math.round(efficacy * 100)}% <span className="text-[10px] text-teal-600 bg-teal-50 border border-teal-100 rounded-full px-1.5 py-0.5 ml-1">문헌값</span></span> })
  }
  rows.push({ k: '측정 기간', v: `${f.spanMonths}개월 · ${EYE_LABEL[f.eye]}` })

  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="text-xs font-semibold text-gray-500 mb-1.5">예측 가정 (자동 계산)</div>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between py-1 text-[13px]">
          <span className="text-gray-500">{r.k}</span>
          <span className="font-semibold text-gray-700">{r.v}</span>
        </div>
      ))}
    </div>
  )
}
