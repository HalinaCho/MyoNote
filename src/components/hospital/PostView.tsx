'use client'

import type { HospitalPost } from '@/types'
import { parseYoutubeId, youtubeEmbedUrl } from '@/lib/utils/youtube'

// 소식 글 하나를 그리는 공용 뷰 — 원장 포털 목록과 부모 앱 피드가 같은 모양을 쓴다.
// (양쪽에서 따로 그리면 원장이 보는 모습과 부모가 보는 모습이 서서히 달라진다)

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function PostView({ post }: { post: HospitalPost }) {
  const videoId = post.youtubeUrl ? parseYoutubeId(post.youtubeUrl) : null

  return (
    <article className="space-y-3">
      {post.body && (
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{post.body}</p>
      )}

      {post.images.length > 0 && (
        // 가로 스크롤 — 세로로 쌓으면 사진 5장짜리 글이 화면을 통째로 먹는다
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          {post.images.map((url, i) => (
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
