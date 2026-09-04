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

// ── 상대 날짜 ─────────────────────────────────────────────────────
// 원장 포털 환자 목록에서 쓴다. 목록에 절대 날짜가 여러 개 놓이면
// 원장이 매번 머릿속으로 오늘을 빼야 한다. 그 뺄셈을 앱이 대신한다.
// (신원 확인용 생년월일만 절대 날짜로 남긴다)

/** 두 'YYYY-MM-DD' 사이의 일수. UTC 자정 기준이라 서머타임·시간대에 흔들리지 않는다. */
export function dayDiff(fromStr: string, toStr: string): number {
  return Math.round((Date.parse(toStr + 'T00:00:00Z') - Date.parse(fromStr + 'T00:00:00Z')) / 86400000)
}

/** 지난 날짜를 "3주 전"처럼. 미래 날짜가 들어오면 빈 문자열. */
export function pastLabel(dateStr: string | null, from: string = today()): string {
  if (!dateStr) return ''
  const d = dayDiff(dateStr, from)
  if (!Number.isFinite(d) || d < 0) return ''
  if (d === 0) return '오늘'
  if (d === 1) return '어제'
  if (d < 7) return `${d}일 전`
  // 경계에서 "0개월 전"·"0년 전"이 나오지 않도록 구간을 딱 붙여 둔다(주는 30일까지, 개월은 11로 상한)
  if (d < 30) return `${Math.floor(d / 7)}주 전`
  if (d < 365) return `${Math.min(11, Math.floor(d / 30))}개월 전`
  return `${Math.floor(d / 365)}년 전`
}

/** 예약일을 "15일 뒤"·"내일"·"8일 지남"처럼. 지난 예약은 음수 쪽으로 표현한다. */
export function dueLabel(dateStr: string | null, from: string = today()): string {
  if (!dateStr) return ''
  const d = dayDiff(from, dateStr)
  if (!Number.isFinite(d)) return ''
  if (d === 0) return '오늘'
  if (d === 1) return '내일'
  if (d > 0) return d < 31 ? `${d}일 뒤` : `${Math.floor(d / 30)}개월 뒤`
  return `${-d}일 지남`
}

/**
 * 예약일의 시급도. 지난 예약이 곧 원장 포털의 "재방문 필요"라 가장 강하게 표시한다.
 * 부모 앱은 지난 예약을 숨기지만(예약이 잡혀 있다고 착각하므로) 원장 화면은 목적이 반대다.
 */
export function dueUrgency(dateStr: string | null, from: string = today()): 'overdue' | 'near' | 'soon' | 'far' | 'none' {
  if (!dateStr) return 'none'
  const d = dayDiff(from, dateStr)
  if (!Number.isFinite(d)) return 'none'
  if (d < 0) return 'overdue'
  if (d <= 3) return 'near'
  if (d <= 7) return 'soon'
  return 'far'
}
