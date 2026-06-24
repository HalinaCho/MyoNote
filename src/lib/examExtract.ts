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

// 긴 변 최대 maxDim으로 축소한 JPEG data URI. (Vercel 본문 4.5MB 제한 + 토큰 절감)
export async function downscaleImage(file: File, maxDim = 2000, quality = 0.85): Promise<string> {
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
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', quality)
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
  if (f.examDate) p.date = f.examDate
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
  if (f.examDate) p.date = f.examDate
  const r = normEye(f.sphRight, f.cylRight)
  const l = normEye(f.sphLeft, f.cylLeft)
  if (r.sphForm != null) p.sphOD = r.sphForm
  if (r.cylForm != null) p.cylOD = r.cylForm
  if (l.sphForm != null) p.sphOS = l.sphForm
  if (l.cylForm != null) p.cylOS = l.cylForm
  return p
}
