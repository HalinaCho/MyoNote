// 링크 미리보기(Open Graph) 수집 — 원장이 소식에 링크를 붙일 때 한 번만 호출한다.
// 결과는 글과 함께 DB에 저장하므로 부모가 볼 때는 외부 요청이 나가지 않는다.
//
// 보안: 원장이 넣은 임의 URL로 "서버가" 요청하는 구조라 SSRF 표면이다.
// 사설/루프백 대역과 http(s) 외 프로토콜을 막고, 리다이렉트도 매 홉마다 다시 검사한다.

import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FETCH_TIMEOUT_MS = 6000
const MAX_BYTES = 512 * 1024        // <head>만 필요하므로 512KB면 충분
const MAX_REDIRECTS = 3

// 사설망·루프백·링크로컬로 나가는 요청 차단
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return true
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80:')) return true
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])]
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true       // 클라우드 메타데이터 엔드포인트
    if (a >= 224) return true
  }
  return false
}

function safeUrl(raw: string): URL | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch { return null }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (isBlockedHost(url.hostname)) return null
  return url
}

// 리다이렉트를 직접 따라간다 — 자동 추적을 쓰면 중간 홉이 사설망으로 튀어도 알 수 없다
async function fetchHead(start: URL, signal: AbortSignal): Promise<{ res: Response; finalUrl: URL } | null> {
  let url = start
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await fetch(url, {
      signal,
      redirect: 'manual',
      headers: {
        // 봇 차단을 피하려 일반 브라우저처럼 요청. og 태그는 대개 이 정도면 내려온다.
        'User-Agent': 'Mozilla/5.0 (compatible; MyoNoteBot/1.0; +https://myonote.app)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) return null
      const next = safeUrl(new URL(loc, url).href)
      if (!next) return null
      url = next
      continue
    }
    return { res, finalUrl: url }
  }
  return null
}

// <head>에서 og/twitter/기본 태그를 뽑는다. 파서를 붙일 만큼의 일이 아니라 정규식으로 충분.
function pickMeta(html: string, prop: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return m[1]
  }
  return null
}

const decodeEntities = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
   .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
   .replace(/&amp;/g, '&')            // amp는 마지막에 — 먼저 풀면 이중 디코드가 된다
   .trim()

const clean = (v: string | null, max: number) =>
  v ? decodeEntities(v).slice(0, max) || null : null

export async function POST(req: Request) {
  // 원장(병원 스태프)만 호출할 수 있게 — 공개 URL 프록시로 악용되지 않도록
  const authed = await createServerClient()
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  const { data: hospitalId } = await authed.rpc('my_hospital_id')
  if (!hospitalId) return Response.json({ error: '권한이 없습니다.' }, { status: 403 })

  let body: { url?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const url = body.url ? safeUrl(body.url) : null
  if (!url) return Response.json({ error: '열 수 없는 주소입니다.' }, { status: 400 })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const hit = await fetchHead(url, controller.signal)
    if (!hit || !hit.res.ok) {
      // 미리보기를 못 만들어도 링크 자체는 저장할 수 있어야 하므로 도메인만 돌려준다
      return Response.json({ meta: { siteName: url.hostname.replace(/^www\./, '') } })
    }
    const type = hit.res.headers.get('content-type') ?? ''
    if (!type.includes('html')) {
      return Response.json({ meta: { siteName: hit.finalUrl.hostname.replace(/^www\./, '') } })
    }

    // 본문 전체를 받지 않고 앞부분만 — <head>만 필요하고, 거대 페이지에서 메모리를 지키기 위해
    const reader = hit.res.body?.getReader()
    let html = ''
    if (reader) {
      const decoder = new TextDecoder()
      let received = 0
      while (received < MAX_BYTES) {
        const { done, value } = await reader.read()
        if (done) break
        received += value.byteLength
        html += decoder.decode(value, { stream: true })
        if (html.includes('</head>')) break
      }
      await reader.cancel().catch(() => {})
    }

    const image = clean(pickMeta(html, 'og:image') ?? pickMeta(html, 'twitter:image'), 500)
    return Response.json({
      meta: {
        title: clean(pickMeta(html, 'og:title') ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null, 200),
        description: clean(pickMeta(html, 'og:description') ?? pickMeta(html, 'description'), 300),
        // 상대경로 og:image도 있으므로 최종 URL 기준으로 절대경로화
        image: image ? new URL(image, hit.finalUrl).href : null,
        siteName: clean(pickMeta(html, 'og:site_name'), 80) ?? hit.finalUrl.hostname.replace(/^www\./, ''),
      },
    })
  } catch {
    return Response.json({ meta: { siteName: url.hostname.replace(/^www\./, '') } })
  } finally {
    clearTimeout(timer)
  }
}
