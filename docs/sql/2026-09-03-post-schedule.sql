-- 소식 예약 발행 — 미리 써두고 지정한 시각이 되면 보호자 앱에 나타난다
-- 적용: Supabase SQL Editor에 이 파일 전체를 붙여넣어 실행

-- ── 1. publish_at 컬럼 ──────────────────────────────────────────
-- 기존 글은 작성 시각을 그대로 발행 시각으로 본다(먼저 nullable로 넣고 백필한 뒤 not null).
alter table public.eyebody_hospital_posts add column if not exists publish_at timestamptz;
update public.eyebody_hospital_posts set publish_at = created_at where publish_at is null;
alter table public.eyebody_hospital_posts alter column publish_at set default now();
alter table public.eyebody_hospital_posts alter column publish_at set not null;

-- ── 2. 보호자 피드는 발행 시각이 지난 글만 ───────────────────────
-- 예약 글이 부모 앱에 미리 보이면 안 되므로 publish_at <= now() 로 거른다.
-- 정렬·표시 날짜도 created_at(작성 시각)이 아니라 publish_at을 쓴다 —
-- 미리 써둔 글이 "2주 전 소식"처럼 보이면 안 되기 때문.
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
  select p.id, p.body, p.images, p.link_url, p.link_meta, p.publish_at
  from eyebody_hospital_patients hp
  join eyebody_hospital_posts p on p.hospital_id = hp.hospital_id
  where hp.child_id = p_child_id and hp.superseded_at is null
    and p.publish_at <= now()
  order by p.publish_at desc
  limit greatest(1, least(p_limit, 100));
end;
$function$;
