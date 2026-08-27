'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useHospital } from '@/context/HospitalContext'
import * as q from '@/lib/supabase/queries'
import { downscaleImage } from '@/lib/examExtract'
import { parseYoutubeId } from '@/lib/utils/youtube'
import PostView from '@/components/hospital/PostView'
import ConfirmModal from '@/components/ui/ConfirmModal'
import type { HospitalPost } from '@/types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faImage, faXmark, faPen, faTrash } from '@fortawesome/free-solid-svg-icons'

const BODY_MAX = 1000

// 편집 중인 이미지 — 이미 올라간 것(url)과 방금 고른 것(dataUrl)을 같은 배열에서 다룬다.
// 저장 시점에 dataUrl만 업로드하면 되므로 순서를 지키면서 섞어 쓸 수 있다.
type Draft = { kind: 'uploaded'; url: string } | { kind: 'new'; dataUrl: string }

export default function ClinicPostsPage() {
  const { hospital, isLoading, error } = useHospital()
  const [posts, setPosts] = useState<HospitalPost[] | null>(null)
  const [loadError, setLoadError] = useState('')

  const [editing, setEditing] = useState<HospitalPost | 'new' | null>(null)
  const [body, setBody] = useState('')
  const [images, setImages] = useState<Draft[]>([])
  const [youtube, setYoutube] = useState('')
  const [saving, setSaving] = useState(false)
  const [picking, setPicking] = useState(false)
  const [deleting, setDeleting] = useState<HospitalPost | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const reload = (hospitalId: string) =>
    q.fetchHospitalPosts(hospitalId)
      .then(setPosts)
      .catch(err => setLoadError(err instanceof Error ? err.message : '조회에 실패했습니다'))

  useEffect(() => { if (hospital) reload(hospital.id) }, [hospital])

  const openForm = (post: HospitalPost | 'new') => {
    setEditing(post)
    setBody(post === 'new' ? '' : post.body)
    setImages(post === 'new' ? [] : post.images.map(url => ({ kind: 'uploaded' as const, url })))
    setYoutube(post === 'new' ? '' : (post.youtubeUrl ?? ''))
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  const closeForm = () => { setEditing(null); setBody(''); setImages([]); setYoutube('') }

  const handlePick = async (files: FileList | null) => {
    if (!files?.length) return
    const room = q.POST_IMAGE_MAX - images.length
    if (room <= 0) { toast.error(`사진은 최대 ${q.POST_IMAGE_MAX}장까지 넣을 수 있어요`); return }
    const picked = Array.from(files).filter(f => f.type.startsWith('image/'))
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
    if (!trimmed && images.length === 0 && !youtube.trim()) {
      toast.error('내용, 사진, 영상 중 하나는 있어야 해요'); return
    }
    let youtubeUrl: string | null = null
    if (youtube.trim()) {
      const id = parseYoutubeId(youtube)
      if (!id) { toast.error('유튜브 주소를 알아보지 못했어요. 링크를 다시 확인해주세요'); return }
      youtubeUrl = `https://youtu.be/${id}`   // 형태를 통일해 저장
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
      const input = { body: trimmed, images: urls, youtubeUrl }
      if (editing === 'new') await q.createHospitalPost(hospital.id, postId, input)
      else await q.updateHospitalPost(postId, input)
      toast.success(editing === 'new' ? '소식을 올렸어요' : '수정했어요')
      closeForm()
      await reload(hospital.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장에 실패했습니다')
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
      toast.error(err instanceof Error ? err.message : '삭제에 실패했습니다')
    }
  }

  if (error) return <p className="text-sm text-rose-500">{error}</p>
  if (isLoading || !hospital || posts === null) {
    return <div className="animate-pulse text-sm text-gray-400">불러오는 중…</div>
  }
  if (loadError) return <p className="text-sm text-rose-500">{loadError}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-gray-800">병원 소식 ({posts.length})</h1>
        {!editing && (
          <button onClick={() => openForm('new')}
            className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
            <FontAwesomeIcon icon={faPlus} className="text-xs" /> 소식 올리기
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 -mt-2">
        여기 올린 글은 우리 병원에 연결된 보호자의 앱 홈에 보입니다. 사진은 글마다 최대 {q.POST_IMAGE_MAX}장.
      </p>

      {editing && (
        <div ref={formRef} className="bg-white rounded-xl border border-teal-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">
              {editing === 'new' ? '새 소식' : '소식 수정'}
            </span>
            <button onClick={closeForm} aria-label="닫기" className="text-gray-300 hover:text-gray-500">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>

          <div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value.slice(0, BODY_MAX))}
              rows={4}
              placeholder="휴진 안내, 이벤트, 새 장비 소식 등을 적어주세요"
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
                onChange={e => { handlePick(e.target.files); e.currentTarget.value = '' }} />
            </label>
            <span className="text-[11px] text-gray-400">{images.length} / {q.POST_IMAGE_MAX}</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">유튜브 링크 (선택)</label>
            <input value={youtube} onChange={e => setYoutube(e.target.value)}
              placeholder="https://youtu.be/..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>

          <button onClick={handleSave} disabled={saving || picking}
            className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-semibold py-2.5 rounded-xl transition-colors">
            {saving ? '올리는 중…' : editing === 'new' ? '올리기' : '수정 저장'}
          </button>
        </div>
      )}

      {posts.length === 0 ? (
        <p className="text-sm text-gray-400">아직 올린 소식이 없습니다.</p>
      ) : (
        posts.map(post => (
          <div key={post.id} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex justify-end gap-1 -mt-1 -mr-1 mb-1">
              <button onClick={() => openForm(post)} aria-label="수정"
                className="w-8 h-8 rounded-lg text-gray-300 hover:text-teal-600 hover:bg-gray-50">
                <FontAwesomeIcon icon={faPen} className="text-xs" />
              </button>
              <button onClick={() => setDeleting(post)} aria-label="삭제"
                className="w-8 h-8 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-gray-50">
                <FontAwesomeIcon icon={faTrash} className="text-xs" />
              </button>
            </div>
            <PostView post={post} />
          </div>
        ))
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
