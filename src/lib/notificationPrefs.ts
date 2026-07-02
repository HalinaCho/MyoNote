// 알림 설정 — 병원 예약 알림 며칠 전(appt_alert_day). 1 | 3 | 7 | null(끔)
//
// 예전엔 localStorage(mn_alert_day)에 저장했으나, 크론(서버)이 사용자별로 읽어야 해서
// Supabase(eyebody_notification_prefs)로 이전. 기존 로컬값은 최초 1회 DB로 마이그레이션.

import { createClient } from './supabase/client'

const LEGACY_KEY = 'mn_alert_day'

// DB에서 현재 알림일 조회. 행이 없고 예전 로컬값이 있으면 DB로 옮긴 뒤 반환.
export async function getAlertDay(): Promise<number | null> {
  const sb = createClient()
  const { data: userData } = await sb.auth.getUser()
  const userId = userData.user?.id
  if (!userId) return null

  const { data } = await sb
    .from('eyebody_notification_prefs')
    .select('appt_alert_day')
    .eq('user_id', userId)
    .maybeSingle()

  if (data) return data.appt_alert_day ?? null

  // 행 없음 → 레거시 localStorage 값 마이그레이션(있을 때만)
  const legacy = readLegacyAlertDay()
  if (legacy !== null) {
    await setAlertDay(legacy)
    clearLegacyAlertDay()
    return legacy
  }
  return null
}

// 알림일 저장(upsert). null이면 예약 알림 끔.
export async function setAlertDay(day: number | null): Promise<void> {
  const sb = createClient()
  const { data: userData } = await sb.auth.getUser()
  const userId = userData.user?.id
  if (!userId) return

  const { error } = await sb
    .from('eyebody_notification_prefs')
    .upsert(
      { user_id: userId, appt_alert_day: day, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  if (error) throw error
}

function readLegacyAlertDay(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    return raw !== null ? Number(raw) : null
  } catch {
    return null
  }
}

function clearLegacyAlertDay(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    /* noop */
  }
}
