-- ⚠️ 이 파일은 새 코드를 배포하기 "전에" 실행하세요 ⚠️
--
-- 또래 백분위가 남녀로 갈리면서, 원장 포털 환자 상세도 아이의 성별을 알아야 합니다.
-- 이 RPC가 gender를 안 돌려주면 원장 포털의 「또래 비교」와 「진행 예측」 카드가
-- "성별을 등록해주세요" 안내로 바뀝니다(에러는 아니지만 화면이 비어 보입니다).
--
-- 실행 순서:
--   1. 이 파일 실행                (배포 전)
--   2. 배포 → 원장 포털에서 환자 상세의 또래 비교 그래프가 나오는지 확인
--
-- 부모 앱은 이미 Child.gender를 갖고 있어 영향받지 않습니다.
--
-- 변경 내용: child 객체에 'gender' 한 줄 추가. 나머지는 기존 정의 그대로입니다.
-- (현재 정의를 pg_get_functiondef로 읽어와 해당 줄만 넣었습니다)

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
      'gender', c.gender,
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


-- ────────────────────────────────────────────────────────────────
-- 2) 환자 목록(로스터)에도 성별 — 검색 드롭다운과 「전체 목록」에 표시
-- ────────────────────────────────────────────────────────────────
--
-- 이 함수는 RETURNS TABLE이라 반환 컬럼을 추가하려면 create or replace가 안 됩니다.
-- drop 후 다시 만들어야 하고, drop하면 실행 권한도 함께 사라지므로 아래에서 다시 부여합니다.
--
-- 이 블록을 실행하는 순간부터 배포 전까지, 옛 코드는 gender가 undefined인 채로
-- 목록을 그립니다(성별 자리에 '남'으로 보일 뿐 목록·검색은 정상 동작).
-- 반대로 이걸 실행하지 않고 새 코드를 배포하면 모든 환자가 '남'으로 표시됩니다.

drop function if exists public.hospital_patient_roster(uuid);

create function public.hospital_patient_roster(p_hospital_id uuid)
 returns table(child_id uuid, child_name text, birth_date date, gender text,
               last_exam_date date, next_appointment date)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not is_hospital_staff(p_hospital_id) then raise exception '권한이 없습니다'; end if;

  return query
  select c.id, c.name, c.birth_date, c.gender, e.ed, c.next_appointment
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

-- drop으로 사라진 실행 권한 복구 (변경 전과 동일하게)
grant execute on function public.hospital_patient_roster(uuid) to anon, authenticated, service_role;

-- 확인용: 성별이 실려 나오는지
-- select child_name, gender, birth_date from public.hospital_patient_roster('<병원 UUID>') limit 5;
