// ── 자녀 ──────────────────────────────────────────────────────
export interface Child {
  id: string
  name: string
  birth: string        // 'YYYY-MM-DD'
  gender: 'M' | 'F'
  treatAtropine: boolean
  treatDreamlens: boolean
  role: 'owner' | 'editor' | 'viewer'
}

// ── 검사 기록 ─────────────────────────────────────────────────
export interface ExamRecord {
  id: string
  date: string         // 'YYYY-MM-DD'
  clinic: string
  axOD: string         // 안축장 우안 (mm)
  axOS: string         // 안축장 좌안 (mm)
  serOD: string        // SER 우안 (D)
  serOS: string        // SER 좌안 (D)
  note: string
}

// ── 치료 로그 ─────────────────────────────────────────────────
export interface TreatmentLog {
  atropine: boolean
  dreamlens: boolean
}

export type TreatmentLogs = Record<string, TreatmentLog>  // key: 'YYYY-MM-DD'

// ── 생활습관 로그 ─────────────────────────────────────────────
export interface LifestyleLog {
  outdoor: number    // 야외활동 (시간)
  phone: number      // 스마트폰 (시간)
  sleep: number      // 수면 (시간)
}

export type LifestyleLogs = Record<string, LifestyleLog>  // key: 'YYYY-MM-DD'

// ── 치료 항목 ─────────────────────────────────────────────────
export interface Treatment {
  key: 'atropine' | 'dreamlens'
  name: string
  time: string
  tag: 'atropine' | 'dreamlens'
}
