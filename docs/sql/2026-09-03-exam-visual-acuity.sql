-- 검사기록에 나안시력(UCVA) 추가 — 우안/좌안, 소수시력(0.01 ~ 2.0)
-- 적용: Supabase SQL Editor에 이 파일 전체를 붙여넣어 실행

-- ── 1. 컬럼 ─────────────────────────────────────────────────────
-- 둘 다 선택 입력이라 nullable. numeric(3,2)면 0.01~9.99까지 담기고 소수 둘째 자리에서 반올림된다.
alter table public.eyebody_exam_records add column if not exists va_od numeric(3,2);
alter table public.eyebody_exam_records add column if not exists va_os numeric(3,2);

-- ── 2. 범위 제약 ────────────────────────────────────────────────
-- 앱에서도 막지만, 오타로 들어온 값(예: 20)이 그래프를 망치지 않도록 DB에서도 한 번 더 건다.
-- 'add constraint if not exists'가 없으므로 drop 후 add — 여러 번 실행해도 안전하다.
alter table public.eyebody_exam_records drop constraint if exists eyebody_exam_records_va_range;
alter table public.eyebody_exam_records add constraint eyebody_exam_records_va_range check (
  (va_od is null or (va_od >= 0.01 and va_od <= 2.0)) and
  (va_os is null or (va_os >= 0.01 and va_os <= 2.0))
);
