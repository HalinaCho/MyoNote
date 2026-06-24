// AI 월간 리포트 — 클라이언트가 계산하는 "리포트 컨텍스트" + 출력 타입
//
// 핵심 원칙: 숫자(백분위·증감·달성률)는 전부 여기서 계산하고,
// AI는 이 숫자를 "말로 풀어주기만" 한다. AI에게 산술을 시키지 않으므로
// 의료적으로 안전하고(계산 오류·환각 방지), 토큰도 적게 들며, 결과가 결정적이다.

import type { Child, ExamRecord, TreatmentLogs, LifestyleLogs, TreatmentDef } from '@/types'
import { calcPercentile, calcAgeYears } from '@/lib/axialPercentile'
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
  annualized: { od: number | null; os: number | null } | null             // mm/년
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
const yearsBetween = (a: string, b: string): number => {
  const da = parseDate(a), db = parseDate(b)
  return Math.abs((db.getTime() - da.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
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
    }
    if (prev) {
      const pod = num(prev.axOD), pos = num(prev.axOS)
      const months = monthsBetween(prev.date, latest.date)
      const years = yearsBetween(prev.date, latest.date) || 1
      axial.delta = {
        od: od != null && pod != null ? round(od - pod, 2) : null,
        os: os != null && pos != null ? round(os - pos, 2) : null,
        months: round(months, 1),
      }
      // 검사 간격이 3개월 미만이면 연간 환산은 의미 없음(노이즈 증폭) → 제공 안 함
      axial.annualized = months >= 3 ? {
        od: od != null && pod != null ? round((od - pod) / years, 2) : null,
        os: os != null && pos != null ? round((os - pos) / years, 2) : null,
      } : null
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

// ── 검사 결과 즉시 해설 (검사 1건) ────────────────────────────
// 분석탭 AI 요약(기간 종합)과 달리, 검사 기록 한 건에 초점.
export interface ExamExplainContext {
  child: { ageYears: number; gender: 'M' | 'F' }
  exam: {
    date: string
    axial: { od: AxialEyeLatest; os: AxialEyeLatest } | null
    ser: { od: number | null; os: number | null } | null
  }
  prev: {
    date: string
    months: number
    axialDelta: { od: number | null; os: number | null } | null   // mm
    serDelta: { od: number | null; os: number | null } | null     // D
  } | null
}

// AI가 돌려주는 검사 해설 — 핵심 내용별 불렛
export interface ExamExplanation {
  points: { label: string; text: string }[]
}

export function buildExamExplainContext(opts: {
  child: Child
  exams: ExamRecord[]
  examId: string
}): ExamExplainContext | null {
  const { child, exams, examId } = opts
  const target = exams.find(e => e.id === examId)
  if (!target) return null

  const ageAtExam = calcAgeYears(child.birth, target.date)
  const tod = num(target.axOD), tos = num(target.axOS)
  const tserod = num(target.serOD), tseros = num(target.serOS)
  const hasAxial = tod != null || tos != null
  const hasSer = tserod != null || tseros != null

  // 직전 검사 = target.date 보다 이전 중 가장 최근 검사
  const prevExam = exams
    .filter(e => e.id !== examId && e.date < target.date)
    .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null

  let prev: ExamExplainContext['prev'] = null
  if (prevExam) {
    const pod = num(prevExam.axOD), pos = num(prevExam.axOS)
    const pserod = num(prevExam.serOD), pseros = num(prevExam.serOS)
    prev = {
      date: prevExam.date,
      months: round(monthsBetween(prevExam.date, target.date), 1),
      axialDelta: hasAxial && (pod != null || pos != null) ? {
        od: tod != null && pod != null ? round(tod - pod, 2) : null,
        os: tos != null && pos != null ? round(tos - pos, 2) : null,
      } : null,
      serDelta: hasSer && (pserod != null || pseros != null) ? {
        od: tserod != null && pserod != null ? round(tserod - pserod, 2) : null,
        os: tseros != null && pseros != null ? round(tseros - pseros, 2) : null,
      } : null,
    }
  }

  return {
    child: { ageYears: calcAgeYears(child.birth, target.date), gender: child.gender },
    exam: {
      date: target.date,
      axial: hasAxial ? {
        od: { value: tod, pct: tod != null ? calcPercentile(tod, ageAtExam) : null },
        os: { value: tos, pct: tos != null ? calcPercentile(tos, ageAtExam) : null },
      } : null,
      ser: hasSer ? { od: tserod, os: tseros } : null,
    },
    prev,
  }
}
