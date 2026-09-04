// 원장 포털의 환자 인적사항 표기 — 화면마다 다르게 쓰지 않도록 한 곳에 모은다.
//
// 형식: "2016-03-11 · 여 · 만 10세"
//   - 생년월일은 YYYY-MM-DD. 구분자를 뺀 YYYYMMDD도 써봤지만 8자리가 붙어 있으면
//     오히려 눈이 끊어 읽지 못한다(2026-09-05 되돌림)
//   - 성별은 "남/여" 한 글자. Male/Female은 길어서 줄을 잡아먹는다(같은 날 되돌림)
//   - 나이는 맨 뒤 (생년월일에서 계산되는 파생값이므로)

import { calcAgeLabel, calcAgeYears, dueUrgency } from './date.ts'   // 같은 폴더 상대경로 — 별칭을 안 써야 node로 바로 돌려볼 수 있다

/** 성별 표기. M/F가 아니면 빈 문자열 — 모르는 값을 한쪽으로 단정하지 않는다. */
export function genderLabel(gender?: 'M' | 'F'): string {
  return gender === 'F' ? '여' : gender === 'M' ? '남' : ''
}

/** 환자 한 줄 인적사항. 성별이나 나이를 모르면 그 자리만 빠진다. */
export function patientMeta(birth: string, gender?: 'M' | 'F'): string {
  // birth는 DB의 date 컬럼이라 항상 'YYYY-MM-DD'지만, 형식이 깨지면
  // calcAgeLabel이 "만 NaN세"를 내놓는다. 화면에 NaN을 띄우느니 나이를 뺀다.
  const age = Number.isFinite(calcAgeYears(birth)) ? calcAgeLabel(birth) : ''
  return [birth, genderLabel(gender), age]
    .filter(Boolean)
    .join(' · ')
}

/**
 * 예약일 표시 색. 지난 예약(=재방문 필요)만 강하게 — 화면이 늘 빨가면 정작 급할 때 안 보인다.
 * Tailwind 클래스라 date.ts가 아니라 여기에 둔다(date.ts는 React Native에서도 쓰는 순수 모듈).
 */
export function dueClass(dateStr: string | null): string {
  switch (dueUrgency(dateStr)) {
    case 'overdue': return 'text-rose-600 font-semibold'
    case 'near':    return 'text-rose-500'
    case 'soon':    return 'text-amber-500'
    default:        return 'text-gray-400'
  }
}
