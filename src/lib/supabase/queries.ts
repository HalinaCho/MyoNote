// RN 이식 시 createClient만 교체하면 전체 재사용 가능
import { createClient } from './client'
import type { Child, ExamRecord, TreatmentLogs, LifestyleLogs, TreatmentDef, DesiredTreatment, Hospital, HospitalPost, LinkMeta } from '@/types'
import type { AiReport } from '@/lib/aiReport'

// 폼 입력 — treatments는 periods 없는 활성 집합 (context가 병합해 기간 부여)
export interface ChildFormInput {
  name: string; birth: string; gender: 'M' | 'F'
  treatments: DesiredTreatment[]
  outdoorGoal?: number; phoneGoal?: number
}
export interface ChildFormUpdateInput extends ChildFormInput { id: string }

// DB 기록용 — treatments는 기간까지 포함한 완전한 정의
export interface AddChildInput {
  name: string; birth: string; gender: 'M' | 'F'
  treatments: TreatmentDef[]
  outdoorGoal?: number; phoneGoal?: number
}
export interface UpdateChildInput extends AddChildInput { id: string }

// 현재 진행 중(열린 기간)인 프리셋이 있는지 — 구 컬럼 호환용
const hasOpenPreset = (treatments: TreatmentDef[], preset: 'atropine' | 'dreamlens') =>
  treatments.some(t => t.preset === preset && (t.periods ?? []).some(p => p.e == null))

// ── 자녀 ──────────────────────────────────────────────────────

export async function fetchChildren(): Promise<Child[]> {
  const sb = createClient()
  const { data, error } = await sb
    .from('eyebody_child_guardians')
    // '*' — 컬럼을 열거하면 아직 마이그레이션이 안 돌아간 DB(next_appointment 없음)에서 조회가 통째로 실패한다
    .select('role, eyebody_children(*)')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((r: any) => ({
    id:             r.eyebody_children.id,
    name:           r.eyebody_children.name,
    birth:          r.eyebody_children.birth_date,
    gender:         r.eyebody_children.gender,
    treatments:     (r.eyebody_children.treatments ?? []) as TreatmentDef[],
    role:           r.role,
    outdoorGoal:    r.eyebody_children.outdoor_goal ?? 2,
    phoneGoal:      r.eyebody_children.phone_goal   ?? 2,
    nextAppointment: r.eyebody_children.next_appointment ?? null,
  }))
}

// 다음 예약일 저장 — 홈에서만 부른다. null이면 예약 없음(지우기).
export async function updateChildAppointment(childId: string, date: string | null): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('eyebody_children')
    .update({ next_appointment: date }).eq('id', childId)
  if (error) throw error
}

export async function addChild(input: AddChildInput): Promise<Child> {
  const sb = createClient()
  // 자녀 행 + owner 보호자 행을 서버측에서 원자적으로 생성 (보호자 셀프추가 차단 대응)
  const { data, error } = await sb.rpc('create_child', {
    p_name: input.name, p_birth: input.birth, p_gender: input.gender,
    p_treatments: input.treatments,
    p_treat_atropine: hasOpenPreset(input.treatments, 'atropine'),
    p_treat_dreamlens: hasOpenPreset(input.treatments, 'dreamlens'),
    p_outdoor_goal: input.outdoorGoal ?? 2, p_phone_goal: input.phoneGoal ?? 2,
  })
  if (error) throw error

  const id = data as string
  return { id, ...input, outdoorGoal: input.outdoorGoal ?? 2, phoneGoal: input.phoneGoal ?? 2, role: 'owner', nextAppointment: null }
}

export async function updateChild(input: UpdateChildInput): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('eyebody_children').update({
    name: input.name, birth_date: input.birth, gender: input.gender,
    treatments: input.treatments,
    treat_atropine: hasOpenPreset(input.treatments, 'atropine'),
    treat_dreamlens: hasOpenPreset(input.treatments, 'dreamlens'),
    outdoor_goal: input.outdoorGoal ?? 2, phone_goal: input.phoneGoal ?? 2,
  }).eq('id', input.id)
  if (error) throw error
}

export async function deleteChild(id: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('eyebody_children').delete().eq('id', id)
  if (error) throw error
}

// ── 자녀 데이터 ───────────────────────────────────────────────

export async function fetchChildData(childId: string) {
  const sb = createClient()
  const [examsRes, logsRes, lifeRes] = await Promise.all([
    // '*' — 컬럼을 열거하면 아직 마이그레이션이 안 돌아간 DB(나안시력 컬럼 없음)에서 조회 전체가 실패한다.
    // '*'면 없는 컬럼은 그냥 undefined로 와서 빈 값으로 표시된다.
    sb.from('eyebody_exam_records').select('*').eq('child_id', childId).order('exam_date', { ascending: false }),
    sb.from('eyebody_treatment_logs').select('log_date, done, atropine, dreamlens').eq('child_id', childId),
    sb.from('eyebody_activity_logs').select('log_date, outdoor_hours, phone_hours, sleep_hours').eq('child_id', childId),
  ])

  const exams: ExamRecord[] = (examsRes.data ?? []).map((r: any) => ({
    id: r.id, date: r.exam_date, clinic: r.clinic ?? '',
    axOD:  r.ax_od  != null ? String(r.ax_od)  : '',
    axOS:  r.ax_os  != null ? String(r.ax_os)  : '',
    sphOD: r.sph_od != null ? String(r.sph_od) : '',
    sphOS: r.sph_os != null ? String(r.sph_os) : '',
    cylOD: r.cyl_od != null ? String(r.cyl_od) : '',
    cylOS: r.cyl_os != null ? String(r.cyl_os) : '',
    serOD: r.ser_od != null ? String(r.ser_od) : '',
    serOS: r.ser_os != null ? String(r.ser_os) : '',
    vaOD:  r.va_od  != null ? String(r.va_od)  : '',
    vaOS:  r.va_os  != null ? String(r.va_os)  : '',
    note:  r.note ?? '',
    createdAt: r.created_at ?? undefined,
  }))

  // done(jsonb) 우선, 없으면 구 컬럼(atropine/dreamlens)으로 폴백
  const logs: TreatmentLogs = Object.fromEntries(
    (logsRes.data ?? []).map((r: any) => {
      const done = r.done ?? {
        ...(r.atropine  ? { atropine: true }  : {}),
        ...(r.dreamlens ? { dreamlens: true } : {}),
      }
      return [r.log_date, done as Record<string, boolean>]
    })
  )

  const lifestyle: LifestyleLogs = Object.fromEntries(
    (lifeRes.data ?? []).map((r: any) => [r.log_date, {
      outdoor: parseFloat(r.outdoor_hours),
      phone:   parseFloat(r.phone_hours),
      sleep:   parseFloat(r.sleep_hours),
    }])
  )

  return { exams, logs, lifestyle }
}

// ── 치료 로그 ─────────────────────────────────────────────────

export async function saveTreatmentLog(
  childId: string, dateStr: string, done: Record<string, boolean>
): Promise<void> {
  const sb = createClient()
  // done(jsonb)이 정본. 구 컬럼(atropine/dreamlens)도 호환 위해 함께 기록
  const { error } = await sb.from('eyebody_treatment_logs')
    .upsert({
      child_id: childId, log_date: dateStr, done,
      atropine: !!done.atropine, dreamlens: !!done.dreamlens,
    }, { onConflict: 'child_id,log_date' })
  if (error) throw error
}

// ── 검사 기록 ─────────────────────────────────────────────────

export async function saveExam(childId: string, exam: Omit<ExamRecord, 'id'>, enteredByHospitalId?: string | null): Promise<ExamRecord> {
  const sb = createClient()
  const sphOD = exam.sphOD ? parseFloat(exam.sphOD) : null
  const sphOS = exam.sphOS ? parseFloat(exam.sphOS) : null
  const cylOD = exam.cylOD ? parseFloat(exam.cylOD) : null
  const cylOS = exam.cylOS ? parseFloat(exam.cylOS) : null
  const serOD = sphOD != null ? sphOD + (cylOD ?? 0) / 2 : null
  const serOS = sphOS != null ? sphOS + (cylOS ?? 0) / 2 : null

  const { data, error } = await sb.from('eyebody_exam_records').insert({
    child_id: childId, exam_date: exam.date, clinic: exam.clinic || null,
    entered_by_hospital_id: enteredByHospitalId ?? null,
    ax_od: exam.axOD ? parseFloat(exam.axOD) : null,
    ax_os: exam.axOS ? parseFloat(exam.axOS) : null,
    sph_od: sphOD, sph_os: sphOS,
    cyl_od: cylOD, cyl_os: cylOS,
    ser_od: serOD, ser_os: serOS,
    va_od: exam.vaOD ? parseFloat(exam.vaOD) : null,
    va_os: exam.vaOS ? parseFloat(exam.vaOS) : null,
    note: exam.note || null,
  }).select().single()
  if (error) throw error
  return {
    id: data.id, date: data.exam_date, clinic: data.clinic ?? '',
    axOD:  data.ax_od  != null ? String(data.ax_od)  : '',
    axOS:  data.ax_os  != null ? String(data.ax_os)  : '',
    sphOD: data.sph_od != null ? String(data.sph_od) : '',
    sphOS: data.sph_os != null ? String(data.sph_os) : '',
    cylOD: data.cyl_od != null ? String(data.cyl_od) : '',
    cylOS: data.cyl_os != null ? String(data.cyl_os) : '',
    serOD: data.ser_od != null ? String(data.ser_od) : '',
    serOS: data.ser_os != null ? String(data.ser_os) : '',
    vaOD:  data.va_od  != null ? String(data.va_od)  : '',
    vaOS:  data.va_os  != null ? String(data.va_os)  : '',
    note:  data.note ?? '',
    createdAt: data.created_at ?? undefined,
  }
}

export async function updateExam(id: string, exam: Omit<ExamRecord, 'id'>): Promise<ExamRecord> {
  const sb = createClient()
  const sphOD = exam.sphOD ? parseFloat(exam.sphOD) : null
  const sphOS = exam.sphOS ? parseFloat(exam.sphOS) : null
  const cylOD = exam.cylOD ? parseFloat(exam.cylOD) : null
  const cylOS = exam.cylOS ? parseFloat(exam.cylOS) : null
  const serOD = sphOD != null ? sphOD + (cylOD ?? 0) / 2 : null
  const serOS = sphOS != null ? sphOS + (cylOS ?? 0) / 2 : null

  const { data, error } = await sb.from('eyebody_exam_records').update({
    exam_date: exam.date, clinic: exam.clinic || null,
    ax_od: exam.axOD ? parseFloat(exam.axOD) : null,
    ax_os: exam.axOS ? parseFloat(exam.axOS) : null,
    sph_od: sphOD, sph_os: sphOS,
    cyl_od: cylOD, cyl_os: cylOS,
    ser_od: serOD, ser_os: serOS,
    va_od: exam.vaOD ? parseFloat(exam.vaOD) : null,
    va_os: exam.vaOS ? parseFloat(exam.vaOS) : null,
    note: exam.note || null,
  }).eq('id', id).select().single()
  if (error) throw error
  return {
    id: data.id, date: data.exam_date, clinic: data.clinic ?? '',
    axOD:  data.ax_od  != null ? String(data.ax_od)  : '',
    axOS:  data.ax_os  != null ? String(data.ax_os)  : '',
    sphOD: data.sph_od != null ? String(data.sph_od) : '',
    sphOS: data.sph_os != null ? String(data.sph_os) : '',
    cylOD: data.cyl_od != null ? String(data.cyl_od) : '',
    cylOS: data.cyl_os != null ? String(data.cyl_os) : '',
    serOD: data.ser_od != null ? String(data.ser_od) : '',
    serOS: data.ser_os != null ? String(data.ser_os) : '',
    vaOD:  data.va_od  != null ? String(data.va_od)  : '',
    vaOS:  data.va_os  != null ? String(data.va_os)  : '',
    note:  data.note ?? '',
    createdAt: data.created_at ?? undefined,
  }
}

export async function deleteExam(id: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('eyebody_exam_records').delete().eq('id', id)
  if (error) throw error
}

// ── 생활습관 ──────────────────────────────────────────────────

export async function saveLifestyle(
  childId: string, dateStr: string,
  data: { outdoor: number; phone: number; sleep?: number }
): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('eyebody_activity_logs')
    .upsert({
      child_id: childId, log_date: dateStr,
      outdoor_hours: data.outdoor, phone_hours: data.phone, sleep_hours: data.sleep ?? 0,
    }, { onConflict: 'child_id,log_date' })
  if (error) throw error
}

export async function deleteLifestyle(childId: string, dateStr: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('eyebody_activity_logs')
    .delete().eq('child_id', childId).eq('log_date', dateStr)
  if (error) throw error
}

// ── 보호자 ────────────────────────────────────────────────────

export interface Guardian {
  userId: string
  role: 'owner' | 'editor' | 'viewer'
  displayName: string
  email: string
}

export async function fetchGuardians(childId: string): Promise<Guardian[]> {
  const sb = createClient()
  const { data, error } = await sb.rpc('get_child_guardians', { p_child_id: childId })
  if (error) throw error
  return (data ?? []).map((r: any) => ({
    userId: r.user_id,
    role: r.role as Guardian['role'],
    displayName: r.display_name || r.email?.split('@')[0] || '알 수 없음',
    email: r.email || '',
  }))
}

export async function removeGuardian(childId: string, userId: string): Promise<void> {
  const sb = createClient()
  // definer RPC로 권한 검증 후 삭제 (RLS 정책 우회 문제 회피, 실패 시 명확한 에러)
  const { error } = await sb.rpc('remove_guardian', { p_child_id: childId, p_user_id: userId })
  if (error) throw new Error(error.message || '처리에 실패했습니다')
}

// 소유자 양도 — 대상이 owner, 호출자는 editor로 (owner만 가능)
export async function transferOwnership(childId: string, newOwnerUserId: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb.rpc('transfer_ownership', { p_child_id: childId, p_new_owner: newOwnerUserId })
  if (error) throw new Error(error.message || '양도에 실패했습니다')
}

// ── 초대 코드 ─────────────────────────────────────────────────

// 자녀별 초대코드 생성 (그 자녀의 보호자 누구나) — 코드 문자열 반환
export async function createInviteCode(childId: string, role: 'editor' | 'viewer' = 'editor'): Promise<string> {
  const sb = createClient()
  const { data, error } = await sb.rpc('create_invite_code', { p_child_id: childId, p_role: role })
  if (error) throw new Error(error.message || '코드 생성에 실패했습니다')
  return data as string
}

// 초대코드 수락 — 등록된 자녀 이름 반환
export async function acceptInviteCode(code: string): Promise<string> {
  const sb = createClient()
  const { data, error } = await sb.rpc('accept_invite_code', { p_code: code.toUpperCase().trim() })
  if (error) throw new Error(error.message || '코드 참여에 실패했습니다')
  return data as string
}

// ── AI 월간 리포트 ────────────────────────────────────────────

export interface SavedReport {
  id: string
  periodLabel: string
  periodFrom: string
  periodTo: string
  payload: AiReport
  model: string
  createdAt: string
}

// 가장 최근 저장된 리포트 1건 (없으면 null)
export async function fetchLatestReport(childId: string): Promise<SavedReport | null> {
  const sb = createClient()
  const { data, error } = await sb
    .from('eyebody_ai_reports')
    .select('id, period_label, period_from, period_to, payload, model, created_at')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id: data.id,
    periodLabel: data.period_label,
    periodFrom: data.period_from,
    periodTo: data.period_to,
    payload: data.payload as AiReport,
    model: data.model,
    createdAt: data.created_at,
  }
}

export async function saveReport(
  childId: string,
  period: { label: string; from: string; to: string },
  payload: AiReport,
  model: string
): Promise<SavedReport> {
  const sb = createClient()
  const { data: userData } = await sb.auth.getUser()
  const { data, error } = await sb
    .from('eyebody_ai_reports')
    .insert({
      child_id: childId,
      period_from: period.from,
      period_to: period.to,
      period_label: period.label,
      payload,
      model,
      created_by: userData.user?.id ?? null,
    })
    .select('id, period_label, period_from, period_to, payload, model, created_at')
    .single()
  if (error) throw error
  return {
    id: data.id,
    periodLabel: data.period_label,
    periodFrom: data.period_from,
    periodTo: data.period_to,
    payload: data.payload as AiReport,
    model: data.model,
    createdAt: data.created_at,
  }
}

// ── 병원(원장 포털) ───────────────────────────────────────────

// 로그인한 스태프가 소속된 병원 id (스태프가 아니면 null)
export async function fetchMyHospitalId(): Promise<string | null> {
  const sb = createClient()
  const { data, error } = await sb.rpc('my_hospital_id')
  if (error) throw error
  return (data as string) ?? null
}

export async function fetchHospital(hospitalId: string): Promise<Hospital> {
  const sb = createClient()
  const { data, error } = await sb
    .from('eyebody_hospitals')
    .select('id, name, logo_url, brand_color')
    .eq('id', hospitalId)
    .single()
  if (error) throw error
  return {
    id: data.id, name: data.name,
    logoUrl: data.logo_url ?? null, brandColor: data.brand_color ?? null,
  }
}

// 부모 홈 화면 — 현재 연결된 병원(없으면 null)
interface HospitalRow {
  id: string; name: string; logo_url: string | null; brand_color: string | null
}

export async function fetchMyConnectedHospital(childId: string): Promise<Hospital | null> {
  const sb = createClient()
  const { data, error } = await sb.rpc('get_my_hospital', { p_child_id: childId })
  if (error) throw error
  const row = (data as HospitalRow[])?.[0]
  if (!row) return null
  return {
    id: row.id, name: row.name,
    logoUrl: row.logo_url ?? null, brandColor: row.brand_color ?? null,
  }
}

export interface HomeStats {
  totalPatients: number
  newThisMonth: number
  newLastMonth: number
  examsThisMonth: number
  examsLastMonth: number
}

export async function fetchHomeStats(hospitalId: string): Promise<HomeStats> {
  const sb = createClient()
  const { data, error } = await sb.rpc('hospital_home_stats', { p_hospital_id: hospitalId })
  if (error) throw error
  const row = data as {
    total_patients: number; new_this_month: number; new_last_month: number
    exams_this_month: number; exams_last_month: number
  }
  return {
    totalPatients: row.total_patients,
    newThisMonth: row.new_this_month, newLastMonth: row.new_last_month ?? 0,
    examsThisMonth: row.exams_this_month, examsLastMonth: row.exams_last_month ?? 0,
  }
}

export interface MonthlyStat {
  month: string        // 'YYYY-MM'
  exams: number
  connected: number
  churned: number
}

export async function fetchMonthlyStats(hospitalId: string, months = 12): Promise<MonthlyStat[]> {
  const sb = createClient()
  const { data, error } = await sb.rpc('hospital_monthly_stats', { p_hospital_id: hospitalId, p_months: months })
  if (error) throw error
  return (data ?? []) as MonthlyStat[]
}

// 위험도·치료 분포 계산용 원자료 — 성장률 판정은 클라이언트(axialGrowth)에서 한다
export interface PatientSummary {
  childId: string
  childName: string
  birth: string
  treatments: TreatmentDef[]
  exams: { date: string; axOD: number | null; axOS: number | null }[]
}

export async function fetchPatientSummaries(hospitalId: string): Promise<PatientSummary[]> {
  const sb = createClient()
  const { data, error } = await sb.rpc('hospital_patient_summary', { p_hospital_id: hospitalId })
  if (error) throw error
  const rows = (data ?? []) as {
    child_id: string; child_name: string; birth_date: string
    treatments: TreatmentDef[]
    exams: { date: string; ax_od: number | null; ax_os: number | null }[]
  }[]
  return rows.map(r => ({
    childId: r.child_id, childName: r.child_name, birth: r.birth_date,
    treatments: r.treatments ?? [],
    exams: (r.exams ?? []).map(e => ({ date: e.date, axOD: e.ax_od, axOS: e.ax_os })),
  }))
}

export interface OverduePatient {
  childId: string
  childName: string
  status: 'overdue' | 'churned'
  nextAppointment: string | null
  daysOverdue: number | null
  churnedAt: string | null
}

interface OverduePatientRow {
  child_id: string; child_name: string; status: 'overdue' | 'churned'
  next_appointment: string | null; days_overdue: number | null; churned_at: string | null
}

export async function fetchOverduePatients(hospitalId: string): Promise<OverduePatient[]> {
  const sb = createClient()
  const { data, error } = await sb.rpc('hospital_overdue_patients', { p_hospital_id: hospitalId })
  if (error) throw error
  return ((data ?? []) as OverduePatientRow[]).map(r => ({
    childId: r.child_id, childName: r.child_name, status: r.status,
    nextAppointment: r.next_appointment, daysOverdue: r.days_overdue, churnedAt: r.churned_at,
  }))
}

export interface RosterPatient {
  childId: string
  childName: string
  birth: string
  lastExamDate: string | null
  nextAppointment: string | null
}

interface RosterPatientRow {
  child_id: string; child_name: string; birth_date: string
  last_exam_date: string | null; next_appointment: string | null
}

export async function fetchPatientRoster(hospitalId: string): Promise<RosterPatient[]> {
  const sb = createClient()
  const { data, error } = await sb.rpc('hospital_patient_roster', { p_hospital_id: hospitalId })
  if (error) throw error
  return ((data ?? []) as RosterPatientRow[]).map(r => ({
    childId: r.child_id, childName: r.child_name, birth: r.birth_date,
    lastExamDate: r.last_exam_date, nextAppointment: r.next_appointment,
  }))
}

// 로스터 순응도 계산용 원자료 — %는 클라이언트에서 calcRecentCompliance로 계산한다
// ("그날 활성인 케어" 판정이 treatments의 periods 기반이라 부모 앱 로직을 그대로 재사용)
export interface PatientCare {
  treatments: TreatmentDef[]
  logs: TreatmentLogs
}

interface PatientCareRow {
  care_child_id: string
  care_treatments: TreatmentDef[]
  care_logs: TreatmentLogs
}

export async function fetchPatientCare(hospitalId: string, days = 30): Promise<Record<string, PatientCare>> {
  const sb = createClient()
  const { data, error } = await sb.rpc('hospital_patient_care', { p_hospital_id: hospitalId, p_days: days })
  if (error) throw error
  return Object.fromEntries(
    ((data ?? []) as PatientCareRow[]).map(r => [
      r.care_child_id,
      { treatments: r.care_treatments ?? [], logs: r.care_logs ?? {} },
    ])
  )
}

export interface PatientExam {
  id: string
  date: string
  clinic: string
  axOD: number | null
  axOS: number | null
  serOD: number | null
  serOS: number | null
  byUs: boolean          // 이 병원에서 입력된 검사인지(위치 매칭으로 태깅된 기록)
}

export interface PatientDetail {
  childId: string
  childName: string
  birth: string
  gender: 'M' | 'F'                // 또래 백분위가 성별로 갈리므로 상세에 필요
  nextAppointment: string | null   // 예약일은 검사가 아니라 아이에 붙는다
  treatments: TreatmentDef[]
  logs: TreatmentLogs
  exams: PatientExam[]
}

interface PatientDetailRow {
  child: {
    id: string; name: string; birth_date: string; gender: 'M' | 'F'
    treatments: TreatmentDef[]; next_appointment: string | null
  }
  logs: TreatmentLogs
  exams: {
    id: string; exam_date: string; clinic: string | null
    ax_od: number | null; ax_os: number | null
    ser_od: number | null; ser_os: number | null
    by_us: boolean | null
  }[]
}

// 환자 상세 (조회 전용) — 현재 담당 중인 환자만 열람 가능(서버 RPC에서 강제)
export async function fetchPatientDetail(hospitalId: string, childId: string): Promise<PatientDetail> {
  const sb = createClient()
  const { data, error } = await sb.rpc('hospital_patient_detail', { p_hospital_id: hospitalId, p_child_id: childId })
  if (error) throw new Error(error.message || '환자 정보를 불러오지 못했습니다')
  const row = data as PatientDetailRow
  return {
    childId: row.child.id, childName: row.child.name, birth: row.child.birth_date,
    gender: row.child.gender,
    nextAppointment: row.child.next_appointment ?? null,
    treatments: row.child.treatments ?? [],
    logs: row.logs ?? {},
    exams: (row.exams ?? []).map(e => ({
      id: e.id, date: e.exam_date, clinic: e.clinic ?? '',
      axOD: e.ax_od, axOS: e.ax_os, serOD: e.ser_od, serOS: e.ser_os,
      byUs: !!e.by_us,
    })),
  }
}

// ── 병원 브랜딩 / 소식 피드 ───────────────────────────────────

const MEDIA_BUCKET = 'hospital-media'
export const POST_IMAGE_MAX = 5          // DB check 제약과 같은 값 — 넘기면 insert가 거부된다

// 로고·소식 이미지 공용 업로드. 경로 첫 폴더가 병원 id여야 Storage 정책을 통과한다.
// data URI로 받는 이유: downscaleImage가 리사이즈 결과를 data URI로 주기 때문(재사용).
async function uploadMedia(path: string, dataUrl: string, contentType: string): Promise<string> {
  const sb = createClient()
  const blob = await (await fetch(dataUrl)).blob()
  const { error } = await sb.storage.from(MEDIA_BUCKET)
    .upload(path, blob, { contentType, upsert: true })
  if (error) throw new Error(error.message || '이미지 업로드에 실패했습니다')
  const { data } = sb.storage.from(MEDIA_BUCKET).getPublicUrl(path)
  // 경로가 고정이라 같은 URL로 덮어쓰면 브라우저가 옛 이미지를 계속 보여준다 → 캐시 무력화
  return `${data.publicUrl}?t=${Date.now()}`
}

export async function updateHospitalBranding(
  hospitalId: string, patch: { logoUrl?: string | null; brandColor?: string | null },
): Promise<void> {
  const sb = createClient()
  const row: Record<string, string | null> = {}
  if ('logoUrl' in patch) row.logo_url = patch.logoUrl ?? null
  if ('brandColor' in patch) row.brand_color = patch.brandColor ?? null
  const { error } = await sb.from('eyebody_hospitals').update(row).eq('id', hospitalId)
  if (error) throw error
}

// 로고는 병원당 파일 1개만 유지 — 경로 고정 + upsert라 옛 파일이 쌓이지 않는다
export async function uploadHospitalLogo(hospitalId: string, dataUrl: string): Promise<string> {
  const url = await uploadMedia(`${hospitalId}/logo`, dataUrl, 'image/png')
  await updateHospitalBranding(hospitalId, { logoUrl: url })
  return url
}

export async function deleteHospitalLogo(hospitalId: string): Promise<void> {
  const sb = createClient()
  await sb.storage.from(MEDIA_BUCKET).remove([`${hospitalId}/logo`])   // 파일이 없어도 에러 아님
  await updateHospitalBranding(hospitalId, { logoUrl: null })
}

interface HospitalPostRow {
  id: string; body: string | null; images: string[] | null
  link_url: string | null; link_meta: LinkMeta | null
  created_at: string; publish_at?: string
}

const toPost = (r: HospitalPostRow): HospitalPost => ({
  id: r.id, body: r.body ?? '', images: r.images ?? [],
  linkUrl: r.link_url, linkMeta: r.link_meta,
  createdAt: r.created_at, publishAt: r.publish_at ?? r.created_at,
})

// 원장 포털 — 자기 병원 소식 전체
export async function fetchHospitalPosts(hospitalId: string): Promise<HospitalPost[]> {
  const sb = createClient()
  const { data, error } = await sb
    .from('eyebody_hospital_posts')
    .select('id, body, images, link_url, link_meta, created_at, publish_at')
    .eq('hospital_id', hospitalId)
    // 예약 발행 글이 맨 위 — 원장이 "다음에 나갈 글"을 먼저 보게 된다
    .order('publish_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as HospitalPostRow[]).map(toPost)
}

// 부모 앱 — 내 자녀의 "현재" 병원 소식만(이탈하면 안 보인다, RPC에서 강제)
export async function fetchFeedForChild(childId: string, limit = 20): Promise<HospitalPost[]> {
  const sb = createClient()
  const { data, error } = await sb.rpc('hospital_feed', { p_child_id: childId, p_limit: limit })
  if (error) throw error
  return ((data ?? []) as {
    post_id: string; post_body: string | null; post_images: string[] | null
    post_link_url: string | null; post_link_meta: LinkMeta | null; post_created_at: string
  }[]).map(r => ({
    // 피드는 이미 발행된 글만 오고, 날짜도 발행 시각으로 내려온다(예약 글이 옛날 글처럼 보이지 않게)
    id: r.post_id, body: r.post_body ?? '', images: r.post_images ?? [],
    linkUrl: r.post_link_url, linkMeta: r.post_link_meta,
    createdAt: r.post_created_at, publishAt: r.post_created_at,
  }))
}

// 소식 이미지 업로드 — 글을 만들기 전에 경로가 필요하므로 postId를 호출부에서 먼저 만들어 넘긴다
export async function uploadPostImage(
  hospitalId: string, postId: string, index: number, dataUrl: string,
): Promise<string> {
  return uploadMedia(`${hospitalId}/posts/${postId}/${index}`, dataUrl, 'image/jpeg')
}

export interface PostInput {
  body: string
  images: string[]
  linkUrl: string | null
  linkMeta: LinkMeta | null
  publishAt: string    // ISO. 지금 올리면 현재 시각, 예약이면 미래 시각
}

// API 라우트 호출용 헤더 — 브라우저 세션이 localStorage에 있어서 쿠키로는 서버에 전달되지 않는다.
// 액세스 토큰을 직접 실어 보내야 라우트가 "누가 부른 요청인지" 알 수 있다(@/lib/supabase/route 참고).
async function authHeaders(): Promise<Record<string, string>> {
  const sb = createClient()
  const { data: { session } } = await sb.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }
}

// 병원 현장에서 새 검사가 입력됐을 때 보호자들에게 즉시 알림
export async function notifyNewExam(childId: string, hospitalName?: string): Promise<void> {
  await fetch('/api/exam-notify', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ childId, hospitalName }),
  })
}

// 링크 미리보기 수집 — 원장이 글을 저장할 때 한 번만. 실패해도 링크는 그대로 저장한다.
// reason: 왜 못 가져왔는지(응답 코드·태그 없음 등). 배포 환경에서만 재현되는 실패가 있어
// 원장 화면에 그대로 보여줘야 원인을 짚을 수 있다.
export async function fetchLinkPreview(url: string): Promise<{ meta: LinkMeta | null; reason?: string }> {
  try {
    const res = await fetch('/api/link-preview', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ url }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) return { meta: null, reason: data?.error ?? `API ${res.status}` }
    return { meta: (data?.meta as LinkMeta) ?? null, reason: data?.reason }
  } catch (err) {
    return { meta: null, reason: err instanceof Error ? err.message : '호출 실패' }
  }
}

export async function createHospitalPost(
  hospitalId: string, postId: string, input: PostInput,
): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('eyebody_hospital_posts').insert({
    id: postId, hospital_id: hospitalId,
    body: input.body.trim() || null,
    images: input.images,
    link_url: input.linkUrl,
    link_meta: input.linkMeta,
    publish_at: input.publishAt,
  })
  if (error) throw new Error(error.message || '소식 등록에 실패했습니다')
}

export async function updateHospitalPost(postId: string, input: PostInput): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('eyebody_hospital_posts').update({
    body: input.body.trim() || null,
    images: input.images,
    link_url: input.linkUrl,
    link_meta: input.linkMeta,
    publish_at: input.publishAt,
    updated_at: new Date().toISOString(),
  }).eq('id', postId)
  if (error) throw new Error(error.message || '소식 수정에 실패했습니다')
}

// 글과 함께 그 글의 이미지 파일까지 지운다(고아 파일 방지).
// 파일 정리가 실패해도 글 삭제는 되돌리지 않는다 — 사용자에겐 지워진 게 맞고, 남는 건 빈 파일뿐이다.
export async function deleteHospitalPost(hospitalId: string, postId: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('eyebody_hospital_posts').delete().eq('id', postId)
  if (error) throw error
  const paths = Array.from({ length: POST_IMAGE_MAX }, (_, i) => `${hospitalId}/posts/${postId}/${i}`)
  await sb.storage.from(MEDIA_BUCKET).remove(paths).catch(() => {})
}

// 병원 QR 연결 토큰 (설정 화면 전용 — Hospital 타입엔 안 넣음, 스태프 화면에서만 필요)
export async function fetchConnectToken(hospitalId: string): Promise<string> {
  const sb = createClient()
  const { data, error } = await sb.from('eyebody_hospitals').select('connect_token').eq('id', hospitalId).single()
  if (error) throw error
  return data.connect_token as string
}

// 토큰 재발급 — 기존 QR은 무효화됨
export async function regenerateConnectToken(hospitalId: string): Promise<string> {
  const sb = createClient()
  const newToken = crypto.randomUUID().replace(/-/g, '')
  const { error } = await sb.from('eyebody_hospitals').update({ connect_token: newToken }).eq('id', hospitalId)
  if (error) throw error
  return newToken
}

// QR 연결 — 토큰으로 병원 연결, 병원명 반환
export async function connectHospitalByToken(childId: string, token: string): Promise<string> {
  const sb = createClient()
  const { data, error } = await sb.rpc('connect_child_to_hospital', { p_child_id: childId, p_token: token })
  if (error) throw new Error(error.message || '연결에 실패했습니다')
  return data as string
}

// 위치 기반 병원 매칭 → 연결(자동 전환) — 매칭 안 되면 null
export async function linkHospitalByLocation(childId: string, lat: number, lng: number): Promise<string | null> {
  const sb = createClient()
  const { data: hospitalId, error: resolveErr } = await sb.rpc('resolve_hospital_by_location', { p_lat: lat, p_lng: lng })
  if (resolveErr) throw resolveErr
  if (!hospitalId) return null
  const { error: linkErr } = await sb.rpc('link_child_to_hospital', { p_child_id: childId, p_hospital_id: hospitalId })
  if (linkErr) throw linkErr
  return hospitalId as string
}

// ── 계정 ──────────────────────────────────────────────────────

// 회원 탈퇴 — 본인 프로필·단독 소유 자녀 데이터·인증 계정까지 일괄 삭제 (RPC가 원자적 처리)
export async function deleteAccount(): Promise<void> {
  const sb = createClient()
  const { error } = await sb.rpc('delete_account')
  if (error) throw new Error(error.message || '탈퇴 처리에 실패했습니다')
}
