// 브랜드 색 토큰 — docs/brand-palette.html 기준

// 병원이 브랜드 컬러를 지정하지 않았을 때 쓰는 기본값(teal-500)
export const DEFAULT_BRAND_COLOR = '#14b8a6'

type RGB = [number, number, number]

const HEX6 = /^#[0-9a-fA-F]{6}$/

// brand_color는 DB에 자유 텍스트로 들어간다 — 비어 있거나 형식이 깨졌으면 기본색으로 되돌린다.
// 부모 홈과 원장 포털 미리보기가 모두 이 함수를 거치므로 두 화면이 항상 같은 색을 그린다.
export const safeBrandColor = (hex: string | null | undefined): string =>
  hex && HEX6.test(hex) ? hex : DEFAULT_BRAND_COLOR

const toRgb = (hex: string) =>
  [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as RGB

const round = (c: RGB) => c.map(Math.round) as RGB

// WCAG 상대 휘도(눈이 느끼는 밝기). 초록에 가중치가 큰 건 사람 눈이 초록을 가장 밝게 보기 때문이다.
const luminance = ([r, g, b]: RGB) => {
  const f = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/**
 * 흰 카드 위에서 글자·아이콘으로 써도 읽히도록 브랜드색을 어둡게 보정한다(WCAG 대비 4.5:1).
 * RGB를 같은 비율로 줄이므로 색상은 유지된다 — 원장이 고른 노랑은 "어두운 노랑"이 되지 회색이 되지 않는다.
 *
 * onTintAlpha: 글자가 같은 브랜드색 틴트 위에 얹힐 때 그 틴트의 알파(예: 0.12).
 *   배경이 그만큼 어두워진 걸 감안해 더 진하게 보정한다. 흰 바탕이면 0(기본값).
 */
export function onWhite(hex: string | null | undefined, onTintAlpha = 0): string {
  const base = toRgb(safeBrandColor(hex))
  // 틴트를 흰 카드에 합성한 "실제" 배경색의 밝기 → 그걸 기준으로 목표 대비를 잡는다
  const bgLum = luminance(base.map(v => 255 + (v - 255) * onTintAlpha) as RGB)
  const maxLum = (bgLum + 0.05) / 4.5 - 0.05   // 대비 4.5:1을 만족하는 글자색의 최대 밝기

  let c = base
  // 한 번에 10%씩 어둡게. 24회면 어떤 색이든 검정 근처까지 내려가므로 반드시 끝난다.
  // 반올림한 값으로 판정해야 최종 출력 색이 실제로 4.5:1을 넘긴다.
  for (let i = 0; i < 24 && luminance(round(c)) > maxLum; i++) c = c.map(v => v * 0.9) as RGB
  return '#' + round(c).map(v => v.toString(16).padStart(2, '0')).join('')
}

// 흰 카드 위에 얹는 옅은 브랜드 색면(로고 뒤 원, D-day 배지 배경)
export const tint = (hex: string | null | undefined, alpha: number): string =>
  `rgba(${toRgb(safeBrandColor(hex)).join(', ')}, ${alpha})`
