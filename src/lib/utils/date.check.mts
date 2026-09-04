// 자체검사: 상대 날짜 문구가 경계에서 깨지지 않는가
//
// 실행: node src/lib/utils/date.check.mts
//
// 왜 필요한가: pastLabel/dueLabel은 일→주→개월→년 구간을 넘나드는 분기라
// 경계에서 "0개월 전" 같은 값이 조용히 나온다(실제로 첫 구현이 그랬다).
// 화면에서는 그런 환자가 있어야만 눈에 띄므로 여기서 잠가둔다.

import { dayDiff, pastLabel, dueLabel, dueUrgency } from './date.ts'

let failed = 0
function eq(name: string, got: unknown, want: unknown) {
  if (got !== want) { failed++; console.error(`  ✗ ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`) }
}

const T = '2026-09-05'   // 기준일 고정 — 오늘이 언제든 결과가 같아야 한다

console.log('1) dayDiff')
eq('같은 날', dayDiff(T, T), 0)
eq('하루 뒤', dayDiff(T, '2026-09-06'), 1)
eq('하루 전', dayDiff(T, '2026-09-04'), -1)
eq('해를 넘김', dayDiff('2025-12-31', '2026-01-01'), 1)
eq('윤년 2월', dayDiff('2028-02-28', '2028-03-01'), 2)

console.log('2) pastLabel — 구간 경계')
eq('당일',    pastLabel('2026-09-05', T), '오늘')
eq('1일',     pastLabel('2026-09-04', T), '어제')
eq('2일',     pastLabel('2026-09-03', T), '2일 전')
eq('6일',     pastLabel('2026-08-30', T), '6일 전')
eq('7일',     pastLabel('2026-08-29', T), '1주 전')
eq('28일',    pastLabel('2026-08-08', T), '4주 전')   // 예전엔 "0개월 전"이 나왔다
eq('29일',    pastLabel('2026-08-07', T), '4주 전')
eq('30일',    pastLabel('2026-08-06', T), '1개월 전')
eq('364일',   pastLabel('2025-09-06', T), '11개월 전') // "12개월 전"으로 새지 않게
eq('365일',   pastLabel('2025-09-05', T), '1년 전')
eq('730일',   pastLabel('2024-09-05', T), '2년 전')
eq('미래',    pastLabel('2026-09-06', T), '')
eq('없음',    pastLabel(null, T), '')
eq('깨진 값', pastLabel('2026/09/01', T), '')

console.log('3) dueLabel — 지난 예약은 음수 쪽')
eq('당일',    dueLabel('2026-09-05', T), '오늘')
eq('내일',    dueLabel('2026-09-06', T), '내일')
eq('15일 뒤', dueLabel('2026-09-20', T), '15일 뒤')
eq('30일 뒤', dueLabel('2026-10-05', T), '30일 뒤')
eq('31일 뒤', dueLabel('2026-10-06', T), '1개월 뒤')
eq('1일 지남', dueLabel('2026-09-04', T), '1일 지남')
eq('8일 지남', dueLabel('2026-08-28', T), '8일 지남')
eq('없음',    dueLabel(null, T), '')

console.log('4) dueUrgency — 지난 예약이 가장 강하게')
eq('지남',   dueUrgency('2026-09-04', T), 'overdue')
eq('당일',   dueUrgency('2026-09-05', T), 'near')
eq('3일',    dueUrgency('2026-09-08', T), 'near')
eq('4일',    dueUrgency('2026-09-09', T), 'soon')
eq('7일',    dueUrgency('2026-09-12', T), 'soon')
eq('8일',    dueUrgency('2026-09-13', T), 'far')
eq('없음',   dueUrgency(null, T), 'none')

console.log('5) 어떤 입력에도 "0개월"·"0년"·"NaN"이 새지 않는가')
for (let back = 0; back <= 800; back++) {
  const d = new Date(Date.parse(T + 'T00:00:00Z') - back * 86400000).toISOString().slice(0, 10)
  for (const [label, fn] of [['pastLabel', pastLabel], ['dueLabel', dueLabel]] as const) {
    const s = fn(d, T)
    if (/(^|\D)0(개월|년|일|주)/.test(s) || s.includes('NaN')) {
      failed++; console.error(`  ✗ ${label}(${d}) = "${s}"`)
    }
  }
}

if (failed) { console.error(`\n실패 ${failed}건`); process.exit(1) }
console.log('\n전부 통과')
