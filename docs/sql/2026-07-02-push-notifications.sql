-- 푸시 알림 (PWA 웹 푸시) — 2026-07-02
-- Supabase SQL Editor에서 실행. (스크립트 전체가 하나의 트랜잭션으로 실행됨)
--
-- 1) eyebody_push_subscriptions : 브라우저/기기별 웹 푸시 구독 (사용자 소유)
-- 2) eyebody_notification_prefs  : 사용자별 알림 설정 (병원 예약 알림 며칠 전 = appt_alert_day)
--    ※ 기존 localStorage(mn_alert_day)를 DB로 이전 — 크론(서버)이 읽어야 하므로.
--
-- 두 테이블 모두 auth.users FK + ON DELETE CASCADE → 회원 탈퇴(delete_account) 시 자동 정리.
-- 이 테이블들은 "본인 소유 데이터"라 RLS(user_id = auth.uid())로 직접 쓰기 허용
-- (아동 건강데이터가 아니므로 RPC 경유 불필요). 크론 발송은 service_role 키로 RLS 우회.

-- ── 1. 구독 테이블 ────────────────────────────────────────────
create table if not exists public.eyebody_push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  ua         text,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subs_user on public.eyebody_push_subscriptions(user_id);

alter table public.eyebody_push_subscriptions enable row level security;

drop policy if exists "push_subs: select own" on public.eyebody_push_subscriptions;
create policy "push_subs: select own" on public.eyebody_push_subscriptions
  for select using (user_id = auth.uid());

drop policy if exists "push_subs: insert own" on public.eyebody_push_subscriptions;
create policy "push_subs: insert own" on public.eyebody_push_subscriptions
  for insert with check (user_id = auth.uid());

drop policy if exists "push_subs: delete own" on public.eyebody_push_subscriptions;
create policy "push_subs: delete own" on public.eyebody_push_subscriptions
  for delete using (user_id = auth.uid());

-- ── 2. 알림 설정 테이블 ───────────────────────────────────────
create table if not exists public.eyebody_notification_prefs (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  appt_alert_day int,                       -- 1 | 3 | 7 (며칠 전), null = 예약 알림 끔
  updated_at     timestamptz not null default now()
);

alter table public.eyebody_notification_prefs enable row level security;

drop policy if exists "notif_prefs: select own" on public.eyebody_notification_prefs;
create policy "notif_prefs: select own" on public.eyebody_notification_prefs
  for select using (user_id = auth.uid());

drop policy if exists "notif_prefs: insert own" on public.eyebody_notification_prefs;
create policy "notif_prefs: insert own" on public.eyebody_notification_prefs
  for insert with check (user_id = auth.uid());

drop policy if exists "notif_prefs: update own" on public.eyebody_notification_prefs;
create policy "notif_prefs: update own" on public.eyebody_notification_prefs
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
