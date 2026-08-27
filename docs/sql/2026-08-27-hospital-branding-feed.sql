-- Phase 7 — 병원 브랜딩(로고·컬러) + 병원 소식 피드
-- 적용: Supabase SQL Editor에 그대로 붙여넣어 실행

-- ── 1. 소식 피드 테이블 ────────────────────────────────────────
-- 글 하나에 본문 / 이미지(최대 5장) / 유튜브 링크를 섞어 담는다.
-- 이미지는 Storage에 올리고 여기엔 public URL만 배열로 보관.
create table if not exists public.eyebody_hospital_posts (
  id           uuid primary key default gen_random_uuid(),
  hospital_id  uuid not null references public.eyebody_hospitals(id) on delete cascade,
  body         text,
  images       text[] not null default '{}',
  youtube_url  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz,
  -- 장수 제한은 앱이 아니라 DB에서 강제 (전송량이 이 기능의 유일한 비용)
  constraint hospital_posts_images_max check (cardinality(images) <= 5),
  -- 본문·이미지·영상이 전부 비어 있는 유령 글 방지
  constraint hospital_posts_not_empty check (
    coalesce(btrim(body), '') <> '' or cardinality(images) > 0 or youtube_url is not null
  )
);

create index if not exists eyebody_hospital_posts_feed_idx
  on public.eyebody_hospital_posts (hospital_id, created_at desc);

alter table public.eyebody_hospital_posts enable row level security;

-- 스태프: 자기 병원 글 전체 권한
drop policy if exists "posts: staff all" on public.eyebody_hospital_posts;
create policy "posts: staff all" on public.eyebody_hospital_posts
  for all using (is_hospital_staff(hospital_id)) with check (is_hospital_staff(hospital_id));

-- 부모: "현재" 그 병원에 연결된 자녀의 보호자만 읽기.
-- superseded_at is null 조건이 핵심 — 이탈한 부모에게 옛 병원 소식이 계속 보이면 안 된다.
drop policy if exists "posts: connected guardian select" on public.eyebody_hospital_posts;
create policy "posts: connected guardian select" on public.eyebody_hospital_posts
  for select using (exists (
    select 1 from public.eyebody_hospital_patients hp
    where hp.hospital_id = eyebody_hospital_posts.hospital_id
      and hp.superseded_at is null
      and is_guardian(hp.child_id)
  ));

-- ── 2. 부모 앱용 조회 RPC ──────────────────────────────────────
-- 부모는 "내 자녀의 현재 병원" 글만 보면 되므로 child_id로 받는다.
create or replace function public.hospital_feed(p_child_id uuid, p_limit int default 20)
returns table(
  post_id uuid, post_body text, post_images text[],
  post_youtube_url text, post_created_at timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not is_guardian(p_child_id) then raise exception '권한이 없습니다'; end if;

  return query
  select p.id, p.body, p.images, p.youtube_url, p.created_at
  from eyebody_hospital_patients hp
  join eyebody_hospital_posts p on p.hospital_id = hp.hospital_id
  where hp.child_id = p_child_id and hp.superseded_at is null
  order by p.created_at desc
  limit greatest(1, least(p_limit, 100));
end;
$function$;

-- ── 3. Storage 버킷 (로고 + 소식 이미지 공용) ──────────────────
-- 경로 규칙: 로고 {hospital_id}/logo, 소식 {hospital_id}/posts/{post_id}/{n}
-- 첫 폴더가 병원 id라는 규칙 하나로 아래 정책이 둘 다 커버한다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hospital-media', 'hospital-media', true, 2097152,
        array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 읽기: 공개 버킷이지만 정책을 명시해 둔다(부모 앱이 <img src>로 바로 읽는다)
drop policy if exists "hospital-media: public read" on storage.objects;
create policy "hospital-media: public read" on storage.objects
  for select using (bucket_id = 'hospital-media');

-- 쓰기/수정/삭제: 경로 첫 폴더가 자기 병원 id인 스태프만
drop policy if exists "hospital-media: staff write" on storage.objects;
create policy "hospital-media: staff write" on storage.objects
  for insert with check (
    bucket_id = 'hospital-media'
    and is_hospital_staff(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "hospital-media: staff update" on storage.objects;
create policy "hospital-media: staff update" on storage.objects
  for update using (
    bucket_id = 'hospital-media'
    and is_hospital_staff(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "hospital-media: staff delete" on storage.objects;
create policy "hospital-media: staff delete" on storage.objects
  for delete using (
    bucket_id = 'hospital-media'
    and is_hospital_staff(((storage.foldername(name))[1])::uuid)
  );

-- ── 4. 옛 notice 컬럼 제거 ─────────────────────────────────────
-- 소식 피드가 대체한다. 값이 전부 null이고 입력 UI가 없던 컬럼이라 안전.
-- 단, get_my_hospital이 notice를 리턴하고 있으므로 함수를 먼저 갈아끼운다.
-- 리턴 컬럼 구성이 바뀌므로 create or replace로는 안 되고 drop이 필요하다.
drop function if exists public.get_my_hospital(uuid);

create or replace function public.get_my_hospital(p_child_id uuid)
returns table(id uuid, name text, logo_url text, brand_color text)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not is_guardian(p_child_id) then raise exception '권한이 없습니다'; end if;
  return query
  select h.id, h.name, h.logo_url, h.brand_color
  from eyebody_hospital_patients hp
  join eyebody_hospitals h on h.id = hp.hospital_id
  where hp.child_id = p_child_id and hp.superseded_at is null
  limit 1;
end;
$function$;

alter table public.eyebody_hospitals drop column if exists notice;
