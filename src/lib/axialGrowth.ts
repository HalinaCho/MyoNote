// 안축장 연간 성장률 — 「연간 성장률 카드」와 AI 요약이 함께 쓰는 공용 계산 (한 눈 기준)
//
// 정의: "최근 1년" 추세에 초점.
//  1) 최근 12개월(가장 최근 검사일 기준) 창 안의 검사로 OLS 회귀 × 12 = mm/년.
//  2) 창 안에 검사가 2개 미만이면(=직전 검사가 1년보다 더 전) → 최근 2개 검사로 폴백(Δ÷연수).
// 주의는 두 축(상호 배타):
//  - stale(최근성): 폴백 발생 → 최근 1년 데이터가 없어 전체 기간 평균으로 계산됨.
//  - short/tentative(신뢰도): 근거 기간이 6/12개월 미만 → 연환산 오차 큼/잠정.

export interface AxialExamPoint { date: string; value: number }  // 한 눈의 (검사일, 안축장 mm)

export type GrowthCaveat =
  | { kind: 'stale'; spanMonths: number }
  | { kind: 'short'; spanMonths: number }
  | { kind: 'tentative'; spanMonths: number }

export interface AxialGrowth {
  ratePerYear: number          // mm/년
  spanMonths: number           // 계산에 실제 쓴 검사들의 첫~끝 간격(개월, 반올림)
  usedCount: number            // 계산에 쓴 검사 수
  fallback: boolean            // 최근 12개월 내 검사 2개 미만이라 최근 2개로 폴백했는지
  caveat: GrowthCaveat | null  // 최대 1개(상호 배타)
}

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * (365.25 / 12)

function monthsBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / MS_PER_MONTH
}

// OLS 기울기(월당) × 12 = 연당. 2점이면 단순 기울기와 동일.
function olsSlopePerYear(pts: { m: number; y: number }[]): number {
  const n = pts.length
  if (n < 2) return 0
  const sx = pts.reduce((s, p) => s + p.m, 0)
  const sy = pts.reduce((s, p) => s + p.y, 0)
  const sxy = pts.reduce((s, p) => s + p.m * p.y, 0)
  const sx2 = pts.reduce((s, p) => s + p.m * p.m, 0)
  const d = n * sx2 - sx * sx
  return d === 0 ? 0 : ((n * sxy - sx * sy) / d) * 12
}

export function axialGrowth(points: AxialExamPoint[]): AxialGrowth | null {
  const pts = points
    .filter(p => Number.isFinite(p.value))
    .sort((a, b) => a.date.localeCompare(b.date))
  if (pts.length < 2) return null

  const latest = pts[pts.length - 1]
  // 최근 12개월 창: 최신 검사로부터 12개월 이내(최신 포함)
  const recent = pts.filter(p => monthsBetween(p.date, latest.date) <= 12)

  const fallback = recent.length < 2
  const used = fallback ? pts.slice(-2) : recent

  const first = used[0]
  const mpts = used.map(p => ({ m: monthsBetween(first.date, p.date), y: p.value }))
  const ratePerYear = olsSlopePerYear(mpts)
  const spanMonths = Math.round(monthsBetween(first.date, used[used.length - 1].date))

  let caveat: GrowthCaveat | null = null
  if (fallback) caveat = { kind: 'stale', spanMonths }
  else if (spanMonths < 6) caveat = { kind: 'short', spanMonths }
  else if (spanMonths < 12) caveat = { kind: 'tentative', spanMonths }

  return { ratePerYear, spanMonths, usedCount: used.length, fallback, caveat }
}

// 주의 안내 문구 (카드 표시·AI 컨텍스트 공용)
export function growthCaveatText(c: GrowthCaveat): string {
  switch (c.kind) {
    case 'stale':
      return `최근 1년 안에 비교할 검사가 없어, 지난 ${c.spanMonths}개월 전체를 평균한 값이에요. 최근 1년 추세와는 다를 수 있어요.`
    case 'short':
      return `측정 기간이 ${c.spanMonths}개월로 짧아요. 짧은 기간의 작은 변화를 1년으로 늘려 계산하면 측정 오차까지 함께 커져, 실제 연간 속도와 크게 다를 수 있어요. 참고용으로만 보세요.`
    case 'tentative':
      return `측정 기간이 ${c.spanMonths}개월로 1년 미만이라 연간 성장률은 잠정 수치예요.`
  }
}
