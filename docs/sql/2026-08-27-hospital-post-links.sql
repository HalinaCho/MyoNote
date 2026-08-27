-- 병원 소식 — 유튜브 전용 링크를 범용 링크(네이버 블로그·뉴스 등)로 확장
-- 적용: Supabase SQL Editor에 그대로 붙여넣어 실행
-- 선행: 2026-08-27-hospital-branding-feed.sql 이 먼저 적용돼 있어야 함

-- ── 1. 컬럼 확장 ───────────────────────────────────────────────
-- youtube_url → link_url 로 이름 변경(값은 그대로 보존).
-- 컬럼을 이름만 바꾸면 이 컬럼을 참조하는 check 제약(hospital_posts_not_empty)은
-- 새 이름을 자동으로 따라가므로 제약을 다시 만들 필요가 없다.
alter table public.eyebody_hospital_posts rename column youtube_url to link_url;

-- 링크 미리보기(제목·설명·썸네일·사이트명)를 저장해 둔다.
-- 볼 때마다 원문을 긁지 않는 이유: 부모가 홈을 열 때마다 외부 요청이 나가면 느리고,
-- 원문 사이트가 나중에 차단하거나 사라져도 카드가 깨지지 않아야 한다.
alter table public.eyebody_hospital_posts
  add column if not exists link_meta jsonb;

-- ── 2. 부모 앱 조회 RPC 갱신 ───────────────────────────────────
-- 리턴 컬럼 구성이 바뀌므로 create or replace로는 안 되고 drop이 필요하다.
drop function if exists public.hospital_feed(uuid, int);

create or replace function public.hospital_feed(p_child_id uuid, p_limit int default 20)
returns table(
  post_id uuid, post_body text, post_images text[],
  post_link_url text, post_link_meta jsonb, post_created_at timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not is_guardian(p_child_id) then raise exception '권한이 없습니다'; end if;

  return query
  select p.id, p.body, p.images, p.link_url, p.link_meta, p.created_at
  from eyebody_hospital_patients hp
  join eyebody_hospital_posts p on p.hospital_id = hp.hospital_id
  where hp.child_id = p_child_id and hp.superseded_at is null
  order by p.created_at desc
  limit greatest(1, least(p_limit, 100));
end;
$function$;
