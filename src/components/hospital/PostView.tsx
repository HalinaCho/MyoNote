'use client'

import { useState } from 'react'
import type { HospitalPost } from '@/types'
import PostImages from './PostImages'
import PostLink from './PostLink'

// 소식 글 하나를 그리는 공용 뷰 — 원장 포털 목록과 부모 앱이 같은 모양을 쓴다.
// (양쪽에서 따로 그리면 원장이 보는 모습과 부모가 보는 모습이 서서히 달라진다)
//
// preview=true(부모 홈 카드): 본문을 접고 "더보기"를 붙인다.
// 사진과 링크는 두 모드가 동일 — 홈에서도 좌우로 쓸어 사진을 넘기고 영상은 바로 재생된다.
// (눌러서 들어가야 보이면 피드가 아니다)

const BODY_PREVIEW_CHARS = 120   // 실측 대신 글자 수 기준 — 예측 가능하고 레이아웃 측정이 필요 없다

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function PostView({ post, preview = false }: { post: HospitalPost; preview?: boolean }) {
  const [expanded, setExpanded] = useState(false)

  const clamped = preview && !expanded && post.body.length > BODY_PREVIEW_CHARS

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

      <PostImages images={post.images} />

      {post.linkUrl && <PostLink url={post.linkUrl} meta={post.linkMeta} />}

      <p className="text-[11px] text-gray-400">{fmtDate(post.createdAt)}</p>
    </article>
  )
}
