// 링크 미리보기(Open Graph) 수집 — 원장이 소식에 링크를 붙일 때 한 번만 호출한다.
// 결과는 글과 함께 DB에 저장하므로 부모가 볼 때는 외부 요청이 나가지 않는다.
//
// 보안: 원장이 넣은 임의 URL로 "서버가" 요청하는 구조라 SSRF 표면이다.
// 사설/루프백 대역과 http(s) 외 프로토콜을 막고, 리다이렉트도 매 홉마다 다시 검사한다.

import { createRouteClient } from '@/lib/supabase/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FETCH_TIMEOUT_MS = 10000   // 해외 리전에서 국내 사이트를 부를 때 6초는 빠듯할 수 있다
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

// 사이트마다 "미리보기가 붙어 있는 주소"가 따로 있는 경우를 보정한다.
// 네이버 블로그 데스크톱 주소는 og 태그가 전혀 없는 2.8KB짜리 프레임 껍데기를 주고,
// 같은 글의 모바일 주소에만 og:title/image/description이 들어 있다(실측 확인).
// 저장되는 링크는 원장이 넣은 원본 그대로다 — 여기서 바꾸는 건 긁어올 주소뿐.
function normalizeForPreview(u: URL): URL {
  if (u.hostname === 'blog.naver.com') {
    const m = new URL(u.href)
    m.hostname = 'm.blog.naver.com'
    return m
  }
  return u
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
  let url = normalizeForPreview(start)
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await fetch(url, {
      signal,
      redirect: 'manual',
      headers: {
        // 봇임을 밝히는 UA는 네이버·언론사 등에서 자주 차단당한다(특히 데이터센터 IP에서).
        // 링크 미리보기를 만드는 목적이므로 일반 브라우저와 같은 헤더로 요청한다.
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
          + '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
    })
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) return null
      const next = safeUrl(new URL(loc, url).href)
      if (!next) return null
      url = normalizeForPreview(next)   // 단축링크(naver.me 등)가 데스크톱 주소로 튀는 경우도 보정
      continue
    }
    return { res, finalUrl: url }
  }
  return null
}

// <head>에서 og/twitter/기본 태그를 뽑는다. 파서를 붙일 만큼의 일이 아니라 정규식으로 충분.
// content 안에 다른 종류의 따옴표가 그대로 들어있는 페이지가 흔하다
// (예: 네이버 블로그 제목의 '작은따옴표'). 두 종류를 한 문자셋으로 싸잡아 끊으면 제목이 잘리므로
// 여는 따옴표 종류별로 패턴을 나눈다.
function pickMeta(html: string, prop: string): string | null {
  const attr = `(?:property|name)=["']${prop}["']`
  const patterns = [
    new RegExp(`<meta[^>]+${attr}[^>]+content="([^"]*)"`, 'is'),
    new RegExp(`<meta[^>]+${attr}[^>]+content='([^']*)'`, 'is'),
    new RegExp(`<meta[^>]+content="([^"]*)"[^>]+${attr}`, 'is'),
    new RegExp(`<meta[^>]+content='([^']*)'[^>]+${attr}`, 'is'),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return m[1]
  }
  return null
}

const NAMED_ENTITIES: Record<string, string> = {
  quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ',
  middot: '·', hellip: '…', mdash: '—', ndash: '–', laquo: '«', raquo: '»',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
}

const decodeEntities = (s: string) =>
  s.replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
   .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
   .replace(/&([a-z]+);/gi, (m, n) => NAMED_ENTITIES[n.toLowerCase()] ?? m)
   .replace(/&amp;/g, '&')            // amp는 마지막에 — 먼저 풀면 이중 디코드가 된다
   .replace(/\s+/g, ' ')
   .trim()

const clean = (v: string | null, max: number) =>
  v ? decodeEntities(v).slice(0, max) || null : null

export async function POST(req: Request) {
  // 원장(병원 스태프)만 호출할 수 있게 — 공개 URL 프록시로 악용되지 않도록
  const authed = await createRouteClient(req)
  if (!authed) return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return Response.json({ error: '로그인이 만료되었습니다. 다시 로그인해주세요.' }, { status: 401 })
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
      const reason = hit ? `응답 ${hit.res.status}` : '리다이렉트 실패'
      console.error('[link-preview]', url.href, reason)
      return Response.json({ meta: { siteName: url.hostname.replace(/^www\./, '') }, reason })
    }
    const type = hit.res.headers.get('content-type') ?? ''
    if (!type.includes('html')) {
      return Response.json({
        meta: { siteName: hit.finalUrl.hostname.replace(/^www\./, '') },
        reason: `HTML 아님(${type.split(';')[0] || '알 수 없음'})`,
      })
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
    const title = clean(pickMeta(html, 'og:title') ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null, 200)
    if (!title) console.error('[link-preview] 태그 없음', hit.finalUrl.href, 'len', html.length)
    return Response.json({
      reason: title ? undefined : `제목 태그 없음(${html.length}바이트)`,
      meta: {
        title,
        description: clean(pickMeta(html, 'og:description') ?? pickMeta(html, 'description'), 300),
        // 상대경로 og:image도 있으므로 최종 URL 기준으로 절대경로화
        image: image ? new URL(image, hit.finalUrl).href : null,
        siteName: clean(pickMeta(html, 'og:site_name'), 80) ?? hit.finalUrl.hostname.replace(/^www\./, ''),
      },
    })
  } catch (err) {
    const reason = err instanceof Error ? `요청 실패(${err.name})` : '요청 실패'
    console.error('[link-preview]', url.href, err)
    return Response.json({ meta: { siteName: url.hostname.replace(/^www\./, '') }, reason })
  } finally {
    clearTimeout(timer)
  }
}
