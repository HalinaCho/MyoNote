// 배경색 위에 올릴 글자색을 자동으로 고른다.
// 원장이 브랜드 컬러로 아무 색이나 고를 수 있는데(밝은 노랑 등), 글자색이 흰색으로 고정돼 있으면
// 병원 이름이 배경에 묻혀 안 보인다. 색을 프리셋으로 제한하는 대신 여기서 대비를 맞춘다.

export const DEFAULT_BRAND_COLOR = '#14b8a6'   // teal-500 — 브랜드 컬러 미설정 시 기본값

// '#rgb' / '#rrggbb' → [r,g,b]. 형식이 이상하면 null.
function parseHex(hex: string): [number, number, number] | null {
  const h = hex.trim().replace(/^#/, '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16)) as [number, number, number]
}

// WCAG 상대 휘도 (sRGB 감마 보정 포함)
function luminance([r, g, b]: [number, number, number]): number {
  const [lr, lg, lb] = [r, g, b].map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}

// 배경 위에서 읽히는 글자색. 파싱 실패 시엔 흰색(기본 브랜드 컬러가 어두운 청록이라 안전한 쪽).
export function contrastText(bgHex: string | null | undefined): '#ffffff' | '#1f2937' {
  const rgb = parseHex(bgHex || DEFAULT_BRAND_COLOR)
  if (!rgb) return '#ffffff'
  return luminance(rgb) > 0.45 ? '#1f2937' : '#ffffff'   // #1f2937 = gray-800(순검정보다 부드럽다)
}

// 글자색과 같은 규칙으로 고른 반투명 보조색 — 부제목·아이콘 배경처럼 살짝 죽인 요소용
export function contrastMuted(bgHex: string | null | undefined): string {
  return contrastText(bgHex) === '#ffffff' ? 'rgba(255,255,255,0.75)' : 'rgba(31,41,55,0.65)'
}
