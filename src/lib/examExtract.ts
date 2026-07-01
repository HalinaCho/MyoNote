// 검사지 사진 추출 — 클라이언트 헬퍼 (브라우저 전용: canvas/Image 사용)
//
// 흐름: 사진 → downscaleImage(축소 JPEG) → /api/exam-extract(Upstage IE) → 필드
//       → axialToPatch / refractionToPatch(부호 정규화) → 폼에 병합

export interface AxialFields {
  examDate: string | null
  axialRight: number | null
  axialLeft: number | null
}
export interface RefractionFields {
  examDate: string | null
  sphRight: number | null
  sphLeft: number | null
  cylRight: number | null
  cylLeft: number | null
}

// 디코드된 이미지 소스(빠른 경로=ImageBitmap / 폴백=HTMLImageElement 공통 표현)
interface Decoded {
  source: CanvasImageSource
  width: number
  height: number
  close: () => void
}

// 파일을 캔버스에 그릴 수 있는 형태로 디코드.
// 빠른 경로: createImageBitmap(blob 직접 디코드 → 거대 base64 왕복/메모리 회피, EXIF 회전 반영).
// 폴백: FileReader→Image (구형 브라우저).
async function decodeImage(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() }
    } catch {
      // 폴백으로 진행
    }
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result as string)
    fr.onerror = () => reject(new Error('파일을 읽지 못했습니다.'))
    fr.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image()
    im.onload = () => resolve(im)
    im.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'))
    im.src = dataUrl
  })
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} }
}

// 긴 변 최대 maxDim으로 축소한 JPEG data URI. (Vercel 본문 4.5MB 제한 + 토큰 절감)
export async function downscaleImage(file: File, maxDim = 2000, quality = 0.85): Promise<string> {
  const { source, width, height, close } = await decodeImage(file)
  try {
    const scale = Math.min(1, maxDim / Math.max(width, height))
    const w = Math.round(width * scale)
    const h = Math.round(height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('이미지를 처리하지 못했습니다.')
    ctx.drawImage(source, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    close()
  }
}

export async function extractExam(
  type: 'axial' | 'refraction',
  image: string
): Promise<AxialFields | RefractionFields> {
  const res = await fetch('/api/exam-extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, image }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '추출에 실패했습니다.')
  return data.fields
}

// OCR이 읽은 날짜 문자열을 <input type="date">가 받는 YYYY-MM-DD로 정규화.
// 검사지 표기가 제각각이라(2024.03.05 / 2024년 3월 5일 / 24-3-5 / 2024/03/05 [+시각])
// 연-월-일 숫자 3개를 뽑아 정리하고, 말이 안 되는 값(존재하지 않는 날짜·미래·2000년 이전)은
// null로 버려 폼에 깨진 값이 들어가지 않게 한다.
export function normalizeExamDate(raw: string | null | undefined): string | null {
  if (!raw) return null
  // 연도(2~4자리) [구분자] 월(1~2) [구분자] 일(1~2). 구분자 = - . / 년 월 (+공백 허용)
  const m = String(raw).match(/(\d{2,4})\s*[-.\/년]\s*(\d{1,2})\s*[-.\/월]\s*(\d{1,2})/)
  if (!m) return null
  let year = parseInt(m[1], 10)
  const month = parseInt(m[2], 10)
  const day = parseInt(m[3], 10)
  if (year < 100) year += 2000                                  // 2자리 연도 → 20xx
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null // 2/30 등 방지
  if (year < 2000 || d.getTime() > Date.now()) return null      // 미래·과거 이상치 제거
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// 폼에 병합할 부분값 (추출된 것만)
export interface FormPatch {
  date?: string
  axOD?: string
  axOS?: string
  sphOD?: string
  sphOS?: string
  cylOD?: string
  cylOS?: string
}

const mm = (n: number | null) => (n != null && isFinite(n) ? n.toFixed(2) : undefined)

export function axialToPatch(f: AxialFields): FormPatch {
  const p: FormPatch = {}
  const date = normalizeExamDate(f.examDate)
  if (date) p.date = date
  const od = mm(f.axialRight)
  const os = mm(f.axialLeft)
  if (od) p.axOD = od
  if (os) p.axOS = os
  return p
}

// 한 눈의 S/C를 minus-cyl + 부호있는 Sph 폼 표현으로 변환 (SEQ 불변)
function normEye(sph: number | null, cyl: number | null): { sphForm?: string; cylForm?: string } {
  let s = sph
  let c = cyl
  if (s != null && c != null && c > 0) {   // plus-cyl → minus-cyl (둘 다 있을 때만)
    s = s + c
    c = -c
  }
  const out: { sphForm?: string; cylForm?: string } = {}
  if (s != null && isFinite(s)) out.sphForm = s.toFixed(2)        // 부호 포함 ("-3.00"/"1.00")
  if (c != null && isFinite(c)) out.cylForm = Math.abs(c).toFixed(2) // 크기 (폼이 음수 자동 부여)
  return out
}

export function refractionToPatch(f: RefractionFields): FormPatch {
  const p: FormPatch = {}
  const date = normalizeExamDate(f.examDate)
  if (date) p.date = date
  const r = normEye(f.sphRight, f.cylRight)
  const l = normEye(f.sphLeft, f.cylLeft)
  if (r.sphForm != null) p.sphOD = r.sphForm
  if (r.cylForm != null) p.cylOD = r.cylForm
  if (l.sphForm != null) p.sphOS = l.sphForm
  if (l.cylForm != null) p.cylOS = l.cylForm
  return p
}
