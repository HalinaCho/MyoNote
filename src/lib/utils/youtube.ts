// 유튜브 링크에서 영상 id를 뽑는다. 원장이 붙여넣는 형태가 제각각이라(공유 링크·주소창 복사·쇼츠)
// 세 가지를 모두 받아준다. 못 알아보면 null → 저장 단계에서 막고 안내한다.
//   https://youtu.be/VIDEOID
//   https://www.youtube.com/watch?v=VIDEOID
//   https://www.youtube.com/shorts/VIDEOID  (embed/live 도 같은 규칙)

const ID = /^[\w-]{11}$/   // 유튜브 영상 id는 11자

export function parseYoutubeId(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  if (ID.test(raw)) return raw                       // id만 붙여넣은 경우

  let url: URL
  try {
    url = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
  } catch { return null }

  const host = url.hostname.replace(/^www\./, '')
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0]
    return ID.test(id) ? id : null
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const v = url.searchParams.get('v')
    if (v && ID.test(v)) return v
    const [, kind, id] = url.pathname.split('/')      // /shorts/ID, /embed/ID, /live/ID
    if (['shorts', 'embed', 'live'].includes(kind) && ID.test(id ?? '')) return id
  }
  return null
}

// 임베드 주소. nocookie 도메인 — 부모 앱에 불필요한 추적 쿠키를 심지 않기 위해.
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`
}
