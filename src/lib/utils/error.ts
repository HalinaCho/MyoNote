// Supabase(PostgrestError)는 Error 인스턴스가 아니라 평범한 객체라서
// `err instanceof Error ? err.message : '조회 실패'` 패턴은 실제 사유를 통째로 삼킨다.
// (예: "Could not find the function public.hospital_monthly_stats" → "조회에 실패했습니다")
// 화면에 사유가 남아야 원인을 바로 알 수 있으므로 어떤 모양이든 메시지를 끄집어낸다.
export function errMessage(err: unknown, fallback = '조회에 실패했습니다'): string {
  if (err instanceof Error) return err.message || fallback
  if (typeof err === 'string') return err || fallback
  if (err && typeof err === 'object') {
    const o = err as { message?: unknown; hint?: unknown; details?: unknown }
    const msg = [o.message, o.hint, o.details].find(v => typeof v === 'string' && v)
    if (typeof msg === 'string') return msg
  }
  return fallback
}
