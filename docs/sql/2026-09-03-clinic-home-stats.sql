-- 원장 포털 홈 화면 통계 카드 (총 환자수 / 이번달 신규 연결 / 이번달 검사 입력)
-- 순응도는 부모 자가입력이라 신뢰도가 낮아 홈 통계에서 제외 — 대신 "우리 병원이 직접 입력한 검사 건수"로 활동량을 보여준다.
-- 적용: Supabase SQL Editor에 그대로 붙여넣어 실행

create or replace function public.hospital_home_stats(p_hospital_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_result jsonb;
begin
  if not is_hospital_staff(p_hospital_id) then raise exception '권한이 없습니다'; end if;

  select jsonb_build_object(
    'total_patients', (
      select count(*) from eyebody_hospital_patients
      where hospital_id = p_hospital_id and superseded_at is null
    ),
    'new_this_month', (
      select count(*) from eyebody_hospital_patients
      where hospital_id = p_hospital_id
        and connected_at >= date_trunc('month', current_date)
    ),
    'exams_this_month', (
      select count(*) from eyebody_exam_records
      where entered_by_hospital_id = p_hospital_id
        and exam_date >= date_trunc('month', current_date)
    )
  ) into v_result;

  return v_result;
end;
$function$;
