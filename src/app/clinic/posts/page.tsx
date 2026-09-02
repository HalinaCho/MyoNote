'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useHospital } from '@/context/HospitalContext'
import * as q from '@/lib/supabase/queries'
import { errMessage } from '@/lib/utils/error'
import { downscaleImage } from '@/lib/examExtract'
import { parseYoutubeId } from '@/lib/utils/youtube'
import PostView from '@/components/hospital/PostView'
import ConfirmModal from '@/components/ui/ConfirmModal'
import type { HospitalPost } from '@/types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faImage, faXmark, faPen, faTrash, faClock, faMobileScreen } from '@fortawesome/free-solid-svg-icons'

const BODY_MAX = 1000
const HOME_VISIBLE = 3      // 보호자 앱 홈에 보이는 최신 글 수 — 부모 홈 카드와 같은 값

// 임시저장은 글·링크·발행시각만 담는다. 사진(dataUrl)까지 넣으면 localStorage 용량(약 5MB)을
// 금방 넘겨 저장 자체가 실패한다 — 사진은 다시 고르는 편이 조용히 날리는 것보다 낫다.
const DRAFT_KEY = (hospitalId: string) => `mn_clinic_post_draft_${hospitalId}`
interface Draft0 { body: string; link: string }

// 편집 중인 이미지 — 이미 올라간 것(url)과 방금 고른 것(dataUrl)을 같은 배열에서 다룬다.
// 저장 시점에 dataUrl만 업로드하면 되므로 순서를 지키면서 섞어 쓸 수 있다.
type Draft = { kind: 'uploaded'; url: string } | { kind: 'new'; dataUrl: string }

// datetime-local 값 ↔ ISO. datetime-local은 로컬시간 문자열이라 그대로 Date에 넣으면 로컬로 해석된다.
const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fmtWhen = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ClinicPostsPage() {
  const { hospital, isLoading, error } = useHospital()
  const [posts, setPosts] = useState<HospitalPost[] | null>(null)
  const [loadError, setLoadError] = useState('')

  const [editing, setEditing] = useState<HospitalPost | 'new' | null>(null)
  const [body, setBody] = useState('')
  const [images, setImages] = useState<Draft[]>([])
  const [link, setLink] = useState('')
  const [scheduled, setScheduled] = useState(false)
  const [publishLocal, setPublishLocal] = useState('')
  const [saving, setSaving] = useState(false)
  const [picking, setPicking] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [deleting, setDeleting] = useState<HospitalPost | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const reload = (hospitalId: string) =>
    q.fetchHospitalPosts(hospitalId).then(setPosts).catch(err => setLoadError(errMessage(err)))

  useEffect(() => { if (hospital) reload(hospital.id) }, [hospital])

  // 새 글을 쓰는 동안에만 임시저장 — 기존 글 수정은 원본이 이미 서버에 있으니 덮어쓸 이유가 없다
  useEffect(() => {
    if (!hospital || editing !== 'new') return
    try {
      localStorage.setItem(DRAFT_KEY(hospital.id), JSON.stringify({ body, link } satisfies Draft0))
    } catch { /* 용량 초과·시크릿 모드면 임시저장만 없는 상태로 동작 */ }
  }, [hospital, editing, body, link])

  const clearDraft = () => {
    if (!hospital) return
    try { localStorage.removeItem(DRAFT_KEY(hospital.id)) } catch { /* 위와 동일 */ }
  }

  const openForm = (post: HospitalPost | 'new') => {
    setEditing(post)
    setImages(post === 'new' ? [] : post.images.map(url => ({ kind: 'uploaded' as const, url })))
    const future = post !== 'new' && new Date(post.publishAt).getTime() > Date.now()
    setScheduled(future)
    setPublishLocal(toLocalInput(post === 'new' ? new Date().toISOString() : post.publishAt))

    if (post === 'new') {
      let restored: Draft0 | null = null
      try {
        const raw = hospital ? localStorage.getItem(DRAFT_KEY(hospital.id)) : null
        const parsed = raw ? JSON.parse(raw) : null
        if (parsed && (parsed.body || parsed.link)) restored = parsed as Draft0
      } catch { /* 못 읽으면 빈 폼으로 */ }
      setBody(restored?.body ?? '')
      setLink(restored?.link ?? '')
      setDraftLoaded(!!restored)
    } else {
      setBody(post.body)
      setLink(post.linkUrl ?? '')
      setDraftLoaded(false)
    }
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const closeForm = () => {
    setEditing(null); setBody(''); setImages([]); setLink('')
    setScheduled(false); setPublishLocal(''); setDraftLoaded(false)
  }

  const addFiles = async (files: File[]) => {
    const room = q.POST_IMAGE_MAX - images.length
    if (room <= 0) { toast.error(`사진은 최대 ${q.POST_IMAGE_MAX}장까지 넣을 수 있어요`); return }
    const picked = files.filter(f => f.type.startsWith('image/'))
    if (picked.length === 0) { toast.error('이미지 파일만 넣을 수 있어요'); return }
    if (picked.length > room) toast(`${room}장만 추가했어요 (최대 ${q.POST_IMAGE_MAX}장)`)

    setPicking(true)
    try {
      // 업로드 전에 줄여서 담는다 — 원본 그대로 두면 전송량이 몇 배로 뛴다
      const drafts = await Promise.all(
        picked.slice(0, room).map(async f => ({
          kind: 'new' as const, dataUrl: await downscaleImage(f, 1280, 0.8),
        })),
      )
      setImages(prev => [...prev, ...drafts])
    } catch {
      toast.error('사진을 불러오지 못했어요')
    } finally {
      setPicking(false)
    }
  }

  const handleSave = async () => {
    if (!hospital || !editing) return
    const trimmed = body.trim()
    if (!trimmed && images.length === 0 && !link.trim()) {
      toast.error('내용, 사진, 링크 중 하나는 있어야 해요'); return
    }
    let linkUrl: string | null = null
    if (link.trim()) {
      const raw = link.trim()
      const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
      try { new URL(withScheme) } catch {
        toast.error('링크 주소를 알아보지 못했어요. 다시 확인해주세요'); return
      }
      linkUrl = withScheme
    }

    // 예약이면 미래여야 의미가 있다. 아니면 지금 시각(기존 글은 원래 발행 시각을 지킨다 —
    // 오타 하나 고쳤다고 날짜가 오늘로 바뀌고 목록 맨 위로 올라오면 안 되니까)
    const nowIso = new Date().toISOString()
    let publishAt: string
    if (scheduled) {
      const when = new Date(publishLocal)
      if (isNaN(when.getTime())) { toast.error('예약 시각을 확인해주세요'); return }
      if (when.getTime() <= Date.now()) { toast.error('예약 시각은 지금보다 뒤여야 해요'); return }
      publishAt = when.toISOString()
    } else {
      publishAt = editing === 'new' || editing.publishAt > nowIso ? nowIso : editing.publishAt
    }

    setSaving(true)
    try {
      const postId = editing === 'new' ? crypto.randomUUID() : editing.id
      // 새로 고른 사진만 업로드. 인덱스는 최종 배열 순서를 그대로 쓴다(파일 경로 = 표시 순서)
      const urls = await Promise.all(images.map((img, i) =>
        img.kind === 'uploaded'
          ? Promise.resolve(img.url)
          : q.uploadPostImage(hospital.id, postId, i, img.dataUrl),
      ))
      // 미리보기(제목·썸네일)는 저장 시 한 번만 수집해 함께 넣는다 —
      // 부모가 볼 때마다 외부 사이트를 긁으면 느리고, 원문이 막혀도 카드가 깨지면 안 된다.
      // 유튜브는 그 자리에서 임베드되므로 미리보기가 필요 없다.
      const needsPreview = !!linkUrl && !parseYoutubeId(linkUrl)
      const preview = needsPreview ? await q.fetchLinkPreview(linkUrl!) : null
      const linkMeta = preview?.meta ?? null
      // 미리보기를 못 만들면 링크는 그대로 저장하되 원장이 알 수 있게 알린다 —
      // 조용히 넘어가면 "왜 썸네일이 안 뜨지"를 원장 혼자 헤매게 된다.
      if (needsPreview && !linkMeta?.title) {
        const why = preview?.reason ? ` (${preview.reason})` : ''
        toast(`링크 미리보기를 가져오지 못했어요${why}. 링크는 그대로 저장됩니다`,
          { icon: '⚠️', duration: 6000 })
      }
      const input = { body: trimmed, images: urls, linkUrl, linkMeta, publishAt }
      if (editing === 'new') await q.createHospitalPost(hospital.id, postId, input)
      else await q.updateHospitalPost(postId, input)
      toast.success(
        scheduled ? `${fmtWhen(publishAt)}에 올라가도록 예약했어요`
          : editing === 'new' ? '소식을 올렸어요' : '수정했어요',
      )
      if (editing === 'new') clearDraft()
      closeForm()
      await reload(hospital.id)
    } catch (err) {
      toast.error(errMessage(err, '저장에 실패했습니다'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!hospital || !deleting) return
    const target = deleting
    setDeleting(null)
    try {
      await q.deleteHospitalPost(hospital.id, target.id)
      toast.success('삭제했어요')
      if (editing !== 'new' && editing?.id === target.id) closeForm()
      await reload(hospital.id)
    } catch (err) {
      toast.error(errMessage(err, '삭제에 실패했습니다'))
    }
  }

  if (error) return <p className="text-sm text-rose-500">{error}</p>
  if (isLoading || !hospital || posts === null) {
    return <div className="animate-pulse text-sm text-gray-400">불러오는 중…</div>
  }
  if (loadError) return <p className="text-sm text-rose-500">{loadError}</p>

  const nowIso = new Date().toISOString()
  const published = posts.filter(p => p.publishAt <= nowIso)
  // 보호자 홈에 실제로 보이는 글 = 발행된 것 중 최신 HOME_VISIBLE개
  const visibleIds = new Set(published.slice(0, HOME_VISIBLE).map(p => p.id))

  const previewPost: HospitalPost = {
    id: 'preview', body,
    images: images.map(i => (i.kind === 'uploaded' ? i.url : i.dataUrl)),
    linkUrl: link.trim() ? (/^https?:\/\//i.test(link.trim()) ? link.trim() : `https://${link.trim()}`) : null,
    linkMeta: null,
    createdAt: nowIso,
    publishAt: scheduled && publishLocal ? new Date(publishLocal).toISOString() : nowIso,
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg text-gray-800">병원 소식 ({posts.length})</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            보호자 앱 홈에는 최신 {HOME_VISIBLE}개가 보입니다. 사진은 글마다 최대 {q.POST_IMAGE_MAX}장.
          </p>
        </div>
        {!editing && (
          <button onClick={() => openForm('new')}
            className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
            <FontAwesomeIcon icon={faPlus} className="text-xs" /> 소식 올리기
          </button>
        )}
      </div>

      {editing && (
        <div ref={formRef} className="flex flex-col lg:flex-row gap-4 items-start">
          {/* ── 좌: 작성 폼 ─────────────────────────────────── */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault(); setDragOver(false)
              addFiles(Array.from(e.dataTransfer.files))
            }}
            onPaste={e => {
              const files = Array.from(e.clipboardData.files)
              if (files.length) { e.preventDefault(); addFiles(files) }
            }}
            className={`flex-1 min-w-0 w-full bg-white rounded-2xl border p-4 space-y-3 transition-colors
              ${dragOver ? 'border-teal-400 bg-teal-50/40' : 'border-teal-200'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">
                {editing === 'new' ? '새 소식' : '소식 수정'}
              </span>
              <button onClick={closeForm} aria-label="닫기" className="text-gray-300 hover:text-gray-500">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {draftLoaded && (
              <div className="flex items-center justify-between bg-amber-50 text-amber-700 text-xs rounded-lg px-3 py-2">
                <span>쓰다 만 내용을 불러왔어요 (사진은 다시 골라주세요)</span>
                <button onClick={() => { setBody(''); setLink(''); setDraftLoaded(false); clearDraft() }}
                  className="font-medium hover:underline">지우기</button>
              </div>
            )}

            <div>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value.slice(0, BODY_MAX))}
                rows={8}
                placeholder="휴진 안내, 이벤트, 새 장비 소식 등을 적어주세요&#10;사진은 이 영역에 끌어다 놓거나 Ctrl+V로 붙여넣을 수 있어요"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <div className="text-[11px] text-gray-400 text-right">{body.length} / {BODY_MAX}</div>
            </div>

            {images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <div key={i} className="relative flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.kind === 'uploaded' ? img.url : img.dataUrl} alt={`사진 ${i + 1}`}
                      className="h-24 w-24 object-cover rounded-lg bg-gray-100" />
                    <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                      aria-label={`사진 ${i + 1} 빼기`}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gray-800/80 text-white text-xs">
                      <FontAwesomeIcon icon={faXmark} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 cursor-pointer
                ${picking || images.length >= q.POST_IMAGE_MAX ? 'opacity-40 pointer-events-none' : 'hover:bg-gray-50'}`}>
                <FontAwesomeIcon icon={faImage} className="text-xs text-gray-400" />
                {picking ? '불러오는 중…' : '사진 추가'}
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.currentTarget.value = '' }} />
              </label>
              <span className="text-[11px] text-gray-400">
                {images.length} / {q.POST_IMAGE_MAX} · 끌어다 놓기·붙여넣기도 됩니다
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">링크 (선택)</label>
              <input value={link} onChange={e => setLink(e.target.value)}
                placeholder="https://blog.naver.com/... 또는 유튜브 주소"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              <p className="text-[11px] text-gray-400 mt-1">
                유튜브는 영상이 바로 재생되고, 블로그·뉴스 등은 제목·썸네일이 있는 카드로 보입니다.
              </p>
            </div>

            <div className="border-t border-gray-50 pt-3">
              <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={() => setScheduled(false)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
                    ${!scheduled ? 'bg-teal-50 border-teal-500 text-teal-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  지금 올리기
                </button>
                <button type="button" onClick={() => setScheduled(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
                    ${scheduled ? 'bg-teal-50 border-teal-500 text-teal-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  <FontAwesomeIcon icon={faClock} className="text-xs" /> 예약
                </button>
              </div>
              {scheduled && (
                <>
                  <input type="datetime-local" value={publishLocal}
                    onChange={e => setPublishLocal(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  <p className="text-[11px] text-gray-400 mt-1">
                    이 시각이 되면 보호자 앱에 자동으로 나타납니다. 그 전에는 원장님만 볼 수 있어요.
                  </p>
                </>
              )}
            </div>

            <button onClick={handleSave} disabled={saving || picking}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-semibold py-2.5 rounded-xl transition-colors">
              {saving ? '올리는 중…' : scheduled ? '예약하기' : editing === 'new' ? '올리기' : '수정 저장'}
            </button>
          </div>

          {/* ── 우: 보호자 앱에서 보이는 모습 ─────────────────── */}
          <div className="w-full lg:w-[390px] lg:shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-2">
              <FontAwesomeIcon icon={faMobileScreen} /> 보호자 앱에서 보이는 모습
            </div>
            <div className="bg-gray-100 rounded-2xl p-3">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                {!body && images.length === 0 && !link.trim() ? (
                  <p className="text-sm text-gray-300 text-center py-8">내용을 입력하면 여기에 보입니다</p>
                ) : (
                  <PostView post={previewPost} preview />
                )}
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              링크 카드의 제목·썸네일은 저장할 때 만들어져서 미리보기에는 주소만 보입니다.
            </p>
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <p className="text-sm text-gray-400">아직 올린 소식이 없습니다.</p>
      ) : (
        // 카드 높이가 제각각이라 그리드 대신 컬럼 — 빈 칸 없이 위에서부터 채워진다
        <div className="columns-1 lg:columns-2 xl:columns-3 gap-4">
          {posts.map(post => {
            const isScheduled = post.publishAt > nowIso
            return (
              <div key={post.id} className="break-inside-avoid mb-4 bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  {isScheduled ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      <FontAwesomeIcon icon={faClock} className="text-[9px]" />
                      {fmtWhen(post.publishAt)} 예약
                    </span>
                  ) : visibleIds.has(post.id) ? (
                    <span className="text-[11px] font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                      보호자 홈에 노출 중
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-300">지난 소식</span>
                  )}
                  <div className="flex gap-1 -mr-1">
                    <button onClick={() => openForm(post)} aria-label="수정"
                      className="w-8 h-8 rounded-lg text-gray-300 hover:text-teal-600 hover:bg-gray-50">
                      <FontAwesomeIcon icon={faPen} className="text-xs" />
                    </button>
                    <button onClick={() => setDeleting(post)} aria-label="삭제"
                      className="w-8 h-8 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-gray-50">
                      <FontAwesomeIcon icon={faTrash} className="text-xs" />
                    </button>
                  </div>
                </div>
                <PostView post={post} />
              </div>
            )
          })}
        </div>
      )}

      <ConfirmModal
        open={!!deleting}
        title="이 소식을 삭제할까요?"
        message="보호자 앱에서도 바로 사라집니다. 되돌릴 수 없어요."
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
