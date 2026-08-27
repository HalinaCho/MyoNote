-- 원장 포털 Phase 6 나머지 — 환자 순응도 컬럼 + 환자 상세(조회 전용)
-- 적용: Supabase SQL Editor에 그대로 붙여넣어 실행

-- ── 1. 로스터 순응도 계산용 원자료 (환자 목록의 7일/30일 % 컬럼) ──
-- 순응도 %는 클라이언트에서 계산한다. "그날 활성인 케어" 판정이 treatments JSONB의
-- periods(시작~종료) 기반이라, SQL로 옮기면 부모 앱과 로직이 이중화되기 때문.
create or replace function public.hospital_patient_care(p_hospital_id uuid, p_days int default 30)
returns table(care_child_id uuid, care_treatments jsonb, care_logs jsonb)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not is_hospital_staff(p_hospital_id) then raise exception '권한이 없습니다'; end if;

  return query
  select c.id, coalesce(c.treatments, '[]'::jsonb), coalesce(l.logs, '{}'::jsonb)
  from eyebody_hospital_patients hp
  join eyebody_children c on c.id = hp.child_id
  left join lateral (
    -- done(jsonb)이 정본, 없으면 구 컬럼(atropine/dreamlens)으로 폴백 — 부모 앱과 동일 규칙
    select jsonb_object_agg(tl.log_date::text, coalesce(
             tl.done,
             (case when tl.atropine  then '{"atropine":true}'::jsonb  else '{}'::jsonb end)
             || (case when tl.dreamlens then '{"dreamlens":true}'::jsonb else '{}'::jsonb end)
           )) as logs
    from eyebody_treatment_logs tl
    where tl.child_id = hp.child_id and tl.log_date >= current_date - p_days
  ) l on true
  where hp.hospital_id = p_hospital_id and hp.superseded_at is null;
end;
$function$;

-- ── 2. 환자 상세 (조회 전용) ────────────────────────────────────
-- 현재 담당 중(활성 연결)인 환자만 열람 가능 — 이탈한 환자의 이후 검사까지 보이면
-- 옮겨간 병원의 진료 내용이 노출되므로 활성 연결로 제한한다.
create or replace function public.hospital_patient_detail(p_hospital_id uuid, p_child_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_result jsonb;
begin
  if not is_hospital_staff(p_hospital_id) then raise exception '권한이 없습니다'; end if;
  if not exists (
    select 1 from eyebody_hospital_patients hp
    where hp.hospital_id = p_hospital_id and hp.child_id = p_child_id and hp.superseded_at is null
  ) then raise exception '담당 환자가 아닙니다'; end if;

  select jsonb_build_object(
    'child', jsonb_build_object(
      'id', c.id, 'name', c.name, 'birth_date', c.birth_date,
      'treatments', coalesce(c.treatments, '[]'::jsonb)
    ),
    'exams', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', er.id, 'exam_date', er.exam_date, 'clinic', er.clinic,
               'ax_od', er.ax_od, 'ax_os', er.ax_os,
               'ser_od', er.ser_od, 'ser_os', er.ser_os,
               'next_appointment', er.next_appointment,
               'by_us', er.entered_by_hospital_id = p_hospital_id
             ) order by er.exam_date desc)
      from eyebody_exam_records er where er.child_id = c.id
    ), '[]'::jsonb),
    'logs', coalesce((
      select jsonb_object_agg(tl.log_date::text, coalesce(
               tl.done,
               (case when tl.atropine  then '{"atropine":true}'::jsonb  else '{}'::jsonb end)
               || (case when tl.dreamlens then '{"dreamlens":true}'::jsonb else '{}'::jsonb end)
             ))
      from eyebody_treatment_logs tl
      where tl.child_id = c.id and tl.log_date >= current_date - 180
    ), '{}'::jsonb)
  ) into v_result
  from eyebody_children c where c.id = p_child_id;

  return v_result;
end;
$function$;
