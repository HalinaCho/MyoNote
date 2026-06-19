// 달성률 계산 — Next.js, React Native 모두 재사용 가능

import { TreatmentDef, TreatmentLogs } from '@/types'
import { formatDate, parseDate } from './date'

// treatmentsForDate: 해당 날짜에 활성인 케어 목록을 반환하는 함수 (날짜별 분모)
type TreatmentsForDate = (dateStr: string) => TreatmentDef[]

export function calcStreak(logs: TreatmentLogs, treatmentsForDate: TreatmentsForDate): number {
  let streak = 0
  const d = new Date()
  while (true) {
    const k = formatDate(d)
    const active = treatmentsForDate(k)
    if (!active.length) break                          // 케어가 없던 날 → 연속 종료
    const log = logs[k] || {}
    if (!active.every(t => log[t.key])) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export function calcMonthCompliance(
  logs: TreatmentLogs,
  treatmentsForDate: TreatmentsForDate,
  year: number,
  month: number
): number {
  const today = new Date()
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
  const lastDay = isCurrentMonth ? today.getDate() : new Date(year, month + 1, 0).getDate()

  let done = 0, total = 0
  for (let d = 1; d <= lastDay; d++) {
    const k = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const active = treatmentsForDate(k)
    if (!active.length) continue                       // 케어 없던 날은 분모에서 제외
    total++
    const log = logs[k] || {}
    if (active.every(t => log[t.key])) done++
  }
  return total > 0 ? Math.round((done / total) * 100) : 0
}

export function getDayStatus(
  logs: TreatmentLogs,
  treatmentsForDate: TreatmentsForDate,
  dateStr: string
): 'done' | 'partial' | 'missed' | 'future' {
  const d = parseDate(dateStr)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  if (d > today) return 'future'
  const active = treatmentsForDate(dateStr)
  if (!active.length) return 'future'                  // 케어 없던 날 → 비활성(회색)
  const log = logs[dateStr] || {}
  const done = active.filter(t => log[t.key]).length
  if (done === active.length) return 'done'
  if (done > 0) return 'partial'
  return 'missed'
}
