-- 원장 포털 대시보드 — KPI 전월 대비 + 월별 추이 + 환자 요약(위험도·치료 분포용)
-- 적용: Supabase SQL Editor에 그대로 붙여넣어 실행

-- ── 1. KPI 카드 (전월 대비 비교값 추가) ─────────────────────────
-- 2026-09-03-clinic-home-stats.sql 의 함수를 대체한다(같은 이름으로 재정의).
create or replace function public.hospital_home_stats(p_hospital_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_result jsonb;
  v_this_month date := date_trunc('month', current_date)::date;
  v_last_month date := (date_trunc('month', current_date) - interval '1 month')::date;
begin
  if not is_hospital_staff(p_hospital_id) then raise exception '권한이 없습니다'; end if;

  select jsonb_build_object(
    'total_patients', (
      select count(*) from eyebody_hospital_patients
      where hospital_id = p_hospital_id and superseded_at is null
    ),
    'new_this_month', (
      select count(*) from eyebody_hospital_patients
      where hospital_id = p_hospital_id and connected_at >= v_this_month
    ),
    'new_last_month', (
      select count(*) from eyebody_hospital_patients
      where hospital_id = p_hospital_id
        and connected_at >= v_last_month and connected_at < v_this_month
    ),
    'exams_this_month', (
      select count(*) from eyebody_exam_records
      where entered_by_hospital_id = p_hospital_id and exam_date >= v_this_month
    ),
    'exams_last_month', (
      select count(*) from eyebody_exam_records
      where entered_by_hospital_id = p_hospital_id
        and exam_date >= v_last_month and exam_date < v_this_month
    )
  ) into v_result;

  return v_result;
end;
$function$;

-- ── 2. 월별 추이 (검사 입력 / 신규 연결 / 이탈) ──────────────────
-- 최근 p_months 개월을 빠짐없이(0인 달 포함) 돌려준다 — 클라이언트에서 빈 달을 채우지 않게.
create or replace function public.hospital_monthly_stats(p_hospital_id uuid, p_months int default 12)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_result jsonb;
begin
  if not is_hospital_staff(p_hospital_id) then raise exception '권한이 없습니다'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'month', to_char(m.month, 'YYYY-MM'),
           'exams', (
             select count(*) from eyebody_exam_records er
             where er.entered_by_hospital_id = p_hospital_id
               and er.exam_date >= m.month and er.exam_date < m.month + interval '1 month'
           ),
           'connected', (
             select count(*) from eyebody_hospital_patients hp
             where hp.hospital_id = p_hospital_id
               and hp.connected_at >= m.month and hp.connected_at < m.month + interval '1 month'
           ),
           'churned', (
             select count(*) from eyebody_hospital_patients hp
             where hp.hospital_id = p_hospital_id
               and hp.superseded_at >= m.month and hp.superseded_at < m.month + interval '1 month'
           )
         ) order by m.month), '[]'::jsonb)
  into v_result
  from generate_series(
         date_trunc('month', current_date) - ((greatest(p_months, 1) - 1) || ' months')::interval,
         date_trunc('month', current_date),
         interval '1 month'
       ) as m(month);

  return v_result;
end;
$function$;

-- ── 3. 환자 요약 (진행 위험도 분포 · 치료별 분포용) ──────────────
-- 안축장 연간 성장률은 부모 앱과 같은 로직(src/lib/axialGrowth.ts)으로 계산해야 숫자가 갈리지 않는다.
-- 그래서 SQL은 원자료(최근 24개월 안축장)만 주고, 위험도 판정은 클라이언트가 한다.
create or replace function public.hospital_patient_summary(p_hospital_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_result jsonb;
begin
  if not is_hospital_staff(p_hospital_id) then raise exception '권한이 없습니다'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'child_id', c.id,
           'child_name', c.name,
           'birth_date', c.birth_date,
           'treatments', coalesce(c.treatments, '[]'::jsonb),
           'exams', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'date', er.exam_date, 'ax_od', er.ax_od, 'ax_os', er.ax_os
                    ) order by er.exam_date)
             from eyebody_exam_records er
             where er.child_id = c.id
               and er.exam_date >= current_date - interval '24 months'
               and (er.ax_od is not null or er.ax_os is not null)
           ), '[]'::jsonb)
         ) order by c.name), '[]'::jsonb)
  into v_result
  from eyebody_hospital_patients hp
  join eyebody_children c on c.id = hp.child_id
  where hp.hospital_id = p_hospital_id and hp.superseded_at is null;

  return v_result;
end;
$function$;
