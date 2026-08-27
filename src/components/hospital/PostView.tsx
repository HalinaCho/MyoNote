'use client'

import { useState } from 'react'
import type { HospitalPost } from '@/types'
import { parseYoutubeId, youtubeEmbedUrl } from '@/lib/utils/youtube'

// 소식 글 하나를 그리는 공용 뷰 — 원장 포털 목록과 부모 앱이 같은 모양을 쓴다.
// (양쪽에서 따로 그리면 원장이 보는 모습과 부모가 보는 모습이 서서히 달라진다)
//
// preview=true(부모 홈 카드): 사진은 첫 장만 크게, 본문은 접고 "더보기".
// 영상은 두 모드 모두 그대로 임베드한다 — 눌러서 들어가야 보이면 피드가 아니다.

const BODY_PREVIEW_CHARS = 120   // 실측 대신 글자 수 기준 — 예측 가능하고 레이아웃 측정이 필요 없다

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function PostView({ post, preview = false }: { post: HospitalPost; preview?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const videoId = post.youtubeUrl ? parseYoutubeId(post.youtubeUrl) : null

  const clamped = preview && !expanded && post.body.length > BODY_PREVIEW_CHARS
  const shownImages = preview && !expanded ? post.images.slice(0, 1) : post.images
  const hiddenCount = post.images.length - shownImages.length

  return (
    <article className="space-y-3">
      {post.body && (
        <div>
          <p className={`text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words
            ${clamped ? 'line-clamp-4' : ''}`}>
            {post.body}
          </p>
          {clamped && (
            <button type="button" onClick={() => setExpanded(true)}
              className="mt-0.5 text-xs font-medium text-teal-600 hover:text-teal-700">
              더보기
            </button>
          )}
        </div>
      )}

      {shownImages.length > 0 && (
        preview ? (
          // 홈 카드: 첫 장만 크게. 나머지가 있으면 장수만 배지로 알린다(전송량을 아끼는 이유이기도 하다)
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shownImages[0]} alt="병원 소식 사진" loading="lazy"
              className="w-full h-52 object-cover rounded-xl bg-gray-100" />
            {hiddenCount > 0 && (
              <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/55 text-white text-[11px]">
                사진 {post.images.length}장
              </span>
            )}
          </div>
        ) : (
          // 가로 스크롤 — 세로로 쌓으면 사진 5장짜리 글이 화면을 통째로 먹는다
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
            {shownImages.map((url, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={url}
                src={url}
                alt={`사진 ${i + 1}`}
                loading="lazy"
                className="h-44 w-auto max-w-[85%] object-cover rounded-xl bg-gray-100 flex-shrink-0"
              />
            ))}
          </div>
        )
      )}

      {videoId && (
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
      )}

      <p className="text-[11px] text-gray-400">{fmtDate(post.createdAt)}</p>
    </article>
  )
}
