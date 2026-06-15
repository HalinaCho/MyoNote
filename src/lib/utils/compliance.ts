// 순응도 계산 — Next.js, React Native 모두 재사용 가능

import { Treatment, TreatmentLogs } from '@/types'
import { formatDate, parseDate } from './date'

export function calcStreak(logs: TreatmentLogs, treatments: Treatment[]): number {
  if (!treatments.length) return 0
  let streak = 0
  const d = new Date()
  while (true) {
    const k = formatDate(d)
    const log = logs[k] || {}
    if (!treatments.every(t => log[t.key])) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export function calcMonthCompliance(
  logs: TreatmentLogs,
  treatments: Treatment[],
  year: number,
  month: number
): number {
  if (!treatments.length) return 0
  const today = new Date()
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
  const lastDay = isCurrentMonth ? today.getDate() : new Date(year, month + 1, 0).getDate()

  let done = 0
  for (let d = 1; d <= lastDay; d++) {
    const k = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    if (treatments.every(t => (logs[k] || {})[t.key])) done++
  }
  return lastDay > 0 ? Math.round((done / lastDay) * 100) : 0
}

export function getDayStatus(
  logs: TreatmentLogs,
  treatments: Treatment[],
  dateStr: string
): 'done' | 'partial' | 'missed' | 'future' {
  const d = parseDate(dateStr)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  if (d > today) return 'future'
  if (!treatments.length) return 'future'
  const log = logs[dateStr] || {}
  const done = treatments.filter(t => log[t.key]).length
  if (done === treatments.length) return 'done'
  if (done > 0) return 'partial'
  return 'missed'
}
