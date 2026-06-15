// RN 이식 시 createClient만 교체하면 전체 재사용 가능
import { createClient } from './client'
import type { Child, ExamRecord, TreatmentLogs, LifestyleLogs } from '@/types'

export interface AddChildInput {
  name: string; birth: string; gender: 'M' | 'F'
  treatAtropine: boolean; treatDreamlens: boolean
}
export interface UpdateChildInput extends AddChildInput { id: string }

// ── 자녀 ──────────────────────────────────────────────────────

export async function fetchChildren(): Promise<Child[]> {
  const sb = createClient()
  const { data, error } = await sb
    .from('eyebody_child_guardians')
    .select('role, eyebody_children(id, name, birth_date, gender, treat_atropine, treat_dreamlens)')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((r: any) => ({
    id:             r.eyebody_children.id,
    name:           r.eyebody_children.name,
    birth:          r.eyebody_children.birth_date,
    gender:         r.eyebody_children.gender,
    treatAtropine:  r.eyebody_children.treat_atropine  ?? false,
    treatDreamlens: r.eyebody_children.treat_dreamlens ?? false,
    role:           r.role,
  }))
}

export async function addChild(input: AddChildInput): Promise<Child> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const id = crypto.randomUUID()
  const { error: e1 } = await sb.from('eyebody_children').insert({
    id, name: input.name, birth_date: input.birth, gender: input.gender,
    treat_atropine: input.treatAtropine, treat_dreamlens: input.treatDreamlens,
  })
  if (e1) throw e1
  const { error: e2 } = await sb.from('eyebody_child_guardians')
    .insert({ child_id: id, user_id: user.id, role: 'owner' })
  if (e2) throw e2

  return { id, ...input, role: 'owner' }
}

export async function updateChild(input: UpdateChildInput): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('eyebody_children').update({
    name: input.name, birth_date: input.birth, gender: input.gender,
    treat_atropine: input.treatAtropine, treat_dreamlens: input.treatDreamlens,
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
    sb.from('eyebody_exam_records').select('*').eq('child_id', childId).order('exam_date', { ascending: false }),
    sb.from('eyebody_treatment_logs').select('log_date, atropine, dreamlens').eq('child_id', childId),
    sb.from('eyebody_activity_logs').select('log_date, outdoor_hours, phone_hours, sleep_hours').eq('child_id', childId),
  ])

  const exams: ExamRecord[] = (examsRes.data ?? []).map((r: any) => ({
    id: r.id, date: r.exam_date, clinic: r.clinic ?? '',
    axOD: r.ax_od != null ? String(r.ax_od) : '',
    axOS: r.ax_os != null ? String(r.ax_os) : '',
    serOD: r.ser_od != null ? String(r.ser_od) : '',
    serOS: r.ser_os != null ? String(r.ser_os) : '',
    note: r.note ?? '',
  }))

  const logs: TreatmentLogs = Object.fromEntries(
    (logsRes.data ?? []).map((r: any) => [r.log_date, { atropine: r.atropine, dreamlens: r.dreamlens }])
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
  childId: string, dateStr: string, atropine: boolean, dreamlens: boolean
): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('eyebody_treatment_logs')
    .upsert({ child_id: childId, log_date: dateStr, atropine, dreamlens },
             { onConflict: 'child_id,log_date' })
  if (error) throw error
}

// ── 검사 기록 ─────────────────────────────────────────────────

export async function saveExam(childId: string, exam: Omit<ExamRecord, 'id'>): Promise<ExamRecord> {
  const sb = createClient()
  const { data, error } = await sb.from('eyebody_exam_records').insert({
    child_id: childId, exam_date: exam.date, clinic: exam.clinic || null,
    ax_od:  exam.axOD  ? parseFloat(exam.axOD)  : null,
    ax_os:  exam.axOS  ? parseFloat(exam.axOS)  : null,
    ser_od: exam.serOD ? parseFloat(exam.serOD) : null,
    ser_os: exam.serOS ? parseFloat(exam.serOS) : null,
    note: exam.note || null,
  }).select().single()
  if (error) throw error
  return {
    id: data.id, date: data.exam_date, clinic: data.clinic ?? '',
    axOD: data.ax_od != null ? String(data.ax_od) : '',
    axOS: data.ax_os != null ? String(data.ax_os) : '',
    serOD: data.ser_od != null ? String(data.ser_od) : '',
    serOS: data.ser_os != null ? String(data.ser_os) : '',
    note: data.note ?? '',
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
  data: { outdoor: number; phone: number; sleep: number }
): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('eyebody_activity_logs')
    .upsert({
      child_id: childId, log_date: dateStr,
      outdoor_hours: data.outdoor, phone_hours: data.phone, sleep_hours: data.sleep,
    }, { onConflict: 'child_id,log_date' })
  if (error) throw error
}

// ── 초대 코드 ─────────────────────────────────────────────────

export async function createInviteCode(role: 'editor' | 'viewer' = 'editor'): Promise<string> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')
  const code = Math.random().toString(36).slice(2, 8).toUpperCase()
  const { error } = await sb.from('eyebody_invite_codes')
    .insert({ code, owner_id: user.id, role })
  if (error) throw error
  return code
}

export async function acceptInviteCode(code: string): Promise<number> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const { data: invite, error: e1 } = await sb.from('eyebody_invite_codes')
    .select('id, owner_id, role').eq('code', code.toUpperCase().trim())
    .is('used_at', null).gt('expires_at', new Date().toISOString()).single()
  if (e1 || !invite) throw new Error('유효하지 않은 코드입니다')
  if (invite.owner_id === user.id) throw new Error('자신의 초대 코드는 사용할 수 없습니다')

  const { data: ownerChildren } = await sb.from('eyebody_child_guardians')
    .select('child_id').eq('user_id', invite.owner_id).eq('role', 'owner')
  if (!ownerChildren?.length) throw new Error('초대자의 자녀 정보를 찾을 수 없습니다')

  let added = 0
  for (const { child_id } of ownerChildren) {
    const { data: existing } = await sb.from('eyebody_child_guardians')
      .select('id').eq('child_id', child_id).eq('user_id', user.id).maybeSingle()
    if (existing) continue
    await sb.from('eyebody_child_guardians').insert({ child_id, user_id: user.id, role: invite.role })
    added++
  }
  await sb.from('eyebody_invite_codes')
    .update({ used_at: new Date().toISOString(), used_by: user.id }).eq('id', invite.id)
  return added
}
