// 로그인 시 수집하는 동의 기록 (개인정보 처리방침 + 민감정보=자녀 건강정보 처리)
// OAuth 리다이렉트로 폼 상태가 유실되므로, 동의 시점을 로컬에 기록해 둔다.
const KEY = 'myonote.consent'

export interface ConsentRecord {
  privacy: boolean   // 개인정보 처리방침 동의
  sensitive: boolean // 민감정보(건강정보) 수집·이용 동의
  at: string         // 동의 일시 (ISO)
}

export function recordConsent(): void {
  try {
    const rec: ConsentRecord = { privacy: true, sensitive: true, at: new Date().toISOString() }
    localStorage.setItem(KEY, JSON.stringify(rec))
  } catch { /* localStorage 불가 환경 무시 */ }
}

export function getConsent(): ConsentRecord | null {
  try {
    const v = localStorage.getItem(KEY)
    return v ? (JSON.parse(v) as ConsentRecord) : null
  } catch {
    return null
  }
}
