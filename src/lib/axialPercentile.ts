// Axial length normative reference data for East Asian children (ages 6–18)
// Ages 6–13: Korean pediatric myopia research cohort data.
// Ages 14–18: East Asian cohort estimates (SCORM, He et al.) — growth decelerates.
// For reference and monitoring purposes only — not a clinical diagnostic tool.

const NORM_AGES = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
const NORM: Record<string, number[]> = {
  p10: [21.6, 21.9, 22.1, 22.4, 22.7, 22.9, 23.1, 23.4, 23.5, 23.6, 23.65, 23.7,  23.7 ],
  p25: [22.0, 22.3, 22.6, 22.9, 23.2, 23.5, 23.8, 24.1, 24.3, 24.4, 24.5,  24.55, 24.6 ],
  p50: [22.5, 22.8, 23.1, 23.5, 23.8, 24.2, 24.5, 24.8, 25.0, 25.15,25.25, 25.3,  25.35],
  p75: [23.0, 23.3, 23.7, 24.1, 24.5, 24.8, 25.2, 25.5, 25.7, 25.85,25.95, 26.0,  26.05],
  p90: [23.5, 23.8, 24.2, 24.7, 25.1, 25.4, 25.8, 26.1, 26.3, 26.5, 26.6,  26.65, 26.7 ],
}

function interpNorm(key: string, age: number): number {
  const a = NORM_AGES, v = NORM[key]
  if (age <= a[0]) return v[0]
  if (age >= a[a.length - 1]) return v[v.length - 1]
  const i = a.findIndex(x => x > age) - 1
  const t = (age - a[i]) / (a[i + 1] - a[i])
  return v[i] + (v[i + 1] - v[i]) * t
}

/** Returns age in decimal years given ISO date strings */
export function calcAgeYears(birthDate: string, examDate: string): number {
  return (new Date(examDate).getTime() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
}

/** Returns percentile rank (3–97) using band interpolation */
export function calcPercentile(al: number, age: number): number {
  const b = [
    { pct: 3,  val: interpNorm('p10', age) - 0.9 },
    { pct: 10, val: interpNorm('p10', age) },
    { pct: 25, val: interpNorm('p25', age) },
    { pct: 50, val: interpNorm('p50', age) },
    { pct: 75, val: interpNorm('p75', age) },
    { pct: 90, val: interpNorm('p90', age) },
    { pct: 97, val: interpNorm('p90', age) + 0.9 },
  ]
  if (al <= b[0].val) return b[0].pct
  if (al >= b[b.length - 1].val) return b[b.length - 1].pct
  for (let i = 0; i < b.length - 1; i++) {
    if (al >= b[i].val && al < b[i + 1].val) {
      const t = (al - b[i].val) / (b[i + 1].val - b[i].val)
      return Math.round(b[i].pct + (b[i + 1].pct - b[i].pct) * t)
    }
  }
  return 50
}

/** Returns label text for a percentile */
export function pctLabel(pct: number): { text: string } {
  if (pct >= 90) return { text: `상위 ${100 - pct}%` }
  if (pct >= 75) return { text: `상위 ${100 - pct}%` }
  if (pct >= 25) return { text: '정상 범위' }
  return              { text: `하위 ${pct}%` }
}

/** Returns smooth curve points {x: ageYears, y: mm} for chart rendering */
export function normCurve(key: string): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = []
  for (let a = 6; a <= 18; a += 0.25) {
    pts.push({ x: parseFloat(a.toFixed(2)), y: parseFloat(interpNorm(key, a).toFixed(3)) })
  }
  return pts
}
