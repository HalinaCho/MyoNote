// 거리 자가 측정 엔진 (온디바이스, 프레임 서버 전송 없음)
//
// 원리: 핀홀 카메라 모델  D = f · S / s
//   S = 홍채 실제 지름(≈11.7mm, 개인·나이차 매우 작음 → 아이별 보정 불필요)
//   s = 화면상 홍채 지름(px)  ← MediaPipe FaceLandmarker 홍채 랜드마크로 측정
//   f = 카메라 초점거리(px)   ← 웹은 못 읽음. 1회 정밀보정(줄자)으로 저장하거나 기본 FOV로 추정
//
// 정확도: 기본(무보정) ±10~15%, 보정 시 ±5% 수준. "측정"이 아닌 자가 점검·추정.

export const IRIS_MM = 11.7            // 사람 홍채 가로 지름 평균(HVID)
// 무보정 추정용 전면카메라 기본 수평 화각. 셀피캠은 보통 75~85°+로 넓어,
// 좁게 잡으면 f가 과대→거리 과대평가(=경고 놓침, 안전상 나쁨). 현실값에 맞춰 78°로.
// ※ 기기 편차가 커서 무보정은 참고용. 정확히 쓰려면 정밀 보정 권장.
export const DEFAULT_HFOV_DEG = 78
export const NEAR_CM = 30              // 이 미만이면 '가까움'(권장 최소 시청거리 ~30cm)

// MediaPipe 홍채 랜드마크 인덱스 (478 모델): 중심 + 4방향 링
const LEFT_IRIS = { center: 468, ring: [469, 470, 471, 472] }
const RIGHT_IRIS = { center: 473, ring: [474, 475, 476, 477] }

export interface Pt { x: number; y: number; z?: number }

// 기본 FOV로부터 초점거리(px) 추정. f = (W/2) / tan(HFOV/2)
export function estimateFocalPx(frameWidthPx: number, hfovDeg = DEFAULT_HFOV_DEG): number {
  return frameWidthPx / 2 / Math.tan((hfovDeg * Math.PI) / 180 / 2)
}

// 한쪽 홍채 지름(px) = 중심에서 링 4점까지 평균거리 × 2 (축 회전에 강함)
function oneIrisDiameterPx(lm: Pt[], idx: { center: number; ring: number[] }, w: number, h: number): number {
  const c = lm[idx.center]
  const cx = c.x * w, cy = c.y * h
  const r = idx.ring.reduce((sum, i) => {
    const p = lm[i]
    return sum + Math.hypot(p.x * w - cx, p.y * h - cy)
  }, 0) / idx.ring.length
  return r * 2
}

export interface IrisMeasure {
  leftPx: number
  rightPx: number
  avgPx: number
  asymmetry: number   // 좌우 지름 차 비율 — 고개 돌아가면 커짐(품질 게이트)
}

// 양안 홍채 지름 측정. 랜드마크 부족하면 null.
export function measureIris(lm: Pt[], w: number, h: number): IrisMeasure | null {
  if (!lm || lm.length < 478) return null
  const leftPx = oneIrisDiameterPx(lm, LEFT_IRIS, w, h)
  const rightPx = oneIrisDiameterPx(lm, RIGHT_IRIS, w, h)
  if (!(leftPx > 0) || !(rightPx > 0)) return null
  const avgPx = (leftPx + rightPx) / 2
  const asymmetry = Math.abs(leftPx - rightPx) / avgPx
  return { leftPx, rightPx, avgPx, asymmetry }
}

// 홍채 지름(px) + 초점거리(px) → 거리(cm)
export function distanceCm(irisPx: number, focalPx: number): number {
  return (focalPx * IRIS_MM) / irisPx / 10
}

export function median(xs: number[]): number {
  if (xs.length === 0) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// ── 보정값 저장(기기별 초점거리) ────────────────────────────────
const CALIB_KEY = 'myonote_distance_calib_v1'

export interface Calibration {
  focalPx: number     // 보정 시점 초점거리(px)
  frameW: number      // 보정 시점 프레임 가로(px) — 해상도 바뀌면 선형 재스케일
  distanceCm: number  // 보정에 쓴 실제 거리
  ts: number
}

export function getCalibration(): Calibration | null {
  try {
    const raw = localStorage.getItem(CALIB_KEY)
    return raw ? (JSON.parse(raw) as Calibration) : null
  } catch { return null }
}

export function saveCalibration(c: Calibration): void {
  try { localStorage.setItem(CALIB_KEY, JSON.stringify(c)) } catch { /* 저장 실패 무시 */ }
}

export function clearCalibration(): void {
  try { localStorage.removeItem(CALIB_KEY) } catch { /* 무시 */ }
}

// 현재 프레임 가로에 맞는 초점거리(px). 보정값 있으면 해상도 보정해 사용, 없으면 기본 FOV 추정.
export function resolveFocalPx(frameW: number): { focalPx: number; calibrated: boolean } {
  const c = getCalibration()
  if (c && c.frameW > 0) {
    return { focalPx: c.focalPx * (frameW / c.frameW), calibrated: true }
  }
  return { focalPx: estimateFocalPx(frameW), calibrated: false }
}

// 보정: 알려진 거리(cm)에서 측정한 홍채 지름(px) → 초점거리(px) 역산
export function focalFromCalibration(irisPx: number, knownCm: number): number {
  return (irisPx * knownCm * 10) / IRIS_MM
}
