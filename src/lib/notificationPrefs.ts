const KEY = 'mn_alert_day'

export function getAlertDay(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    return raw !== null ? Number(raw) : null
  } catch { return null }
}

export function setAlertDay(day: number | null): void {
  if (typeof window === 'undefined') return
  if (day === null) localStorage.removeItem(KEY)
  else localStorage.setItem(KEY, String(day))
}
