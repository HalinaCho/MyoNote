-- ─────────────────────────────────────────────────────────────
-- AI 월간 리포트 저장 테이블 — 2026-06-23
--
-- 생성된 리포트를 저장해 같은 기간 재조회 시 API 재호출(비용)을 막는다.
-- payload(jsonb) = { headline, sections:[{topic,title,body}], actionTip }
--
-- 접근제어: exam_records/activity_logs와 동일 패턴.
--   RLS ALL via is_guardian(child_id) — 그 자녀의 보호자만 읽기/쓰기.
--   (리포트는 익명 숫자에서 파생된 텍스트이므로 데이터 테이블과 동일하게 직접 접근 허용)
-- ─────────────────────────────────────────────────────────────

create table if not exists public.eyebody_ai_reports (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references public.eyebody_children(id) on delete cascade,
  period_from   date not null,
  period_to     date not null,
  period_label  text not null,
  payload       jsonb not null,
  model         text not null,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists eyebody_ai_reports_child_created_idx
  on public.eyebody_ai_reports (child_id, created_at desc);

alter table public.eyebody_ai_reports enable row level security;

-- 그 자녀의 보호자만 모든 작업 가능 (is_guardian = SECURITY DEFINER 헬퍼)
drop policy if exists "ai_reports: all via guardian" on public.eyebody_ai_reports;
create policy "ai_reports: all via guardian"
  on public.eyebody_ai_reports
  for all
  using (public.is_guardian(child_id))
  with check (public.is_guardian(child_id));
