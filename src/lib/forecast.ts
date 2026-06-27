// 진행 예측 — 클라이언트가 계산하는 순수 모듈 (AI 호출 없음, 결정적)
//
// 핵심 원칙: 예측은 산술이므로 AI에 맡기지 않는다(환각·계산오류 차단).
// "우리 아이의 실측 안축장·실측 진행속도"로 케어 유지/없음 시나리오를 투영한다.
//
// ⚠️ 굴절(D) 예측은 개인 단위 신뢰도가 낮아(검증연구상 95%CI ±0.9D↑, 36%만 적중)
//    의도적으로 제외한다. 안축장(mm)은 물리적 길이로 재현성이 높아 주지표로 쓴다.
//
// 모델 특징:
//  1) 나이별 진행 감속 — 또래(P50) 곡선의 감속 비율을 반영해 직선이 아닌 곡선으로 투영
//  2) 신뢰구간 콘 — 측정 산포(회귀 잔차)+문헌 기반 불확실성이 먼 미래로 갈수록 넓어짐

import type { Child, ExamRecord, TreatmentDef } from '@/types'
import { calcAgeYears, calcPercentile, normP50, normSlope } from '@/lib/axialPercentile'

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
// 신뢰구간 콘: 연차당 추가 불확실성(mm) + 기본 폭 하한(mm)
const CONE_PER_YEAR = 0.12
const CONE_FLOOR = 0.08

// ── 현재 케어로부터 효과 계수·라벨 결정 ──────────────────────────
export interface CareInfo {
  onCare: boolean
  efficacy: number   // 문헌 기본값
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

// ── OLS 회귀 (나이→안축장) ───────────────────────────────────────
interface Fit { slope: number; intercept: number }
function olsFit(pts: { x: number; y: number }[]): Fit {
  if (pts.length < 2) return { slope: 0, intercept: pts[0]?.y ?? 0 }
  const n = pts.length
  const sx = pts.reduce((s, p) => s + p.x, 0)
  const sy = pts.reduce((s, p) => s + p.y, 0)
  const sxy = pts.reduce((s, p) => s + p.x * p.y, 0)
  const sx2 = pts.reduce((s, p) => s + p.x * p.x, 0)
  const d = n * sx2 - sx * sx
  const slope = d === 0 ? 0 : (n * sxy - sx * sy) / d
  const intercept = sy / n - slope * (sx / n)
  return { slope, intercept }
}

// 측정점이 회귀선에서 흩어진 정도(mm) — 콘 폭 개인화에 사용. 2점 이하면 0.
function residualSD(pts: { x: number; y: number }[], fit: Fit): number {
  if (pts.length < 3) return 0
  const ss = pts.reduce((s, p) => s + (p.y - (fit.slope * p.x + fit.intercept)) ** 2, 0)
  return Math.sqrt(ss / pts.length)
}

// ── 결과 타입 ────────────────────────────────────────────────────
export interface ScenarioPoint {
  year: number   // 0~horizon
  age: number    // 만 나이(소수)
  al: number     // 예상 안축장 mm
  pct: number    // 또래 백분위
  lo: number     // 신뢰구간 하한 mm
  hi: number     // 신뢰구간 상한 mm
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
  diffAL: number         // horizon 시점 (없음 − 유지) mm
  spanMonths: number
  reliable: boolean
  residSD: number        // 측정 산포 mm
}
export interface Forecast {
  care: CareInfo
  efficacy: number       // 실제 적용된 효과(오버라이드 반영)
  horizon: number
  decelerated: boolean   // 나이별 감속 적용 여부
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
  defaultEff: number,   // 문헌 기본 효과 — 케어 중 아이의 자연속도 역산 기준(고정)
  appliedEff: number,   // 슬라이더 효과 — 케어 유지(treated) 선에 적용
  onCare: boolean,
  horizon: number,
): EyeForecast | null {
  const field = eye === 'OD' ? 'axOD' : 'axOS'
  const pts = exams
    .map(e => ({ date: e.date, al: parseFloat(e[field]) }))
    .filter(p => Number.isFinite(p.al))
    .map(p => ({ age: calcAgeYears(birth, p.date), al: p.al }))
    .sort((a, b) => a.age - b.age)
  if (pts.length < 2) return null

  const current = pts[pts.length - 1]
  const xy = pts.map(p => ({ x: p.age, y: p.al }))
  const fit = olsFit(xy)
  // 음의 진행(측정 노이즈)은 0으로 클램프 — 안축장은 실제로 줄지 않음
  const measuredRate = Math.max(0, fit.slope)
  const sd = residualSD(xy, fit)

  // 케어 없음(natural)을 고정 기준으로 삼고, 케어 유지(treated)에 슬라이더 효과를 적용한다.
  // → "케어 감속 효과" 슬라이더는 항상 케어 유지(녹색) 선을 움직인다.
  //  - 케어 중 아이: 실측은 이미 치료된 속도 → 문헌 기본효과로 자연속도를 1회 역산(고정).
  //    슬라이더가 문헌값이면 treated가 실측과 정확히 일치한다.
  //  - 케어 안 함: 실측이 곧 자연속도(고정).
  const naturalRate = onCare && defaultEff < 1 ? measuredRate / (1 - defaultEff) : measuredRate
  const treatedRate = naturalRate * (1 - appliedEff)

  // 나이별 감속: 또래 P50 곡선의 감속 비율로 미래 속도를 줄인다.
  // baseSlope가 너무 작으면(고연령) 선형으로 폴백.
  const baseSlope = normSlope(current.age)
  const decel = baseSlope > 0.05
  const refP50 = normP50(current.age)
  const projectAL = (rate: number, y: number): number => {
    if (!decel) return current.al + rate * y
    return current.al + (rate / baseSlope) * (normP50(current.age + y) - refP50)
  }
  const halfWidth = (y: number): number => Math.max(CONE_FLOOR, sd) + CONE_PER_YEAR * y

  const mk = (rate: number): ScenarioPoint[] =>
    Array.from({ length: horizon + 1 }, (_, y) => {
      const age = current.age + y
      const al = projectAL(rate, y)
      const w = halfWidth(y)
      return {
        year: y,
        age: round(age, 2),
        al: round(al, 2),
        pct: calcPercentile(al, age),
        lo: round(al - w, 2),
        hi: round(al + w, 2),
      }
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
    diffAL: round(withoutCare[horizon].al - withCare[horizon].al, 2),
    spanMonths,
    reliable: spanMonths >= MIN_SPAN_MONTHS,
    residSD: round(sd, 3),
  }
}

export function buildForecast(opts: {
  child: Child
  exams: ExamRecord[]
  activeTreatments: TreatmentDef[]
  efficacy?: number   // 슬라이더 오버라이드 (0~1)
  horizon?: number    // 예측 연수 오버라이드
}): Forecast {
  const care = resolveCare(opts.activeTreatments)
  const efficacy = Math.min(0.95, Math.max(0, opts.efficacy ?? care.efficacy))
  const horizon = Math.min(5, Math.max(1, Math.round(opts.horizon ?? HORIZON_YEARS)))
  const OD = buildEye('OD', opts.exams, opts.child.birth, care.efficacy, efficacy, care.onCare, horizon)
  const OS = buildEye('OS', opts.exams, opts.child.birth, care.efficacy, efficacy, care.onCare, horizon)
  const fasterEye: 'OD' | 'OS' | null =
    OD && OS ? (OD.measuredRate >= OS.measuredRate ? 'OD' : 'OS') : OD ? 'OD' : OS ? 'OS' : null
  const decelerated = (OD ?? OS) ? normSlope((OD ?? OS)!.currentAge) > 0.05 : false
  return { care, efficacy, horizon, decelerated, OD, OS, fasterEye }
}
