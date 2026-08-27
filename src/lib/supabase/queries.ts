// RN 이식 시 createClient만 교체하면 전체 재사용 가능
import { createClient } from './client'
import type { Child, ExamRecord, TreatmentLogs, LifestyleLogs, TreatmentDef, DesiredTreatment, Hospital } from '@/types'
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
    .select('role, eyebody_children(id, name, birth_date, gender, treatments, outdoor_goal, phone_goal)')
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
  }))
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
  return { id, ...input, outdoorGoal: input.outdoorGoal ?? 2, phoneGoal: input.phoneGoal ?? 2, role: 'owner' }
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
    sb.from('eyebody_exam_records').select('id,exam_date,clinic,ax_od,ax_os,sph_od,sph_os,cyl_od,cyl_os,ser_od,ser_os,note,next_appointment').eq('child_id', childId).order('exam_date', { ascending: false }),
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
    note:  r.note ?? '',
    nextAppointment: r.next_appointment ?? '',
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
    note: exam.note || null,
    next_appointment: exam.nextAppointment || null,
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
    note:  data.note ?? '',
    nextAppointment: data.next_appointment ?? '',
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
    note: exam.note || null,
    next_appointment: exam.nextAppointment || null,
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
    note:  data.note ?? '',
    nextAppointment: data.next_appointment ?? '',
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
    .select('id, name, logo_url, brand_color, notice')
    .eq('id', hospitalId)
    .single()
  if (error) throw error
  return {
    id: data.id, name: data.name,
    logoUrl: data.logo_url ?? null, brandColor: data.brand_color ?? null, notice: data.notice ?? null,
  }
}

// 부모 홈 화면 — 현재 연결된 병원(없으면 null)
interface HospitalRow {
  id: string; name: string; logo_url: string | null; brand_color: string | null; notice: string | null
}

export async function fetchMyConnectedHospital(childId: string): Promise<Hospital | null> {
  const sb = createClient()
  const { data, error } = await sb.rpc('get_my_hospital', { p_child_id: childId })
  if (error) throw error
  const row = (data as HospitalRow[])?.[0]
  if (!row) return null
  return {
    id: row.id, name: row.name,
    logoUrl: row.logo_url ?? null, brandColor: row.brand_color ?? null, notice: row.notice ?? null,
  }
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
  nextAppointment: string | null
  byUs: boolean          // 이 병원에서 입력된 검사인지(위치 매칭으로 태깅된 기록)
}

export interface PatientDetail {
  childId: string
  childName: string
  birth: string
  treatments: TreatmentDef[]
  logs: TreatmentLogs
  exams: PatientExam[]
}

interface PatientDetailRow {
  child: { id: string; name: string; birth_date: string; treatments: TreatmentDef[] }
  logs: TreatmentLogs
  exams: {
    id: string; exam_date: string; clinic: string | null
    ax_od: number | null; ax_os: number | null
    ser_od: number | null; ser_os: number | null
    next_appointment: string | null; by_us: boolean | null
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
    treatments: row.child.treatments ?? [],
    logs: row.logs ?? {},
    exams: (row.exams ?? []).map(e => ({
      id: e.id, date: e.exam_date, clinic: e.clinic ?? '',
      axOD: e.ax_od, axOS: e.ax_os, serOD: e.ser_od, serOS: e.ser_os,
      nextAppointment: e.next_appointment, byUs: !!e.by_us,
    })),
  }
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
