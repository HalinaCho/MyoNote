// AI 상담 답변 스타일 — 사용자별 localStorage 저장
export type ChatStyle = 'short' | 'normal' | 'detailed'

const KEY = 'myonote.chatStyle'

export function getChatStyle(): ChatStyle {
  if (typeof window === 'undefined') return 'short'
  try {
    const v = localStorage.getItem(KEY)
    return v === 'short' || v === 'normal' || v === 'detailed' ? v : 'short'
  } catch {
    return 'short'
  }
}

export function setChatStyle(s: ChatStyle): void {
  try { localStorage.setItem(KEY, s) } catch { /* 무시 */ }
}

export const CHAT_STYLE_LABEL: Record<ChatStyle, string> = {
  short: '간단히',
  normal: '보통',
  detailed: '자세히',
}
