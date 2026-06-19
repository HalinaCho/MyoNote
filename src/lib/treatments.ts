import type { Child, TreatmentDef, DesiredTreatment } from '@/types'

// ── 프리셋 카탈로그 ───────────────────────────────────────────
// 하이브리드: 아래 프리셋 + 직접입력(커스텀) 모두 지원
export interface TreatmentPreset {
  preset: 'atropine' | 'dreamlens'
  name: string
  schedule: string
}

export const TREATMENT_PRESETS: TreatmentPreset[] = [
  { preset: 'atropine',  name: '아트로핀 점안', schedule: '취침 전 1회' },
  { preset: 'dreamlens', name: '드림렌즈',      schedule: '취침 시'     },
]

// 특정 날짜에 이 케어가 활성인지 (기간 중 하나라도 포함하면 활성)
function isActiveOn(def: TreatmentDef, dateStr: string): boolean {
  return (def.periods ?? []).some(p => p.s <= dateStr && (p.e == null || dateStr <= p.e))
}

// 해당 날짜(기본: 오늘)에 활성인 케어 목록
export function getActiveTreatments(child: Child | null, dateStr: string): TreatmentDef[] {
  if (!child?.treatments) return []
  return child.treatments.filter(t => isActiveOn(t, dateStr))
}

// 커스텀 케어 key 생성
export function makeTreatmentKey(): string {
  return `c_${crypto.randomUUID().slice(0, 8)}`
}

// 폼이 넘긴 "활성 케어 집합"(desired)을 기존 정의와 병합해 기간 갱신
//  - 새로 켜짐: 새 기간 추가 {s: today, e: null}
//  - 꺼짐: 열린 기간 마감 (e = today)
//  - 이름/스케줄 편집 반영, 정의는 보존(과거 기록 유지)
export function mergeTreatments(
  oldDefs: TreatmentDef[],
  desired: DesiredTreatment[],
  todayStr: string
): TreatmentDef[] {
  const result: TreatmentDef[] = []

  // 1) 기존 정의: 활성 여부에 따라 기간 갱신
  for (const od of oldDefs) {
    const want = desired.find(d => d.key === od.key)
    const periods = [...(od.periods ?? [])]
    const openIdx = periods.findIndex(p => p.e == null)
    if (want && openIdx < 0) periods.push({ s: todayStr, e: null })          // 재활성
    if (!want && openIdx >= 0) periods[openIdx] = { ...periods[openIdx], e: todayStr } // 비활성화
    result.push({
      ...od,
      name: want?.name ?? od.name,
      schedule: want?.schedule ?? od.schedule,
      periods,
    })
  }

  // 2) 신규 케어
  for (const d of desired) {
    if (oldDefs.some(o => o.key === d.key)) continue
    result.push({ key: d.key, name: d.name, preset: d.preset, schedule: d.schedule, periods: [{ s: todayStr, e: null }] })
  }

  return result
}
