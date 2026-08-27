'use client'

import { useState } from 'react'
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
  const [imageFailed, setImageFailed] = useState(false)
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
  const showImage = !!meta?.image && !imageFailed
  const site = meta?.siteName || host
  const title = meta?.title

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-stretch gap-3 rounded-xl border border-gray-200 overflow-hidden hover:bg-gray-50 transition-colors"
    >
      {showImage && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={meta!.image!}
          alt=""
          loading="lazy"
          // 네이버 썸네일 서버(pstatic.net)는 외부 사이트 리퍼러가 붙은 요청을 403으로 막는다.
          // 리퍼러를 아예 보내지 않으면 통과한다(실측 확인). 다른 사이트에도 흔한 제약이라 전부 적용.
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}   // 그래도 막히면 글자만 있는 카드로
          className="w-24 h-24 object-cover bg-gray-100 flex-shrink-0"
        />
      )}
      <div className={`min-w-0 flex-1 py-2.5 pr-3 flex flex-col justify-center ${showImage ? '' : 'pl-3'}`}>
        {/* 제목을 못 가져온 링크라도 도메인을 앞세운다 — 긴 주소를 그대로 노출하면 읽히지도 않고
            부모 입장에서 무엇으로 이어지는 링크인지 알 수 없다 */}
        <p className="text-sm font-semibold text-gray-800 line-clamp-2 break-words">
          {title || site}
        </p>
        {meta?.description && (
          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2 break-words">{meta.description}</p>
        )}
        <p className="mt-1 text-[11px] text-gray-400 flex items-center gap-1 truncate">
          <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[9px]" />
          {title ? site : '링크 열기'}
        </p>
      </div>
    </a>
  )
}
