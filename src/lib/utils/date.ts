// 날짜 유틸 — Next.js, React Native 모두 재사용 가능

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function today(): string {
  return formatDate(new Date())
}

export function calcAgeYears(birthStr: string): number {
  const birth = parseDate(birthStr)
  const now = new Date()
  return Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

export function calcAgeLabel(birthStr: string): string {
  return `만 ${calcAgeYears(birthStr)}세`
}
