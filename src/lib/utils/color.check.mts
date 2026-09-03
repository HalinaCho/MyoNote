// color.ts 자체검사 — 대비 보정은 눈으로 못 보는 로직이라 assert로 잠가둔다.
// 실행: node src/lib/utils/color.check.mts
import assert from 'node:assert/strict'
import { DEFAULT_BRAND_COLOR, safeBrandColor, onWhite, tint } from './color.ts'

// 검증용 대비 계산 — color.ts와 독립적으로 다시 구현해서 서로를 교차 검증한다
const lum = (hex: string) => {
  const ch = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(ch[0]) + 0.7152 * f(ch[1]) + 0.0722 * f(ch[2])
}
// 브랜드색 틴트를 흰 카드에 얹었을 때의 배경색
const flat = (hex: string, a: number) =>
  '#' + [1, 3, 5].map(i => Math.round(255 + (parseInt(hex.slice(i, i + 2), 16) - 255) * a)
    .toString(16).padStart(2, '0')).join('')
const contrast = (fg: string, bg: string) => {
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

// ── 대비: 어떤 색을 골라도 흰 배경에서 4.5:1 이상 ──
for (const hex of ['#facc15', '#eeeeee', '#ffffff', '#000000', '#14b8a6', '#0a0a2a', '#00ff00']) {
  const fg = onWhite(hex)
  assert.ok(contrast(fg, '#ffffff') >= 4.5, `${hex} → ${fg} 대비 미달 ${contrast(fg, '#ffffff').toFixed(2)}`)
  // 같은 색 12% 틴트 위에서도 4.5:1
  const onTint = onWhite(hex, 0.12)
  const bg = flat(safeBrandColor(hex), 0.12)
  assert.ok(contrast(onTint, bg) >= 4.5, `${hex} 틴트 위 ${onTint} 대비 미달 ${contrast(onTint, bg).toFixed(2)}`)
}

// 형광 노랑은 어두워지되 "노랑"으로 남는다(회색으로 뭉개지지 않는다)
const yellow = onWhite('#facc15')
const [yr, yg, yb] = [1, 3, 5].map(i => parseInt(yellow.slice(i, i + 2), 16))
assert.ok(yr > yb && yg > yb, `노랑이 색상을 잃었다: ${yellow}`)

// 이미 충분히 어두운 색은 손대지 않는다
assert.equal(onWhite('#000000'), '#000000')

// ── 잘못된 색값은 기본색 경로를 탄다 ──
for (const bad of ['red', '#12345', '#GGGGGG', '', null, undefined]) {
  assert.equal(safeBrandColor(bad), DEFAULT_BRAND_COLOR, `${bad} 폴백 실패`)
  assert.equal(onWhite(bad), onWhite(DEFAULT_BRAND_COLOR))
  assert.equal(tint(bad, 0.12), 'rgba(20, 184, 166, 0.12)')
}

// 유효한 값은 그대로 통과
assert.equal(safeBrandColor('#FACC15'), '#FACC15')
assert.equal(tint('#facc15', 0.1), 'rgba(250, 204, 21, 0.1)')

console.log('color.ts 자체검사 통과')
