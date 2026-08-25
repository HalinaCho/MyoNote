-- 병원(원장) 포털 — 2026-08-25
-- Supabase SQL Editor에서 실행 (스크립트 전체가 하나의 트랜잭션으로 실행됨)
--
-- 신규 엔티티: 병원(hospitals) / 병원 스태프(hospital_staff) / 병원-환자 연결(hospital_patients)
-- 연결은 "활성 1개"만 유지된다(부분 유니크 인덱스) — 새 병원에 연결되면 이전 연결은
-- superseded_at으로 자동 종료된다(= 이탈 감지). 검사기록에 위치 매칭 결과를
-- entered_by_hospital_id로 남긴다(원좌표는 저장하지 않음).
--
-- 병원/스태프 계정은 운영자가 SQL Editor/service_role로 수동 생성 → RLS에 insert 정책 없음.

-- ── 1. 병원 ──────────────────────────────────────────────────
create table if not exists public.eyebody_hospitals (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  logo_url      text,
  brand_color   text,
  notice        text,
  lat           numeric,
  lng           numeric,
  connect_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at    timestamptz not null default now()
);

alter table public.eyebody_hospitals enable row level security;

-- ── 2. 병원 스태프 ────────────────────────────────────────────
create table if not exists public.eyebody_hospital_staff (
  id          uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.eyebody_hospitals(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'staff' check (role in ('owner', 'staff')),
  created_at  timestamptz not null default now(),
  unique (hospital_id, user_id)
);

alter table public.eyebody_hospital_staff enable row level security;

drop policy if exists "hospital_staff: select own" on public.eyebody_hospital_staff;
create policy "hospital_staff: select own" on public.eyebody_hospital_staff
  for select using (user_id = auth.uid());

-- ── 3. 병원-환자 연결 ─────────────────────────────────────────
create table if not exists public.eyebody_hospital_patients (
  id             uuid primary key default gen_random_uuid(),
  hospital_id    uuid not null references public.eyebody_hospitals(id) on delete cascade,
  child_id       uuid not null references public.eyebody_children(id) on delete cascade,
  connected_at   timestamptz not null default now(),
  superseded_at  timestamptz,
  created_at     timestamptz not null default now()
);

-- 자녀당 활성(superseded_at is null) 연결은 최대 1개
create unique index if not exists eyebody_hospital_patients_active_child_uidx
  on public.eyebody_hospital_patients (child_id) where superseded_at is null;

create index if not exists eyebody_hospital_patients_hospital_idx
  on public.eyebody_hospital_patients (hospital_id);

alter table public.eyebody_hospital_patients enable row level security;

-- ── 4. 검사기록에 위치매칭 결과 컬럼 추가 ────────────────────────
alter table public.eyebody_exam_records
  add column if not exists entered_by_hospital_id uuid references public.eyebody_hospitals(id) on delete set null;

-- ── 5. 헬퍼 함수 ──────────────────────────────────────────────
create or replace function public.is_hospital_staff(p_hospital_id uuid)
returns boolean
language sql
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.eyebody_hospital_staff
    where hospital_id = p_hospital_id and user_id = auth.uid()
  );
$$;

-- 로그인한 스태프가 소속된 병원 id (병원당 스태프 여러 명 가능하지만, 한 스태프는 보통 병원 1곳 소속)
create or replace function public.my_hospital_id()
returns uuid
language sql
security definer
set search_path to 'public'
as $$
  select hospital_id from public.eyebody_hospital_staff where user_id = auth.uid() limit 1;
$$;

-- ── 6. 위치 → 병원 매칭 (반경 200m, 원좌표는 저장하지 않음) ──────
create or replace function public.resolve_hospital_by_location(p_lat numeric, p_lng numeric)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  if p_lat is null or p_lng is null then return null; end if;

  select id into v_id
  from public.eyebody_hospitals
  where lat is not null and lng is not null
    and 6371000 * acos(least(1, greatest(-1,
          cos(radians(p_lat)) * cos(radians(lat)) * cos(radians(lng) - radians(p_lng))
          + sin(radians(p_lat)) * sin(radians(lat))
        ))) <= 200
  order by 6371000 * acos(least(1, greatest(-1,
          cos(radians(p_lat)) * cos(radians(lat)) * cos(radians(lng) - radians(p_lng))
          + sin(radians(p_lat)) * sin(radians(lat))
        ))) asc
  limit 1;

  return v_id;
end;
$function$;

-- ── 7. 자녀 ↔ 병원 연결/전환 (최초 연결·자동 전환 공용) ──────────
-- 새 병원으로 연결되면 그 자녀의 기존 활성 연결은 자동으로 종료된다(이탈 감지의 핵심).
create or replace function public.link_child_to_hospital(p_child_id uuid, p_hospital_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not is_guardian(p_child_id) then raise exception '권한이 없습니다'; end if;
  if not exists (select 1 from eyebody_hospitals where id = p_hospital_id) then
    raise exception '유효하지 않은 병원입니다';
  end if;

  update eyebody_hospital_patients
    set superseded_at = now()
    where child_id = p_child_id and superseded_at is null and hospital_id <> p_hospital_id;

  insert into eyebody_hospital_patients (hospital_id, child_id)
  values (p_hospital_id, p_child_id)
  on conflict (child_id) where superseded_at is null do nothing;
end;
$function$;

-- QR 연결 — 토큰으로 병원 조회 후 link_child_to_hospital 재사용
create or replace function public.connect_child_to_hospital(p_child_id uuid, p_token text)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_id uuid; v_name text;
begin
  select id, name into v_id, v_name from eyebody_hospitals where connect_token = trim(p_token);
  if v_id is null then raise exception '유효하지 않은 연결 코드입니다'; end if;
  perform link_child_to_hospital(p_child_id, v_id);
  return v_name;
end;
$function$;

-- ── 8. 부모 홈 화면용 — 현재 연결된 병원 브랜딩 조회 ──────────────
create or replace function public.get_my_hospital(p_child_id uuid)
returns table(id uuid, name text, logo_url text, brand_color text, notice text)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not is_guardian(p_child_id) then raise exception '권한이 없습니다'; end if;
  return query
  select h.id, h.name, h.logo_url, h.brand_color, h.notice
  from eyebody_hospital_patients hp
  join eyebody_hospitals h on h.id = hp.hospital_id
  where hp.child_id = p_child_id and hp.superseded_at is null
  limit 1;
end;
$function$;

-- ── 9. 원장 대시보드 — 재방문 필요 + 이탈(목적지 병원명은 비공개) ──
create or replace function public.hospital_overdue_patients(p_hospital_id uuid)
returns table(
  child_id uuid, child_name text, status text,
  next_appointment date, days_overdue int, churned_at date
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not is_hospital_staff(p_hospital_id) then raise exception '권한이 없습니다'; end if;

  return query
  select c.id, c.name, 'overdue'::text,
         e.na, (current_date - e.na)::int, null::date
  from eyebody_hospital_patients hp
  join eyebody_children c on c.id = hp.child_id
  join lateral (
    -- 컬럼을 na로 별칭: 원래 이름(next_appointment)이 이 함수의 리턴 컬럼명과 겹쳐
    -- plpgsql이 "테이블 컬럼이냐 리턴 변수냐" 구분 못 해 ambiguous 에러가 났음(2026-08-25 수정)
    select er.next_appointment as na from eyebody_exam_records er
    where er.child_id = hp.child_id and er.next_appointment is not null
    order by er.exam_date desc limit 1
  ) e on true
  where hp.hospital_id = p_hospital_id and hp.superseded_at is null
    and e.na < current_date

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

-- ── 10. 원장 대시보드 — 환자 로스터 ───────────────────────────
create or replace function public.hospital_patient_roster(p_hospital_id uuid)
returns table(
  child_id uuid, child_name text, birth_date date,
  last_exam_date date, next_appointment date
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not is_hospital_staff(p_hospital_id) then raise exception '권한이 없습니다'; end if;

  return query
  select c.id, c.name, c.birth_date, e.ed, e.na
  from eyebody_hospital_patients hp
  join eyebody_children c on c.id = hp.child_id
  left join lateral (
    select er.exam_date as ed, er.next_appointment as na from eyebody_exam_records er
    where er.child_id = hp.child_id order by er.exam_date desc limit 1
  ) e on true
  where hp.hospital_id = p_hospital_id and hp.superseded_at is null
  order by c.name;
end;
$function$;

-- ── 11. RLS 정책 (is_hospital_staff 정의 이후로 위치 — 순서 중요) ──
create policy "hospitals: staff select own" on public.eyebody_hospitals
  for select using (is_hospital_staff(id));

create policy "hospitals: staff update own" on public.eyebody_hospitals
  for update using (is_hospital_staff(id)) with check (is_hospital_staff(id));

create policy "hospital_patients: staff select" on public.eyebody_hospital_patients
  for select using (is_hospital_staff(hospital_id));

create policy "hospital_patients: guardian select" on public.eyebody_hospital_patients
  for select using (is_guardian(child_id));
