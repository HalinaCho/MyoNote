'use client'

import PostView from './PostView'
import type { HospitalPost } from '@/types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'

// 부모 앱 전체 피드 — 새 라우트나 탭을 만들지 않고 시트로 띄운다(탭 구조를 건드리지 않기 위해).
// 글은 홈에서 이미 받아온 걸 그대로 넘겨받는다 — 시트를 열 때 다시 조회하지 않는다.
export default function HospitalFeedSheet({
  open, onClose, hospitalName, posts,
}: {
  open: boolean
  onClose: () => void
  hospitalName: string
  posts: HospitalPost[]
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-[480px] mt-12 bg-gray-50 rounded-t-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 bg-teal-500 flex-shrink-0">
          <span className="font-bold text-white truncate">{hospitalName} 소식</span>
          <button onClick={onClose} aria-label="닫기" className="text-white/80 hover:text-white text-xl">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {posts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">아직 병원 소식이 없어요.</p>
          ) : (
            posts.map(post => (
              <div key={post.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <PostView post={post} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
