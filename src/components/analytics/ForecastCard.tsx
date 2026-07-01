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
import { faChartLine, faTriangleExclamation, faRotateLeft } from '@fortawesome/free-solid-svg-icons'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const EYE_LABEL = { OD: '우안(OD)', OS: '좌안(OS)' } as const

const DISCLAIMER =
  '이 예측은 통계 모델 기반 추정치이며 개인의 실제 경과와 다를 수 있습니다(개별 예측 95% 신뢰구간 ±0.9D 이상). 음영은 추정 불확실성 범위이고, 측정·진단이 아닌 기록 기반 교육용 참고 자료입니다. 정확한 판단은 안과 전문의와 상담하세요.'

const SOURCE =
  '근거: 안축장 또래 기준(Tideman 2018·동아시아 코호트) · 케어 감속효과(LAMP·MiYOSMART·Ortho-K RCT 평균) · 모델 한계(BHVI Myopia Calculator 검증연구). 예측은 나이에 따른 자연 감속을 반영합니다.'

export default function ForecastCard() {
  const { activeChild, exams, activeTreatments, isLoading } = useChild()
  const [eye, setEye] = useState<'OD' | 'OS'>('OD')
  const [effOverride, setEffOverride] = useState<number | null>(null)  // 0~1
  const [horizon, setHorizon] = useState(3)

  if (isLoading) return <TabSkeleton />
  if (!activeChild?.birth) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm text-center text-gray-400 text-sm">
        진행 예측을 사용하려면 설정에서 생년월일을 등록해주세요.
      </div>
    )
  }

  const forecast = buildForecast({
    child: activeChild, exams, activeTreatments,
    efficacy: effOverride ?? undefined, horizon,
  })
  if (!forecast.OD && !forecast.OS) {
    return <EmptyState message="안축장 검사가 2회 이상 있어야 진행을 예측할 수 있습니다." />
  }

  // 기본 선택 = 더 빠르게 진행하는 쪽. 선택 eye에 데이터 없으면 반대쪽으로 폴백.
  const preferred = forecast.fasterEye ?? 'OD'
  const active = forecast[eye] ?? forecast[preferred] ?? forecast.OD ?? forecast.OS!
  const shownEye = active.eye
  const sliderVal = Math.round((effOverride ?? forecast.care.efficacy) * 100)

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

      {!active.projectable ? (
        <>
          <div className="bg-gray-50 rounded-xl p-5 text-center space-y-1.5">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-400" />
            <p className="text-sm text-gray-600 font-medium">추세 예측을 표시하려면 검사가 더 필요해요</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              짧은 간격의 측정을 1년치로 환산하면 오차가 크게 부풀려집니다. 최소 6개월(권장 1년) 간격의 안축장 검사가 쌓이면 예측이 표시돼요.
              <br />현재 측정 기간 {active.spanMonths}개월 · {EYE_LABEL[active.eye]}
            </p>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">{DISCLAIMER}</p>
        </>
      ) : (
        <>
          <Hero f={active} care={forecast.care} horizon={forecast.horizon} />
          <ForecastChart f={active} />
          <ProjectionTable f={active} horizon={forecast.horizon} />

          {/* 가정값 슬라이더 */}
          <Sliders
            effPct={sliderVal}
            defaultEffPct={Math.round(forecast.care.efficacy * 100)}
            overridden={effOverride !== null}
            onCare={forecast.care.onCare}
            horizon={horizon}
            onEff={v => setEffOverride(v / 100)}
            onResetEff={() => setEffOverride(null)}
            onHorizon={setHorizon}
          />

          <Assumptions f={active} careLabel={forecast.care.label} efficacy={forecast.efficacy} onCare={forecast.care.onCare} />

          {active.provisional && (
            <div className="flex gap-2 bg-amber-50 rounded-xl p-3">
              <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed text-amber-900">
                측정 기간이 {active.spanMonths}개월로 1년 미만이라 예측 범위(음영)가 넓고 잠정적입니다. 검사가 쌓일수록 범위가 좁아집니다.
              </p>
            </div>
          )}

          <p className="text-[11px] text-gray-400 leading-relaxed">{DISCLAIMER}</p>
          <p className="text-[10px] text-gray-300 leading-relaxed">{SOURCE}</p>
        </>
      )}
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
      ? <>현재 <b className="text-teal-600">{care.label}</b> 케어와 함께 진행 속도가 안정적으로 유지되고 있어요.<br />이대로 유지하면 <b>{horizon}년 뒤</b> 안축장 <b className="text-teal-600">{careEnd}mm</b>로 예상돼요.</>
      : <>현재 진행 속도가 비교적 안정적이에요.<br />지금 추세라면 <b>{horizon}년 뒤</b> 안축장 <b className="text-teal-600">{careEnd}mm</b>로 예상돼요.</>
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

  // Y축 범위: 케어유지 신뢰구간(lo/hi) + 케어없음 선 기준 0.5 스냅
  const allAl = [
    ...f.history.map(h => h.al),
    ...f.withCare.flatMap(p => [p.lo, p.hi]),
    ...f.withoutCare.map(p => p.al),
  ]
  const yMin = Math.floor((Math.min(...allAl) - 0.2) * 2) / 2
  const yMax = Math.ceil((Math.max(...allAl) + 0.2) * 2) / 2

  const pt = (v: { age: number }, y: number) => ({ x: v.age, y })

  return (
    <div>
      <div className="relative">
        <span className="absolute top-0 text-[9px] text-gray-400 leading-none" style={{ left: 0, zIndex: 1 }}>(mm)</span>
        <Line
          data={{
            datasets: [
              // 또래 정상범위 밴드 (P25–P75) — 중립 회색(또래 기준). teal/rose는 케어 시나리오 전용.
              { label: 'P25', data: normCurve('p25'), borderColor: 'rgba(148,163,184,0.35)', borderWidth: 1, borderDash: [4, 4], fill: '+1', backgroundColor: 'rgba(148,163,184,0.08)', pointRadius: 0, tension: 0.4 },
              { label: 'P75', data: normCurve('p75'), borderColor: 'rgba(148,163,184,0.35)', borderWidth: 1, borderDash: [4, 4], fill: false, pointRadius: 0, tension: 0.4 },
              { label: 'P50', data: normCurve('p50'), borderColor: 'rgba(148,163,184,0.6)', borderWidth: 1.5, borderDash: [6, 3], fill: false, pointRadius: 0, tension: 0.4 },

              // 신뢰구간 콘 — 케어 유지 (teal)만 표시 (겹침 방지)
              { label: '_careHi', data: f.withCare.map(p => pt(p, p.hi)), borderWidth: 0, pointRadius: 0, fill: '+1', backgroundColor: 'rgba(16,188,173,0.12)', tension: 0 },
              { label: '_careLo', data: f.withCare.map(p => pt(p, p.lo)), borderWidth: 0, pointRadius: 0, fill: false, tension: 0 },

              // 예측선 — 케어 없음 (rose 점선)
              { label: '케어 없음', data: f.withoutCare.map(p => pt(p, p.al)), borderColor: '#f43f5e', backgroundColor: '#f43f5e', borderWidth: 2.5, borderDash: [5, 4], pointRadius: f.withoutCare.map((_, i) => (i === 0 ? 0 : 3)), fill: false, tension: 0 },
              // 예측선 — 케어 유지 (teal 점선)
              { label: '케어 유지', data: f.withCare.map(p => pt(p, p.al)), borderColor: '#10bcad', backgroundColor: '#10bcad', borderWidth: 2.5, borderDash: [5, 4], pointRadius: f.withCare.map((_, i) => (i === 0 ? 0 : 3)), fill: false, tension: 0 },
              // 실측 이력 (실선)
              { label: '실측', data: f.history.map(h => pt(h, h.al)), borderColor: childColor, backgroundColor: childColor, borderWidth: 2, pointRadius: 3, pointHoverRadius: 4, fill: false, tension: 0.3 },
            ],
          }}
          options={{
            responsive: true, aspectRatio: 1.4,
            layout: { padding: { top: 16 } },
            plugins: {
              legend: { display: false },
              tooltip: {
                filter: item => !(item.dataset.label ?? '').startsWith('_'),
                callbacks: {
                  label: ctx => {
                    const n = ctx.dataset.label ?? ''
                    const y = (ctx.parsed.y ?? 0).toFixed(2)
                    if (['P25', 'P50', 'P75'].includes(n)) return `${n}: ${y}mm`
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
      {/* 범례 — 회색=또래 기준 / teal=케어 유지(+예측 범위 음영) / rose=케어 없음 / 실측 실선 */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 text-[11px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-4 h-[2px] inline-block" style={{ background: childColor }} />실측</span>
        <span className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-5 h-3 rounded-sm" style={{ backgroundColor: 'rgba(16,188,173,0.16)' }}>
            <span className="w-4 h-[2px] inline-block" style={{ background: 'repeating-linear-gradient(90deg,#10bcad 0 5px,transparent 5px 9px)' }} />
          </span>
          케어 유지 · 범위
        </span>
        <span className="flex items-center gap-1"><span className="w-5 h-[2px] inline-block" style={{ background: 'repeating-linear-gradient(90deg,#f43f5e 0 5px,transparent 5px 9px)' }} />케어 없음</span>
        <span className="flex items-center gap-1"><span className="w-4 h-2 rounded inline-block" style={{ backgroundColor: 'rgba(148,163,184,0.12)', border: '1px dashed rgba(148,163,184,0.5)' }} />또래(P25–75)</span>
      </div>
      {/* 신뢰구간 안내 — '한쪽만 음영' 혼란 해소 */}
      <p className="text-[10px] text-gray-400 leading-relaxed mt-1.5 text-center">
        음영은 예측의 <b className="font-semibold text-gray-500">불확실성 범위</b>로, 먼 미래일수록 넓어져요. 두 선이 겹치지 않도록 케어 유지 선에만 표시했으며, 케어 없음도 비슷한 폭의 불확실성을 가집니다.
      </p>
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

// ── 가정값 슬라이더 ──────────────────────────────────────────────
function Sliders({
  effPct, defaultEffPct, overridden, onCare, horizon,
  onEff, onResetEff, onHorizon,
}: {
  effPct: number; defaultEffPct: number; overridden: boolean; onCare: boolean; horizon: number
  onEff: (v: number) => void; onResetEff: () => void; onHorizon: (v: number) => void
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-3.5 space-y-3.5">
      {/* 효과 슬라이더 */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-gray-600">
            {onCare ? '케어 감속 효과' : '케어 시작 시 효과'} <span className="text-teal-600">{effPct}%</span>
          </span>
          {overridden ? (
            <button onClick={onResetEff} className="flex items-center gap-1 text-[11px] text-teal-600 font-medium">
              <FontAwesomeIcon icon={faRotateLeft} className="text-[9px]" />
              문헌값({defaultEffPct}%)
            </button>
          ) : (
            <span className="text-[10px] text-teal-600 bg-teal-50 border border-teal-100 rounded-full px-1.5 py-0.5">문헌값</span>
          )}
        </div>
        <input
          type="range" min={20} max={65} step={5} value={effPct}
          onChange={e => onEff(Number(e.target.value))}
          className="w-full accent-teal-500"
          aria-label="케어 효과"
        />
        <div className="flex justify-between text-[10px] text-gray-300 mt-0.5"><span>20%</span><span>65%</span></div>
        {effPct !== defaultEffPct && (
          <p className={`text-[10px] mt-1 leading-relaxed ${effPct > defaultEffPct ? 'text-amber-600' : 'text-gray-400'}`}>
            {effPct > defaultEffPct
              ? `문헌 평균(${defaultEffPct}%)보다 낙관적인 가정이에요. 실제 효과는 개인차가 큽니다.`
              : `문헌 평균(${defaultEffPct}%)보다 보수적인 가정이에요.`}
          </p>
        )}
      </div>
      {/* 기간 슬라이더 */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-gray-600">예측 기간 <span className="text-teal-600">{horizon}년</span></span>
        </div>
        <input
          type="range" min={1} max={5} step={1} value={horizon}
          onChange={e => onHorizon(Number(e.target.value))}
          className="w-full accent-teal-500"
          aria-label="예측 기간"
        />
        <div className="flex justify-between text-[10px] text-gray-300 mt-0.5"><span>1년</span><span>5년</span></div>
      </div>
    </div>
  )
}

// ── 예측 가정 ────────────────────────────────────────────────────
function Assumptions({ f, careLabel, efficacy, onCare }: { f: EyeForecast; careLabel: string; efficacy: number; onCare: boolean }) {
  const rows: { k: string; v: React.ReactNode }[] = [
    { k: '현재 안축장', v: `${f.currentAL.toFixed(2)} mm` },
    { k: '실측 진행속도', v: `+${f.measuredRate.toFixed(2)} mm/년` },
    { k: '진행 중 케어', v: careLabel },
    { k: onCare ? '케어 감속 효과' : '케어 시작 시 효과', v: `약 ${Math.round(efficacy * 100)}%` },
    { k: '측정 기간', v: `${f.spanMonths}개월 · ${EYE_LABEL[f.eye]}` },
  ]
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
