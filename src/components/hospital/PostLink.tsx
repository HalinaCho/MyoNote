'use client'

import type { LinkMeta } from '@/types'
import { parseYoutubeId, youtubeEmbedUrl } from '@/lib/utils/youtube'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons'

// 글에 붙은 링크를 그린다.
//  - 유튜브: 그 자리에서 재생되는 임베드
//  - 그 외(네이버 블로그·뉴스 등): Notion식 링크 미리보기 카드
//
// 임베드가 유튜브뿐인 이유: 네이버·뉴스 등 대부분의 사이트는 X-Frame-Options로
// iframe 삽입을 막아둬서, 넣어봤자 빈 상자가 뜬다. 미리보기 카드가 유일하게 동작하는 방식이다.
// 카드에 쓰는 제목·설명·썸네일은 글을 저장할 때 한 번 수집해 DB에 넣어둔 값이다.

export default function PostLink({ url, meta }: { url: string; meta: LinkMeta | null }) {
  const videoId = parseYoutubeId(url)

  if (videoId) {
    return (
      <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '16 / 9' }}>
        <iframe
          src={youtubeEmbedUrl(videoId)}
          title="병원 소식 영상"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    )
  }

  let host = url
  try { host = new URL(url).hostname.replace(/^www\./, '') } catch { /* 그대로 표시 */ }
  const site = meta?.siteName || host
  const title = meta?.title

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-stretch gap-3 rounded-xl border border-gray-200 overflow-hidden hover:bg-gray-50 transition-colors"
    >
      {meta?.image && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={meta.image} alt="" loading="lazy"
          className="w-24 h-24 object-cover bg-gray-100 flex-shrink-0" />
      )}
      <div className="min-w-0 flex-1 py-2.5 pr-3 flex flex-col justify-center">
        <p className="text-sm font-semibold text-gray-800 line-clamp-2 break-words">
          {title || url}
        </p>
        {meta?.description && (
          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2 break-words">{meta.description}</p>
        )}
        <p className="mt-1 text-[11px] text-gray-400 flex items-center gap-1 truncate">
          <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[9px]" />
          {site}
        </p>
      </div>
    </a>
  )
}
