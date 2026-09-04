// 안축장 또래 참조범위 — 만 6~15세, 남녀 구분
//
// 출처: Sanz Diez P, Ohlendorf A, Schaeffel F, Wahl S.
//   "LMS parameters, percentile, and Z-score growth curves for axial length
//    in Chinese schoolchildren in Wuhan." Sci Rep. 2022;12:4850.
//   DOI: 10.1038/s41598-022-08907-5 — CC BY 4.0 (상업적 이용 포함 허용, 출처 표기 조건)
//   중국 우한 학령기 아동 14,760명. 원문 PDF는 docs/papers/ 에 보관.
//   근거 검증 기록은 docs/references.md.
//
// ⚠️ 이 값은 중국 우한 코호트 기준이다. 논문 저자들이 한계로 명시했듯
//    ("extrapolation of results to other populations") 다른 인구집단에는 차이가 있을 수 있다.
//    한국 소아의 연령별 안축장 백분위 차트는 2026-09 기준 공개된 것을 찾지 못했다.
//
// ⚠️ 이 모듈은 기록을 참조범위와 비교해 "현재 위치"를 서술할 뿐이다.
//    질병 위험을 예측하거나 선별하지 않는다. 그런 용도로 확장하지 말 것 —
//    의료기기 해당 여부 판단이 달라진다(docs/references.md §4).
//
// 구현 노트: 논문 Table 2는 전 연령·성별에서 L = 1.0이다. LMS에서 L=1은
//   분포가 정규분포라는 뜻이므로 백분위가 AL(p) = M × (1 + S × Z_p)로 정확히 나온다.
//   따라서 9개 백분위 열을 저장할 필요 없이 M·S 두 값만 있으면 된다.
//   (논문 게재값과 대조 검증: src/lib/axialPercentile.check.mts)

export type Sex = 'M' | 'F'

/** 참조범위가 존재하는 나이 구간 (논문이 다루는 범위) */
export const REF_MIN_AGE = 6
export const REF_MAX_AGE = 15
// 논문 표의 "15"는 만 15세 연령군(15.0~15.99)을 뜻한다 — 소아 연령군 표의 통상적 해석.
// 따라서 참조범위는 [6.0, 16.0)이고, 계산에 쓰는 M·S는 [6, 15]로 자른다.
const REF_MAX_EXCL = REF_MAX_AGE + 1

// 논문 Table 2의 M(중앙값, mm)과 S(변동계수). 배열 index = 나이 − 6.
const MS: Record<Sex, readonly (readonly [number, number])[]> = {
  F: [
    [22.52, 0.0362], [22.94, 0.0372], [23.37, 0.0381], [23.71, 0.0389], [23.94, 0.0395],
    [24.09, 0.0399], [24.21, 0.0402], [24.32, 0.0405], [24.41, 0.0407], [24.49, 0.0409],
  ],
  M: [
    [22.98, 0.0363], [23.42, 0.0372], [23.87, 0.0381], [24.23, 0.0388], [24.48, 0.0393],
    [24.64, 0.0397], [24.78, 0.0400], [24.90, 0.0402], [24.98, 0.0404], [25.07, 0.0406],
  ],
}

// 그리는 백분위선의 표준정규 분위수. 역정규분포 함수를 구현하는 대신
// 쓰는 값만 상수로 둔다(5개뿐이고 바뀌지 않는다).
const Z_OF: Record<PctKey, number> = {
  p10: -1.2815515655,
  p25: -0.6744897502,
  p50: 0,
  p75: 0.6744897502,
  p90: 1.2815515655,
}
export type PctKey = 'p10' | 'p25' | 'p50' | 'p75' | 'p90'
export const PCT_KEYS: readonly PctKey[] = ['p10', 'p25', 'p50', 'p75', 'p90']

/** 나이를 참조범위 안으로 자른다. 범위 밖은 양 끝값으로 고정. */
function clampAge(age: number): number {
  return Math.min(REF_MAX_AGE, Math.max(REF_MIN_AGE, age))
}

/** 해당 나이·성별의 M·S. 정수 나이 사이는 선형 보간. */
function normMS(age: number, sex: Sex): { M: number; S: number } {
  const tbl = MS[sex]
  const a = clampAge(age)
  const i = Math.min(tbl.length - 2, Math.max(0, Math.floor(a) - REF_MIN_AGE))
  const t = a - (i + REF_MIN_AGE)
  const [m0, s0] = tbl[i]
  const [m1, s1] = tbl[i + 1]
  return { M: m0 + (m1 - m0) * t, S: s0 + (s1 - s0) * t }
}

/** 표준정규 누적분포 Φ(z). Abramowitz–Stegun 7.1.26 기반 erf 근사(오차 ~1e-7). */
function phi(z: number): number {
  const x = z / Math.SQRT2
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * ax)
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax)
  return 0.5 * (1 + sign * y)
}

/** 해당 나이·성별의 백분위선 안축장(mm) */
export function alAtPercentile(key: PctKey, age: number, sex: Sex): number {
  const { M, S } = normMS(age, sex)
  return M * (1 + S * Z_OF[key])
}

/** P50(중앙값) 안축장(mm) — 예측 곡선의 감속 기준선 */
export function normP50(age: number, sex: Sex): number {
  return normMS(age, sex).M
}

/** P50 곡선의 국소 기울기(mm/년) — 나이별 진행 감속 비율 산출용 */
export function normSlope(age: number, sex: Sex): number {
  const d = 0.5
  return (normP50(age + d, sex) - normP50(age - d, sex)) / (2 * d)
}

/** 나이가 논문 참조범위(만 6세 ~ 15세 연령군) 안인가 */
export function inRefRange(age: number): boolean {
  return age >= REF_MIN_AGE && age < REF_MAX_EXCL
}

/** ISO 날짜 두 개로 만 나이(소수) 계산 */
export function calcAgeYears(birthDate: string, examDate: string): number {
  return (new Date(examDate).getTime() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
}

/**
 * 또래 백분위(1~99). 참조범위 밖 나이이거나 값이 유효하지 않으면 null.
 * null은 "모른다"는 뜻이므로 호출부에서 숫자로 대체하지 말 것.
 */
export function calcPercentile(al: number, age: number, sex: Sex): number | null {
  if (!Number.isFinite(al) || al <= 0 || !inRefRange(age)) return null
  const { M, S } = normMS(age, sex)
  const pct = phi((al / M - 1) / S) * 100
  return Math.min(99, Math.max(1, Math.round(pct)))
}

/** 백분위를 부모용 문구로. 질병·정상 판정 표현을 쓰지 않는다. */
export function pctLabel(pct: number): { prefix: string; value: string } {
  if (pct >= 75) return { prefix: '상위', value: `${100 - pct}%` }
  if (pct >= 25) return { prefix: '중간', value: '범위' }
  return                { prefix: '하위', value: `${pct}%` }
}

/** 차트용 백분위 곡선 {x: 나이, y: mm} — 만 6~15세 */
export function normCurve(key: PctKey, sex: Sex): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = []
  for (let a = REF_MIN_AGE; a <= REF_MAX_AGE + 1e-9; a += 0.25) {
    const x = parseFloat(a.toFixed(2))
    pts.push({ x, y: parseFloat(alAtPercentile(key, x, sex).toFixed(3)) })
  }
  return pts
}
