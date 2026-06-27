// 진행 예측 — 클라이언트가 계산하는 순수 모듈 (AI 호출 없음, 결정적)
//
// 핵심 원칙: 예측은 산술이므로 AI에 맡기지 않는다(환각·계산오류 차단).
// "우리 아이의 실측 안축장·실측 진행속도"로 케어 유지/없음 시나리오를 투영한다.
//
// ⚠️ 굴절(D) 예측은 개인 단위 신뢰도가 낮아(검증연구상 95%CI ±0.9D↑, 36%만 적중)
//    의도적으로 제외한다. 안축장(mm)은 물리적 길이로 재현성이 높아 주지표로 쓴다.

import type { Child, ExamRecord, TreatmentDef } from '@/types'
import { calcAgeYears, calcPercentile } from '@/lib/axialPercentile'

// ── 케어별 축성장 감속 효과 (0~1, 문헌 평균 보수값) ──────────────
// dreamlens: Ortho-K RCT 32–63% 중 보수값 / atropine: LAMP study
// combined: 병용이 단독比 ~28%↑ / default: 커스텀·기타 일반 추정
export const CARE_EFFICACY = {
  dreamlens: 0.40,
  atropine: 0.50,
  combined: 0.60,
  default: 0.40,
} as const

export const HORIZON_YEARS = 3
// 측정 총기간이 이보다 짧으면 진행속도 추정 신뢰도가 낮다고 본다(개월)
export const MIN_SPAN_MONTHS = 6

// ── 현재 케어로부터 효과 계수·라벨 결정 ──────────────────────────
export interface CareInfo {
  onCare: boolean
  efficacy: number
  label: string
}

export function resolveCare(active: TreatmentDef[]): CareInfo {
  const presets = active.map(t => t.preset)
  const hasA = presets.includes('atropine')
  const hasD = presets.includes('dreamlens')
  if (hasA && hasD) return { onCare: true, efficacy: CARE_EFFICACY.combined, label: '아트로핀 + 드림렌즈 병용' }
  if (hasA) return { onCare: true, efficacy: CARE_EFFICACY.atropine, label: '아트로핀' }
  if (hasD) return { onCare: true, efficacy: CARE_EFFICACY.dreamlens, label: '드림렌즈' }
  if (active.length > 0) return { onCare: true, efficacy: CARE_EFFICACY.default, label: active.map(t => t.name).join('·') }
  return { onCare: false, efficacy: CARE_EFFICACY.default, label: '없음' }
}

// ── OLS 기울기 (mm/년) : (나이, 안축장) 회귀 ────────────────────
function slopePerYear(pts: { x: number; y: number }[]): number {
  if (pts.length < 2) return 0
  const n = pts.length
  const sx = pts.reduce((s, p) => s + p.x, 0)
  const sy = pts.reduce((s, p) => s + p.y, 0)
  const sxy = pts.reduce((s, p) => s + p.x * p.y, 0)
  const sx2 = pts.reduce((s, p) => s + p.x * p.x, 0)
  const d = n * sx2 - sx * sx
  return d === 0 ? 0 : (n * sxy - sx * sy) / d
}

// ── 결과 타입 ────────────────────────────────────────────────────
export interface ScenarioPoint {
  year: number   // 0~HORIZON
  age: number    // 만 나이(소수)
  al: number     // 예상 안축장 mm
  pct: number    // 또래 백분위
}
export interface EyeForecast {
  eye: 'OD' | 'OS'
  history: { age: number; al: number }[]
  currentAL: number
  currentAge: number
  measuredRate: number   // 실측 진행속도(케어 상태 반영됨) mm/년
  naturalRate: number    // 케어 없음 시 mm/년
  treatedRate: number    // 케어 유지/시행 시 mm/년
  withCare: ScenarioPoint[]
  withoutCare: ScenarioPoint[]
  diffAL: number         // HORIZON 시점 (없음 − 유지) mm
  spanMonths: number
  reliable: boolean
}
export interface Forecast {
  care: CareInfo
  horizon: number
  OD: EyeForecast | null
  OS: EyeForecast | null
  fasterEye: 'OD' | 'OS' | null
}

function round(v: number, p = 2): number {
  return Math.round(v * 10 ** p) / 10 ** p
}

function buildEye(
  eye: 'OD' | 'OS',
  exams: ExamRecord[],
  birth: string,
  care: CareInfo,
): EyeForecast | null {
  const field = eye === 'OD' ? 'axOD' : 'axOS'
  const pts = exams
    .map(e => ({ date: e.date, al: parseFloat(e[field]) }))
    .filter(p => Number.isFinite(p.al))
    .map(p => ({ age: calcAgeYears(birth, p.date), al: p.al }))
    .sort((a, b) => a.age - b.age)
  if (pts.length < 2) return null

  const current = pts[pts.length - 1]
  // 음의 진행(측정 노이즈)은 0으로 클램프 — 안축장은 실제로 줄지 않음
  const measuredRate = Math.max(0, slopePerYear(pts.map(p => ({ x: p.age, y: p.al }))))

  // 효과 역산: 케어 중이면 실측=치료된 속도이므로 자연속도를 역산한다
  let naturalRate: number
  let treatedRate: number
  if (care.onCare) {
    treatedRate = measuredRate
    naturalRate = measuredRate / (1 - care.efficacy)
  } else {
    naturalRate = measuredRate
    treatedRate = measuredRate * (1 - care.efficacy)
  }

  const mk = (rate: number): ScenarioPoint[] =>
    Array.from({ length: HORIZON_YEARS + 1 }, (_, y) => {
      const age = current.age + y
      const al = current.al + rate * y
      return { year: y, age: round(age, 2), al: round(al, 2), pct: calcPercentile(al, age) }
    })

  const withCare = mk(treatedRate)
  const withoutCare = mk(naturalRate)
  const spanMonths = round((current.age - pts[0].age) * 12, 1)

  return {
    eye,
    history: pts.map(p => ({ age: round(p.age, 2), al: p.al })),
    currentAL: current.al,
    currentAge: round(current.age, 2),
    measuredRate: round(measuredRate, 2),
    naturalRate: round(naturalRate, 2),
    treatedRate: round(treatedRate, 2),
    withCare,
    withoutCare,
    diffAL: round(withoutCare[HORIZON_YEARS].al - withCare[HORIZON_YEARS].al, 2),
    spanMonths,
    reliable: spanMonths >= MIN_SPAN_MONTHS,
  }
}

export function buildForecast(opts: {
  child: Child
  exams: ExamRecord[]
  activeTreatments: TreatmentDef[]
}): Forecast {
  const care = resolveCare(opts.activeTreatments)
  const OD = buildEye('OD', opts.exams, opts.child.birth, care)
  const OS = buildEye('OS', opts.exams, opts.child.birth, care)
  const fasterEye: 'OD' | 'OS' | null =
    OD && OS ? (OD.measuredRate >= OS.measuredRate ? 'OD' : 'OS') : OD ? 'OD' : OS ? 'OS' : null
  return { care, horizon: HORIZON_YEARS, OD, OS, fasterEye }
}
