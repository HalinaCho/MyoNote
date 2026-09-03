-- ⚠️ 이 파일은 새 코드가 배포되고 정상 동작을 확인한 뒤에 실행하세요 ⚠️
--
-- 아직 옛 코드가 돌고 있는 동안 이 컬럼을 지우면, 옛 코드가 검사 저장 시
-- next_appointment에 쓰려다 실패해서 "저장에 실패했습니다"가 뜹니다.
--
-- 실행 순서:
--   1. 2026-09-03-child-next-appointment.sql 실행  (배포 전)
--   2. 배포 → 예약일 입력·수정, 원장 포털 "재방문 필요"가 잘 되는지 확인
--   3. 이 파일 실행                                 (배포 후)
--
-- 되돌릴 수 없습니다. 1번에서 백필이 끝났으므로 값은 이미 아이 행에 옮겨져 있고,
-- 여기서 지우는 건 옛 사본입니다.

alter table public.eyebody_exam_records drop column if exists next_appointment;
