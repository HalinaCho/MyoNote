// AI 월간 리포트 — 클라이언트가 계산하는 "리포트 컨텍스트" + 출력 타입
//
// 핵심 원칙: 숫자(백분위·증감·달성률)는 전부 여기서 계산하고,
// AI는 이 숫자를 "말로 풀어주기만" 한다. AI에게 산술을 시키지 않으므로
// 의료적으로 안전하고(계산 오류·환각 방지), 토큰도 적게 들며, 결과가 결정적이다.

import type { Child, ExamRecord, TreatmentLogs, LifestyleLogs, TreatmentDef } from '@/types'
import { calcPercentile, calcAgeYears } from '@/lib/axialPercentile'
import { axialGrowth, growthCaveatText } from '@/lib/axialGrowth'
import { calcStreak } from '@/lib/utils/compliance'
import { formatDate, parseDate, today } from '@/lib/utils/date'

// ── AI에 보내는 컨텍스트 (모두 익명화된 숫자) ─────────────────
export interface AxialEyeLatest {
  value: number | null   // mm
  pct: number | null     // 또래 백분위 (3~97)
}
export interface AxialSummary {
  latestDate: string
  od: AxialEyeLatest
  os: AxialEyeLatest
  delta: { od: number | null; os: number | null; months: number } | null  // mm, 직전 검사 대비
  annualized: { od: number | null; os: number | null } | null             // mm/년 (최근 12개월 회귀, 카드와 동일)
  annualizedNote: string | null                                           // 잠정/최근1년데이터부족 등 주의 안내
}
export interface RefractionSummary {
  latestDate: string
  serOD: number | null   // SEQ (D)
  serOS: number | null
  delta: { od: number | null; os: number | null; months: number } | null  // D, 직전 검사 대비
}
export interface LifestyleSummary {
  daysLogged: number
  outdoor: { avgH: number; goalH: number } | null
  phone: { avgH: number; goalH: number } | null
  sleep: { avgH: number } | null
}
export interface ComplianceSummary {
  overallPct: number | null
  streak: number
  byTreatment: { name: string; pct: number }[]
}
export interface ReportContext {
  child: { ageYears: number; gender: 'M' | 'F' }
  period: { label: string; from: string; to: string }
  axial: AxialSummary | null
  refraction: RefractionSummary | null
  lifestyle: LifestyleSummary
  compliance: ComplianceSummary
  dataQuality: { examCount: number; lifestyleDays: number }
}

// ── AI가 돌려주는 리포트 (route handler가 structured output으로 보장) ──
export type ReportTopic = 'axial' | 'refraction' | 'lifestyle' | 'compliance'
export interface ReportSection {
  topic: ReportTopic
  title: string
  body: string
}
export interface AiReport {
  headline: string
  sections: ReportSection[]
  actionTip: string
}

// ── 유틸 ──────────────────────────────────────────────────────
const num = (s: string): number | null => {
  if (!s) return null
  const v = parseFloat(s)
  return Number.isFinite(v) ? v : null
}
const round = (v: number, p = 2): number => Math.round(v * 10 ** p) / 10 ** p
const monthsBetween = (a: string, b: string): number => {
  const da = parseDate(a), db = parseDate(b)
  return Math.abs((db.getTime() - da.getTime()) / (30.44 * 24 * 60 * 60 * 1000))
}

// ── 메인 ──────────────────────────────────────────────────────
export function buildReportContext(opts: {
  child: Child
  exams: ExamRecord[]
  lifestyle: LifestyleLogs
  logs: TreatmentLogs
  treatmentsForDate: (dateStr: string) => TreatmentDef[]
  periodDays?: number
}): ReportContext {
  const { child, exams, lifestyle, logs, treatmentsForDate } = opts
  const periodDays = opts.periodDays ?? 30

  // 기간 [from, to]
  const toStr = today()
  const fromDate = parseDate(toStr)
  fromDate.setDate(fromDate.getDate() - (periodDays - 1))
  const fromStr = formatDate(fromDate)
  const period = { label: `최근 ${periodDays}일`, from: fromStr, to: toStr }

  // ── 안축장 ──
  const axExams = exams
    .filter(e => num(e.axOD) != null || num(e.axOS) != null)
    .sort((a, b) => a.date.localeCompare(b.date)) // 오름차순
  let axial: AxialSummary | null = null
  if (axExams.length > 0) {
    const latest = axExams[axExams.length - 1]
    const prev = axExams.length > 1 ? axExams[axExams.length - 2] : null
    const ageAtLatest = calcAgeYears(child.birth, latest.date)
    const od = num(latest.axOD), os = num(latest.axOS)
    axial = {
      latestDate: latest.date,
      od: { value: od, pct: od != null ? calcPercentile(od, ageAtLatest) : null },
      os: { value: os, pct: os != null ? calcPercentile(os, ageAtLatest) : null },
      delta: null,
      annualized: null,
      annualizedNote: null,
    }
    if (prev) {
      const pod = num(prev.axOD), pos = num(prev.axOS)
      axial.delta = {
        od: od != null && pod != null ? round(od - pod, 2) : null,
        os: os != null && pos != null ? round(os - pos, 2) : null,
        months: round(monthsBetween(prev.date, latest.date), 1),
      }
    }
    // 연간 성장률 — 「연간 성장률 카드」와 동일한 공용 계산(최근 12개월 회귀 + 폴백/주의)
    const odG = axialGrowth(axExams.filter(e => num(e.axOD) != null).map(e => ({ date: e.date, value: num(e.axOD)! })))
    const osG = axialGrowth(axExams.filter(e => num(e.axOS) != null).map(e => ({ date: e.date, value: num(e.axOS)! })))
    if (odG || osG) {
      axial.annualized = { od: odG ? round(odG.ratePerYear, 2) : null, os: osG ? round(osG.ratePerYear, 2) : null }
      const cav = odG?.caveat ?? osG?.caveat ?? null
      axial.annualizedNote = cav ? growthCaveatText(cav) : null
    }
  }

  // ── 굴절 (SEQ) ──
  const serExams = exams
    .filter(e => num(e.serOD) != null || num(e.serOS) != null)
    .sort((a, b) => a.date.localeCompare(b.date))
  let refraction: RefractionSummary | null = null
  if (serExams.length > 0) {
    const latest = serExams[serExams.length - 1]
    const prev = serExams.length > 1 ? serExams[serExams.length - 2] : null
    const od = num(latest.serOD), os = num(latest.serOS)
    refraction = { latestDate: latest.date, serOD: od, serOS: os, delta: null }
    if (prev) {
      const pod = num(prev.serOD), pos = num(prev.serOS)
      refraction.delta = {
        od: od != null && pod != null ? round(od - pod, 2) : null,
        os: os != null && pos != null ? round(os - pos, 2) : null,
        months: round(monthsBetween(prev.date, latest.date), 1),
      }
    }
  }

  // ── 생활습관 (기간 내 기록된 날 평균) ──
  const lifeEntries = Object.entries(lifestyle).filter(
    ([d]) => d >= fromStr && d <= toStr
  )
  const avg = (pick: (v: { outdoor: number; phone: number; sleep: number }) => number): number | null => {
    const vals = lifeEntries.map(([, v]) => pick(v)).filter(v => Number.isFinite(v))
    if (!vals.length) return null
    return round(vals.reduce((a, b) => a + b, 0) / vals.length, 1)
  }
  const outdoorAvg = avg(v => v.outdoor)
  const phoneAvg = avg(v => v.phone)
  const sleepAvg = avg(v => v.sleep)
  const lifestyleSummary: LifestyleSummary = {
    daysLogged: lifeEntries.length,
    outdoor: outdoorAvg != null ? { avgH: outdoorAvg, goalH: child.outdoorGoal } : null,
    phone: phoneAvg != null ? { avgH: phoneAvg, goalH: child.phoneGoal } : null,
    sleep: sleepAvg != null ? { avgH: sleepAvg } : null,
  }

  // ── 케어 순응도 (기간 내, 날짜별 활성 케어 기준) ──
  let done = 0, total = 0
  const perTreat: Record<string, { name: string; done: number; total: number }> = {}
  const cur = parseDate(fromStr)
  const end = parseDate(toStr)
  while (cur <= end) {
    const ds = formatDate(cur)
    const active = treatmentsForDate(ds)
    if (active.length) {
      const log = logs[ds] || {}
      total++
      if (active.every(t => log[t.key])) done++
      for (const t of active) {
        if (!perTreat[t.key]) perTreat[t.key] = { name: t.name, done: 0, total: 0 }
        perTreat[t.key].total++
        if (log[t.key]) perTreat[t.key].done++
      }
    }
    cur.setDate(cur.getDate() + 1)
  }
  const compliance: ComplianceSummary = {
    overallPct: total > 0 ? Math.round((done / total) * 100) : null,
    streak: calcStreak(logs, treatmentsForDate),
    byTreatment: Object.values(perTreat).map(t => ({
      name: t.name,
      pct: t.total > 0 ? Math.round((t.done / t.total) * 100) : 0,
    })),
  }

  return {
    child: { ageYears: calcAgeYears(child.birth, toStr), gender: child.gender },
    period,
    axial,
    refraction,
    lifestyle: lifestyleSummary,
    compliance,
    dataQuality: { examCount: exams.length, lifestyleDays: lifeEntries.length },
  }
}

// ── 지난 검사와 비교 (안축장 길이, 결정적 계산 — AI 미사용) ──────
// 검사 1건을 직전 검사와 비교(기간+Δ)하고, 지지난→지난 구간이 있으면 그 구간을
// 이번과 같은 기간으로 환산해 성장 속도를 비교한다.
// ※ 불안 조장·상담 권유 없이 사실 수치만. (환자는 이미 안과 진료 중)
export interface ExamComparison {
  prevDate: string
  months1: number                                    // 이번 구간(직전→이번) 개월
  delta1: { od: number | null; os: number | null }   // mm
  prior: {
    prev2Date: string
    months0: number
    scaled0: { od: number | null; os: number | null } // 직전 구간을 months1로 환산한 Δ(mm)
    verdict: 'faster' | 'similar' | 'slower'
  } | null
  shortInterval: boolean                             // 간격 짧아 참고용
}

const axPair = (e: ExamRecord) => ({ od: num(e.axOD), os: num(e.axOS) })
const hasAxial = (e: ExamRecord) => num(e.axOD) != null || num(e.axOS) != null

export function buildExamComparison(exams: ExamRecord[], examId: string): ExamComparison | null {
  const target = exams.find(e => e.id === examId)
  if (!target || !hasAxial(target)) return null

  // 직전·지지난 = target보다 이전이면서 안축장 있는 검사 (최신순)
  const priors = exams
    .filter(e => e.id !== examId && e.date < target.date && hasAxial(e))
    .sort((a, b) => b.date.localeCompare(a.date))
  const prev = priors[0]
  if (!prev) return null
  const prev2 = priors[1] ?? null

  const t = axPair(target), p = axPair(prev)
  const months1 = round(monthsBetween(prev.date, target.date), 1)
  const delta1 = {
    od: t.od != null && p.od != null ? round(t.od - p.od, 2) : null,
    os: t.os != null && p.os != null ? round(t.os - p.os, 2) : null,
  }

  let prior: ExamComparison['prior'] = null
  if (prev2 && months1 > 0) {
    const p2 = axPair(prev2)
    const months0 = round(monthsBetween(prev2.date, prev.date), 1)
    const delta0 = {
      od: p.od != null && p2.od != null ? round(p.od - p2.od, 2) : null,
      os: p.os != null && p2.os != null ? round(p.os - p2.os, 2) : null,
    }
    if (months0 > 0) {
      const scale = months1 / months0
      const scaled0 = {
        od: delta0.od != null ? round(delta0.od * scale, 2) : null,
        os: delta0.os != null ? round(delta0.os * scale, 2) : null,
      }
      // 성장 속도 비교 = 값이 있는 눈들의 평균 월간율
      const rates1: number[] = [], rates0: number[] = []
      for (const eye of ['od', 'os'] as const) {
        if (delta1[eye] != null) rates1.push(delta1[eye]! / months1)
        if (delta0[eye] != null) rates0.push(delta0[eye]! / months0)
      }
      if (rates1.length && rates0.length) {
        const r1 = rates1.reduce((a, b) => a + b, 0) / rates1.length
        const r0 = rates0.reduce((a, b) => a + b, 0) / rates0.length
        let verdict: 'faster' | 'similar' | 'slower'
        if (r0 <= 0.005) {
          verdict = r1 > 0.02 ? 'faster' : 'similar'   // 직전이 사실상 정체
        } else {
          const ratio = r1 / r0
          verdict = ratio > 1.2 ? 'faster' : ratio < 0.8 ? 'slower' : 'similar'
        }
        prior = { prev2Date: prev2.date, months0, scaled0, verdict }
      }
    }
  }

  return {
    prevDate: prev.date,
    months1,
    delta1,
    prior,
    shortInterval: months1 < 2 || (prior != null && prior.months0 < 2),
  }
}
