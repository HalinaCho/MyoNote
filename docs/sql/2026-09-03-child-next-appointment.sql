-- 다음 예약일을 검사 기록에서 떼어내 아이 행으로 옮긴다
-- 적용: 새 코드를 배포하기 "전에" Supabase SQL Editor에 이 파일 전체를 붙여넣어 실행
--
-- 왜: 예약일이 검사 기록마다 붙어 있어서 ①검사 기록이 0건인 아이는 예약을 넣을 곳이 없고
-- ②부모 홈("오늘 이후 가장 이른 예약")과 원장 포털("가장 최근 검사의 예약일")이 서로 다른 값을
-- 볼 수 있었다. 이제 정본은 eyebody_children.next_appointment 하나뿐이다.
-- (옛 컬럼 eyebody_exam_records.next_appointment 삭제는 2026-09-03-drop-exam-next-appointment.sql)

-- ── 1. 컬럼 ─────────────────────────────────────────────────────
-- 예약이 없는 상태가 정상이라 nullable.
alter table public.eyebody_children add column if not exists next_appointment date;

-- ── 2. 백필 ─────────────────────────────────────────────────────
-- 예약이 적힌 검사 중 가장 최근 것(원장 포털이 지금 보던 기준)을 그대로 옮긴다.
update public.eyebody_children c
set next_appointment = (
  select er.next_appointment from public.eyebody_exam_records er
  where er.child_id = c.id and er.next_appointment is not null
  order by er.exam_date desc limit 1
)
where c.next_appointment is null;

-- 보호자 UPDATE 정책("children: update via guardian")이 이미 아이 행 전체를 허용하므로
-- 부모가 예약일을 저장하는 데 추가 정책은 필요 없다.

-- ── 3. 재방문 필요 리스트 ───────────────────────────────────────
-- overdue 절만 아이 컬럼 기준으로 교체. churned(이탈) 절은 기존 정의 그대로다.
create or replace function public.hospital_overdue_patients(p_hospital_id uuid)
 returns table(child_id uuid, child_name text, status text, next_appointment date, days_overdue integer, churned_at date)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not is_hospital_staff(p_hospital_id) then raise exception '권한이 없습니다'; end if;

  return query
  select c.id, c.name, 'overdue'::text,
         c.next_appointment, (current_date - c.next_appointment)::int, null::date
  from eyebody_hospital_patients hp
  join eyebody_children c on c.id = hp.child_id
  where hp.hospital_id = p_hospital_id and hp.superseded_at is null
    and c.next_appointment < current_date

  union all

  select c.id, c.name, 'churned'::text,
         null::date, null::int, hp.superseded_at::date
  from eyebody_hospital_patients hp
  join eyebody_children c on c.id = hp.child_id
  where hp.hospital_id = p_hospital_id
    and hp.superseded_at is not null
    and hp.superseded_at > now() - interval '6 months'
    and not exists (
      select 1 from eyebody_hospital_patients hp2
      where hp2.child_id = hp.child_id and hp2.superseded_at is null
        and hp2.hospital_id = p_hospital_id
    )
  order by 3, 5 desc nulls last;
end;
$function$;

-- ── 4. 환자 목록(로스터) ────────────────────────────────────────
-- 마지막 검사일은 여전히 검사 기록에서, 예약일만 아이 컬럼에서 온다.
create or replace function public.hospital_patient_roster(p_hospital_id uuid)
 returns table(child_id uuid, child_name text, birth_date date, last_exam_date date, next_appointment date)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not is_hospital_staff(p_hospital_id) then raise exception '권한이 없습니다'; end if;

  return query
  select c.id, c.name, c.birth_date, e.ed, c.next_appointment
  from eyebody_hospital_patients hp
  join eyebody_children c on c.id = hp.child_id
  left join lateral (
    select er.exam_date as ed from eyebody_exam_records er
    where er.child_id = hp.child_id order by er.exam_date desc limit 1
  ) e on true
  where hp.hospital_id = p_hospital_id and hp.superseded_at is null
  order by c.name;
end;
$function$;

-- ── 5. 환자 상세 ────────────────────────────────────────────────
-- 예약일이 child로 올라가고 exams 배열에서는 빠진다(검사에 속한 값이 아니게 됐다).
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
      'treatments', coalesce(c.treatments, '[]'::jsonb),
      'next_appointment', c.next_appointment
    ),
    'exams', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', er.id, 'exam_date', er.exam_date, 'clinic', er.clinic,
               'ax_od', er.ax_od, 'ax_os', er.ax_os,
               'ser_od', er.ser_od, 'ser_os', er.ser_os,
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
