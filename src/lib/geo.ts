// 위치 기반 병원 인식 — best-effort 헬퍼. 실패(미지원·권한거부·타임아웃)하면 null만 반환,
// 호출부는 이를 "위치 매칭 없이 그냥 자가입력"으로 처리하면 됨 (아무것도 깨지지 않음).

export function isGeoSupported(): boolean {
  return typeof window !== 'undefined' && 'geolocation' in navigator
}

export interface Coords { lat: number; lng: number }

export function getCurrentPosition(): Promise<Coords | null> {
  if (!isGeoSupported()) return Promise.resolve(null)
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
  })
}
