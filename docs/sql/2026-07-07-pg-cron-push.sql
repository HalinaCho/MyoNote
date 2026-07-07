-- 2026-07-07: 푸시 알림 크론을 Vercel Cron → Supabase pg_cron으로 이전
--
-- 배경: Vercel Hobby 크론은 지정 "시각"이 아니라 해당 시간대 내 임의 시점 실행이라
--   09:00 KST 예약 알림이 실제로는 오후에 도착하는 지연 발생(2026-07-03~ 관측, 최대 4시간).
--   → 이미 사용 중인 Supabase의 pg_cron + pg_net으로 분 단위 정확도 확보.
--
-- 흐름: pg_cron(00:00 UTC = 09:00 KST) → pg_net HTTP GET
--   → https://myonote.app/api/push/cron (Bearer CRON_SECRET 검증은 기존 그대로)
--
-- ⚠️ 실행 전: 아래 <CRON_SECRET> 을 Vercel env의 실제 CRON_SECRET 값으로 치환할 것.
--   (이 파일은 레포에 커밋되므로 실제 시크릿을 절대 기록하지 않는다)
--
-- 함께 배포: vercel.json 크론 제거(이중 발송 방지). 순서 = ①이 SQL 실행·검증 → ②vercel.json 제거 배포.

-- ① 확장 활성화 (이미 켜져 있으면 no-op)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ② 크론 등록 (같은 이름이 있으면 갱신됨 — 재실행 안전)
--    pg_cron은 UTC 기준: '0 0 * * *' = 매일 09:00 KST
select cron.schedule(
  'push-appt-reminder',
  '0 0 * * *',
  $$
  select net.http_get(
    url := 'https://myonote.app/api/push/cron',  -- 2026-07-08 커스텀 도메인으로 갱신
    headers := '{"Authorization": "Bearer <CRON_SECRET>"}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- ③ 검증
-- 등록 확인:
--   select jobid, jobname, schedule, active from cron.job;
-- 실행 이력(다음 날 09시 이후):
--   select jobid, status, return_message, start_time
--   from cron.job_run_details order by start_time desc limit 5;
-- HTTP 응답 확인(status_code 200 + {"ok":true,...} 기대):
--   select id, status_code, content, created
--   from net._http_response order by id desc limit 5;

-- (참고) 제거가 필요할 때:
--   select cron.unschedule('push-appt-reminder');
