// ── 케어 정의 ─────────────────────────────────────────────────
export interface TreatmentPeriod {
  s: string            // 시작일 'YYYY-MM-DD'
  e: string | null     // 종료일 'YYYY-MM-DD' (null = 진행 중)
}

export interface TreatmentDef {
  key: string                              // 안정 ID (프리셋: 'atropine'/'dreamlens', 커스텀: 'c_xxxx')
  name: string
  preset: 'atropine' | 'dreamlens' | null  // 프리셋 종류 (커스텀이면 null)
  schedule: string                         // 스케줄 안내 문구 (예: '취침 전 1회')
  periods: TreatmentPeriod[]               // 활성 기간 목록
}

// 폼이 다루는 "현재 활성 케어" — periods는 context가 병합 시 부여
export type DesiredTreatment = Omit<TreatmentDef, 'periods'>

// ── 자녀 ──────────────────────────────────────────────────────
export interface Child {
  id: string
  name: string
  birth: string        // 'YYYY-MM-DD'
  gender: 'M' | 'F'
  treatments: TreatmentDef[]
  role: 'owner' | 'editor' | 'viewer'
  outdoorGoal: number  // 야외활동 목표 (시간/일), 기본 2.0
  phoneGoal: number    // 스마트폰 목표 (시간/일), 기본 2.0
}

// ── 검사 기록 ─────────────────────────────────────────────────
export interface ExamRecord {
  id: string
  date: string         // 'YYYY-MM-DD'
  clinic: string
  axOD: string         // 안축장 우안 (mm)
  axOS: string         // 안축장 좌안 (mm)
  sphOD: string        // Sphere 우안 (D)
  sphOS: string        // Sphere 좌안 (D)
  cylOD: string        // Cylinder 우안 (D)
  cylOS: string        // Cylinder 좌안 (D)
  serOD: string        // SEQ 우안 = sph + cyl/2 (D)
  serOS: string        // SEQ 좌안 = sph + cyl/2 (D)
  note: string
  nextAppointment: string  // 다음 예약일 'YYYY-MM-DD'
}

// ── 치료 로그 ─────────────────────────────────────────────────
// 그날 완료한 케어 맵 { [treatmentKey]: true }
export type TreatmentLog = Record<string, boolean>

export type TreatmentLogs = Record<string, TreatmentLog>  // key: 'YYYY-MM-DD'

// ── 생활습관 로그 ─────────────────────────────────────────────
export interface LifestyleLog {
  outdoor: number    // 야외활동 (시간)
  phone: number      // 스마트폰 (시간)
  sleep: number      // 수면 (시간)
}

export type LifestyleLogs = Record<string, LifestyleLog>  // key: 'YYYY-MM-DD'
