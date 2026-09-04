// 자체검사: 우리 M·S 표가 논문 게재 백분위를 재현하는가
//
// 실행: node src/lib/axialPercentile.check.mts
//
// 왜 필요한가: axialPercentile.ts의 M·S 40개 값은 눈으로 검증할 수 없다.
// 이 검사는 논문(Sci Rep. 2022;12:4850) Table 2에 인쇄된 백분위 180개를
// 그대로 박아두고, 우리 표에서 계산한 값과 대조한다. 표를 잘못 고치면 여기서 깨진다.

import { alAtPercentile, calcPercentile, normP50, normSlope, pctLabel, type Sex } from './axialPercentile.ts'

let failed = 0
function check(name: string, cond: boolean, detail = '') {
  if (!cond) { failed++; console.error(`  ✗ ${name} ${detail}`) }
}

// ── 논문 Table 2 원문 (Age → [2nd, 5th, 10th, 25th, 50th, 75th, 90th, 95th, 98th]) ──
const PAPER: Record<Sex, Record<number, number[]>> = {
  F: {
    6:  [20.84, 21.18, 21.47, 21.97, 22.52, 23.07, 23.56, 23.86, 24.19],
    7:  [21.19, 21.54, 21.85, 22.37, 22.94, 23.52, 24.04, 24.35, 24.70],
    8:  [21.54, 21.90, 22.22, 22.77, 23.37, 23.97, 24.51, 24.83, 25.20],
    9:  [21.82, 22.19, 22.53, 23.09, 23.71, 24.34, 24.90, 25.23, 25.61],
    10: [22.00, 22.38, 22.73, 23.30, 23.94, 24.58, 25.15, 25.49, 25.88],
    11: [22.12, 22.51, 22.86, 23.44, 24.09, 24.73, 25.32, 25.67, 26.06],
    12: [22.21, 22.61, 22.96, 23.55, 24.21, 24.87, 25.46, 25.81, 26.21],
    13: [22.30, 22.70, 23.06, 23.66, 24.32, 24.98, 25.58, 25.94, 26.34],
    14: [22.37, 22.77, 23.13, 23.74, 24.41, 25.08, 25.68, 26.04, 26.45],
    15: [22.43, 22.84, 23.21, 23.82, 24.49, 25.17, 25.78, 26.14, 26.55],
  },
  M: {
    6:  [21.27, 21.61, 21.91, 22.42, 22.98, 23.54, 24.05, 24.35, 24.70],
    7:  [21.63, 21.99, 22.31, 22.84, 23.42, 24.01, 24.54, 24.86, 25.21],
    8:  [22.00, 22.37, 22.70, 23.25, 23.87, 24.48, 25.03, 25.36, 25.73],
    9:  [22.30, 22.69, 23.03, 23.60, 24.23, 24.86, 25.43, 25.78, 26.16],
    10: [22.50, 22.89, 23.24, 23.83, 24.48, 25.12, 25.71, 26.06, 26.45],
    11: [22.64, 23.04, 23.39, 23.98, 24.64, 25.30, 25.89, 26.25, 26.65],
    12: [22.75, 23.15, 23.51, 24.11, 24.78, 25.45, 26.05, 26.41, 26.81],
    13: [22.84, 23.25, 23.61, 24.22, 24.90, 25.57, 26.18, 26.54, 26.95],
    14: [22.91, 23.32, 23.69, 24.30, 24.98, 25.66, 26.28, 26.64, 27.05],
    15: [22.98, 23.39, 23.76, 24.38, 25.07, 25.75, 26.37, 26.74, 27.16],
  },
}

// 우리 모듈은 5개 백분위만 노출한다. 나머지 4개(2/5/95/98)는 같은 M·S와
// 표준정규 분위수로 여기서 직접 계산해 대조한다 — L=1 항등식 자체의 검증.
const Z = [-2.0537489106, -1.6448536270, -1.2815515655, -0.6744897502, 0,
           0.6744897502, 1.2815515655, 1.6448536270, 2.0537489106]
const KEYS = ['p10', 'p25', 'p50', 'p75', 'p90'] as const
const KEY_AT = { 2: 'p10', 3: 'p25', 4: 'p50', 5: 'p75', 6: 'p90' } as const

console.log('1) 논문 Table 2 재현 — 노출 백분위 5개 × 10나이 × 2성별')
for (const sex of ['F', 'M'] as Sex[]) {
  for (let age = 6; age <= 15; age++) {
    for (const [idx, key] of Object.entries(KEY_AT)) {
      const ours = alAtPercentile(key, age, sex)
      const paper = PAPER[sex][age][Number(idx)]
      check(`${sex} ${age}세 ${key}`, Math.abs(ours - paper) <= 0.01,
        `ours=${ours.toFixed(3)} paper=${paper}`)
    }
  }
}

console.log('2) L=1 항등식 — 논문의 9개 백분위 전부 (M·S만으로 재현되는가)')
{
  // 모듈 내부와 같은 M·S를 정수 나이에서 역산해 쓴다: M=P50, S=(P75/M−1)/Z75
  let maxErr = 0
  for (const sex of ['F', 'M'] as Sex[]) {
    for (let age = 6; age <= 15; age++) {
      const M = normP50(age, sex)
      const S = (alAtPercentile('p75', age, sex) / M - 1) / Z[5]
      for (let i = 0; i < 9; i++) {
        const err = Math.abs(M * (1 + S * Z[i]) - PAPER[sex][age][i])
        maxErr = Math.max(maxErr, err)
        check(`${sex} ${age}세 z=${Z[i].toFixed(2)}`, err <= 0.01)
      }
    }
  }
  console.log(`   최대 오차 ${maxErr.toFixed(4)}mm`)
}

console.log('3) calcPercentile 왕복 — 논문 백분위 위치를 넣으면 그 백분위가 나오는가')
for (const sex of ['F', 'M'] as Sex[]) {
  for (let age = 6; age <= 15; age++) {
    for (const [idx, key] of Object.entries(KEY_AT)) {
      const want = [2, 5, 10, 25, 50, 75, 90, 95, 98][Number(idx)]
      const got = calcPercentile(PAPER[sex][age][Number(idx)], age, sex)
      check(`${sex} ${age}세 ${key} 왕복`, got !== null && Math.abs(got - want) <= 1,
        `want=${want} got=${got}`)
    }
  }
}

console.log('4) 참조범위 밖은 null — 숫자를 지어내지 않는가')
check('만 5세', calcPercentile(22.0, 5, 'F') === null)
check('만 15.9세는 15세 연령군', calcPercentile(25.0, 15.9, 'M') !== null)
check('만 16세', calcPercentile(25.0, 16, 'M') === null)
check('만 18세', calcPercentile(25.0, 18, 'M') === null)
check('만 6세 경계 포함', calcPercentile(22.52, 6, 'F') !== null)
check('만 15세 경계 포함', calcPercentile(25.07, 15, 'M') !== null)
check('안축장 NaN', calcPercentile(NaN, 10, 'F') === null)

console.log('5) 성별 분리가 실제로 다른 결과를 내는가')
{
  // 같은 안축장·나이라도 남녀 백분위가 크게 달라야 한다(남아가 0.5mm가량 길다)
  const f = calcPercentile(24.48, 10, 'F')!
  const m = calcPercentile(24.48, 10, 'M')!
  check('10세 24.48mm 남녀 차', f - m >= 20, `F=${f} M=${m}`)  // 실제 22포인트
  check('남아 24.48mm는 중앙값', Math.abs(m - 50) <= 1, `M=${m}`)
}

console.log('6) 감속 곡선 — 나이가 들수록 P50 기울기가 줄어드는가')
for (const sex of ['F', 'M'] as Sex[]) {
  const young = normSlope(7, sex)
  const old = normSlope(14, sex)
  check(`${sex} 7세 > 14세 기울기`, young > old, `${young.toFixed(3)} vs ${old.toFixed(3)}`)
  check(`${sex} 기울기 양수`, old > 0)
}

console.log('7) 라벨 — 질병·정상 판정 표현을 쓰지 않는가')
{
  const words = [pctLabel(95), pctLabel(50), pctLabel(5)].map(l => `${l.prefix} ${l.value}`)
  check('상위 5%', words[0] === '상위 5%', words[0])
  check('중간 범위', words[1] === '중간 범위', words[1])
  check('하위 5%', words[2] === '하위 5%', words[2])
  for (const w of words) {
    check(`"${w}"에 정상/위험 표현 없음`, !/정상|위험|주의|경고|이상/.test(w))
  }
}

if (failed) { console.error(`\n실패 ${failed}건`); process.exit(1) }
console.log('\n전부 통과')
