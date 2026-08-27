'use client'

import { useRef, useState } from 'react'

// 인스타그램식 사진 캐러셀 — 좌우로 쓸면 전/후 사진으로 넘어간다.
// 라이브러리 없이 CSS 스크롤 스냅으로 처리: 터치 관성·스크롤바 숨김·접근성(키보드 스크롤)이
// 브라우저 기본 동작으로 따라오고, 드래그 좌표를 직접 계산할 일이 없다.

export default function PostImages({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  if (images.length === 0) return null

  // 스냅이 끝난 위치를 반올림해 현재 장을 판정 — 관성 스크롤 중에도 값이 튀지 않는다
  const handleScroll = () => {
    const el = ref.current
    if (!el || el.clientWidth === 0) return
    const next = Math.round(el.scrollLeft / el.clientWidth)
    if (next !== idx) setIdx(Math.min(next, images.length - 1))
  }

  const goTo = (i: number) => {
    const el = ref.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory rounded-xl
                   [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((url, i) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={url}
            src={url}
            alt={`사진 ${i + 1}`}
            loading="lazy"
            className="w-full h-52 flex-shrink-0 snap-center object-cover bg-gray-100"
          />
        ))}
      </div>

      {images.length > 1 && (
        <>
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/55 text-white text-[11px] pointer-events-none">
            {idx + 1} / {images.length}
          </span>
          <div className="flex justify-center gap-1.5 mt-2">
            {images.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`${i + 1}번째 사진으로`}
                className={`h-1.5 rounded-full transition-all
                  ${i === idx ? 'w-4 bg-teal-500' : 'w-1.5 bg-gray-300'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
