-- 0값(야외 0 && 폰 0) 생활습관 유령 레코드 일괄 정리
--
-- 배경: 캘린더 날짜 모달에서 케어만 토글한 뒤 '저장'을 누르면, 생활습관 폼 기본값
--       (outdoor 0 / phone 0)이 그대로 저장돼 유령 레코드가 생기던 버그가 있었음.
--       → 앱에서 수정 완료(입력값 0이면 저장 스킵/삭제). 그 이전에 이미 쌓인 0값 행을 제거.
-- 정의: outdoor_hours = 0 AND phone_hours = 0 인 행 = 의미 없는 유령 기록
--       (sleep은 앱에서 항상 0이라 판단에 불포함. 야외·폰 중 하나라도 값이 있으면 정상 기록으로 보존)
--
-- 실행: Supabase 대시보드 → SQL Editor. 반드시 1) 미리보기로 대상 확인 후 2) 삭제.

-- 1) 삭제 대상 미리보기 (건수·내용 확인)
select child_id, log_date, outdoor_hours, phone_hours, sleep_hours
from eyebody_activity_logs
where outdoor_hours = 0 and phone_hours = 0
order by log_date;

-- 2) 삭제 (위 결과를 확인한 뒤 실행)
delete from eyebody_activity_logs
where outdoor_hours = 0 and phone_hours = 0;
