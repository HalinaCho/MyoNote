// 원장 포털의 환자 인적사항 표기 — 화면마다 다르게 쓰지 않도록 한 곳에 모은다.
//
// 형식: "20160311 · Female · 만 9세"
//   - 생년월일은 구분자 없이 YYYYMMDD (진료 중 빠르게 읽히도록)
//   - 성별은 Male / Female (한글 "남/여"는 한 글자라 옆 글자와 붙어 읽혀 헷갈린다)
//   - 나이는 맨 뒤 (생년월일에서 계산되는 파생값이므로)

import { calcAgeLabel, calcAgeYears } from './date.ts'   // 같은 폴더 상대경로 — 별칭을 안 써야 node로 바로 돌려볼 수 있다

/** 'YYYY-MM-DD' → 'YYYYMMDD'. 형식이 다르면 원본을 그대로 둔다. */
export function compactBirth(birth: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(birth) ? birth.replace(/-/g, '') : birth
}

/** 성별 표기. M/F가 아니면 빈 문자열 — 모르는 값을 한쪽으로 단정하지 않는다. */
export function genderLabel(gender?: 'M' | 'F'): string {
  return gender === 'F' ? 'Female' : gender === 'M' ? 'Male' : ''
}

/** 환자 한 줄 인적사항. 성별이나 나이를 모르면 그 자리만 빠진다. */
export function patientMeta(birth: string, gender?: 'M' | 'F'): string {
  // birth는 DB의 date 컬럼이라 항상 'YYYY-MM-DD'지만, 형식이 깨지면
  // calcAgeLabel이 "만 NaN세"를 내놓는다. 화면에 NaN을 띄우느니 나이를 뺀다.
  const age = Number.isFinite(calcAgeYears(birth)) ? calcAgeLabel(birth) : ''
  return [compactBirth(birth), genderLabel(gender), age]
    .filter(Boolean)
    .join(' · ')
}
