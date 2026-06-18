'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getAlertDay, setAlertDay } from '@/lib/notificationPrefs'
import { useChild } from '@/context/ChildContext'
import ChildFormModal from '@/components/child/ChildFormModal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { signOut } from '@/lib/supabase/auth'
import { calcAgeLabel } from '@/lib/utils/date'
import type { Child } from '@/types'
import { createClient } from '@/lib/supabase/client'
import * as q from '@/lib/supabase/queries'
import type { Guardian } from '@/lib/supabase/queries'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faTrashCan, faPlus, faUserGroup, faKey, faRightFromBracket, faXmark, faChevronRight, faBell } from '@fortawesome/free-solid-svg-icons'

export default function SettingsPage() {
  const { children, activeChildId, activeChild, deleteChild, refreshChildren } = useChild()
  const [childModal, setChildModal] = useState<{ open: boolean; editing: Child | null }>({ open: false, editing: null })
  const [inviteModal, setInviteModal] = useState(false)
  const [joinModal, setJoinModal] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [generating, setGenerating] = useState(false)
  const [alertDay, setAlertDayState] = useState<number | null>(null)
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [loadingGuardians, setLoadingGuardians] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    confirmLabel?: string
    onConfirm: () => Promise<void> | void
  } | null>(null)

  useEffect(() => { setAlertDayState(getAlertDay()) }, [])

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    if (!activeChildId) return
    setLoadingGuardians(true)
    q.fetchGuardians(activeChildId)
      .then(setGuardians)
      .catch(() => setGuardians([]))
      .finally(() => setLoadingGuardians(false))
  }, [activeChildId])

  const selectAlertDay = (day: number) => {
    const next = alertDay === day ? null : day
    setAlertDayState(next)
    setAlertDay(next)
  }

  const handleDeleteChild = (child: Child) => {
    setConfirmDialog({
      title: `${child.name} 삭제`,
      message: '모든 검사기록과 생활습관 기록이 함께 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.',
      confirmLabel: '삭제',
      onConfirm: async () => {
        try {
          await deleteChild(child.id)
          toast.success(`${child.name} 삭제 완료`)
        } catch {
          toast.error('삭제에 실패했습니다')
        }
      },
    })
  }

  const handleGenerateInvite = async () => {
    setGenerating(true)
    try {
      const code = await q.createInviteCode('editor')
      setInviteCode(code)
    } catch {
      toast.error('코드 생성에 실패했습니다')
    } finally {
      setGenerating(false)
    }
  }

  const handleJoin = async () => {
    if (joinCode.length < 6) { toast.error('코드를 입력해주세요'); return }
    try {
      const n = await q.acceptInviteCode(joinCode)
      toast.success(`자녀 ${n}명의 보호자로 등록되었습니다`)
      setJoinModal(false)
      setJoinCode('')
      await refreshChildren()
    } catch (e: any) {
      toast.error(e.message || '코드 참여에 실패했습니다')
    }
  }

  const handleRemoveGuardian = (userId: string) => {
    if (!activeChildId) return
    const isSelf = userId === currentUserId
    setConfirmDialog({
      title: isSelf ? '보호자 나가기' : '보호자 제거',
      message: isSelf
        ? '이 자녀의 보호자 자격을 포기합니다.\n다시 참여하려면 초대 코드가 필요합니다.'
        : '이 보호자의 접근 권한을 제거합니다.',
      confirmLabel: isSelf ? '나가기' : '제거',
      onConfirm: async () => {
        try {
          await q.removeGuardian(activeChildId, userId)
          setGuardians(prev => prev.filter(g => g.userId !== userId))
          toast.success(isSelf ? '보호자에서 나갔습니다' : '보호자를 제거했습니다')
          if (isSelf) await refreshChildren()
        } catch {
          toast.error('처리에 실패했습니다')
        }
      },
    })
  }

  return (
    <>
      {/* 현재 자녀 프로필 */}
      {activeChild && (
        <section className="bg-white rounded-2xl p-3 mb-2 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white border-2 border-[#10bcad] flex items-center justify-center text-2xl">
            {activeChild.gender === 'F' ? '👧' : '👦'}
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-800">{activeChild.name}</div>
            <div className="text-sm text-gray-400">{calcAgeLabel(activeChild.birth)} · {activeChild.birth}</div>
          </div>
          <button
            onClick={() => setChildModal({ open: true, editing: activeChild })}
            className="text-sm text-teal-600 font-medium px-3 py-1.5 rounded-lg bg-teal-50"
          >
            편집
          </button>
        </section>
      )}

      {/* 자녀 관리 */}
      <section className="bg-white rounded-2xl overflow-hidden mb-2 shadow-sm">
        <div className="px-4 pt-3 pb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">자녀 관리</div>

        {children.map(c => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 border-t border-gray-50">
            <div className={`w-10 h-10 rounded-full bg-white border-2 flex items-center justify-center text-lg flex-shrink-0
              ${c.id === activeChildId ? 'border-[#10bcad]' : 'border-gray-200'}`}>
              {c.gender === 'F' ? '👧' : '👦'}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-800">{c.name}
                {c.id === activeChildId && <span className="ml-2 text-xs bg-white border border-[#10bcad] text-[#10bcad] px-1.5 py-0.5 rounded-full">현재</span>}
              </div>
              <div className="text-xs text-gray-400">{calcAgeLabel(c.birth)}</div>
            </div>
            <button onClick={() => setChildModal({ open: true, editing: c })} className="text-gray-400 hover:text-gray-600 p-1"><FontAwesomeIcon icon={faPen} /></button>
            {children.length > 1 && (
              <button onClick={() => handleDeleteChild(c)} className="text-gray-400 hover:text-rose-500 p-1"><FontAwesomeIcon icon={faTrashCan} /></button>
            )}
          </div>
        ))}

        <button
          onClick={() => setChildModal({ open: true, editing: null })}
          className="w-full flex items-center gap-3 px-4 py-2.5 border-t border-gray-50 text-teal-600 text-sm font-medium"
        >
          <FontAwesomeIcon icon={faPlus} /> 자녀 추가
        </button>
      </section>

      {/* 보호자 */}
      <section className="bg-white rounded-2xl overflow-hidden mb-2 shadow-sm">
        <div className="px-4 pt-3 pb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">보호자</div>

        {loadingGuardians ? (
          <div className="px-4 py-2.5 border-t border-gray-50 space-y-2">
            {[0, 1].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : guardians.map(g => {
          const isMe = g.userId === currentUserId
          const amOwner = guardians.find(x => x.userId === currentUserId)?.role === 'owner'
          const roleLabel = { owner: '소유자', editor: '편집자', viewer: '열람자' }[g.role]
          const roleStyle = {
            owner: 'text-teal-700 bg-teal-50',
            editor: 'text-amber-600 bg-amber-50',
            viewer: 'text-gray-500 bg-gray-100',
          }[g.role]
          const canRemove = (amOwner && g.role !== 'owner') || (isMe && g.role !== 'owner')
          const initial = (g.displayName || '?')[0].toUpperCase()

          return (
            <div key={g.userId} className="flex items-center gap-3 px-4 py-2.5 border-t border-gray-50">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-500 flex-shrink-0">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">
                  {g.displayName}
                  {isMe && <span className="ml-1 text-gray-400 font-normal text-xs">(나)</span>}
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${roleStyle}`}>
                  {roleLabel}
                </span>
              </div>
              {canRemove && (
                <button
                  onClick={() => handleRemoveGuardian(g.userId)}
                  className="text-xs text-rose-400 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 flex-shrink-0"
                >
                  {isMe ? '나가기' : '제거'}
                </button>
              )}
            </div>
          )
        })}

        <button onClick={() => setInviteModal(true)} className="w-full flex items-center gap-3 px-4 py-2.5 border-t border-gray-50 text-sm text-gray-700 hover:bg-gray-50">
          <FontAwesomeIcon icon={faUserGroup} className="w-4" /> <span className="flex-1 text-left">보호자 초대</span> <FontAwesomeIcon icon={faChevronRight} className="text-gray-300 text-xs" />
        </button>
        <button onClick={() => setJoinModal(true)} className="w-full flex items-center gap-3 px-4 py-2.5 border-t border-gray-50 text-sm text-gray-700 hover:bg-gray-50">
          <FontAwesomeIcon icon={faKey} className="w-4" /> <span className="flex-1 text-left">코드로 참여하기</span> <FontAwesomeIcon icon={faChevronRight} className="text-gray-300 text-xs" />
        </button>
      </section>

      {/* 알림 설정 */}
      <section className="bg-white rounded-2xl overflow-hidden mb-2 shadow-sm">
        <div className="px-4 pt-3 pb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">알림 설정</div>
        <div className="px-4 py-2.5 border-t border-gray-50">
          <div className="flex items-center gap-3 text-sm font-medium text-gray-700 mb-1">
            <FontAwesomeIcon icon={faBell} className="w-4" />
            병원 예약 알림
          </div>
          <div className="text-xs text-gray-400 mb-3">예약일 며칠 전부터 홈 화면에 배너를 표시합니다.</div>
          <div className="flex gap-2">
            {[1, 3, 7].map(day => (
              <button
                key={day}
                onClick={() => selectAlertDay(day)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all border ${
                  alertDay === day
                    ? 'bg-[#edf7f6] text-[#10bcad] border-[#10bcad]/30'
                    : 'bg-gray-50 text-gray-400 border-transparent'
                }`}
              >
                {day}일 전
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 계정 */}
      <section className="bg-white rounded-2xl overflow-hidden mb-2 shadow-sm">
        <div className="px-4 pt-3 pb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">계정</div>
        <button
          onClick={async () => {
            try { await signOut() } catch {}
            window.location.replace(`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/login`)
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 border-t border-gray-50 text-sm text-rose-500 hover:bg-rose-50"
        >
          <FontAwesomeIcon icon={faRightFromBracket} className="w-4" /> 로그아웃
        </button>
      </section>

      <p className="text-center text-xs text-gray-300 mt-2 mb-4">마이오노트 v1.0.0</p>

      {/* 자녀 추가/수정 모달 */}
      <ChildFormModal
        open={childModal.open}
        onClose={() => setChildModal({ open: false, editing: null })}
        editing={childModal.editing}
      />

      {/* 삭제/제거 확인 모달 */}
      <ConfirmModal
        open={!!confirmDialog}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        onConfirm={async () => { await confirmDialog?.onConfirm(); setConfirmDialog(null) }}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* 보호자 초대 모달 */}
      {inviteModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setInviteModal(false); setInviteCode('') }} />
          <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">보호자 초대</h2>
              <button onClick={() => { setInviteModal(false); setInviteCode('') }} className="text-gray-400 text-xl"><FontAwesomeIcon icon={faXmark} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">코드를 생성해 상대방에게 공유하세요. 내 계정의 모든 자녀가 공유됩니다.</p>
            {inviteCode ? (
              <div className="bg-teal-50 rounded-xl p-4 flex items-center justify-between mb-4">
                <span className="text-2xl font-bold tracking-widest text-teal-700">{inviteCode}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(inviteCode); toast.success('복사됐습니다') }}
                  className="text-sm text-teal-600 font-medium ml-3"
                >복사</button>
              </div>
            ) : (
              <button
                onClick={handleGenerateInvite} disabled={generating}
                className="w-full bg-teal-600 disabled:bg-teal-300 text-white font-semibold py-3 rounded-xl mb-4"
              >
                {generating ? '생성 중...' : '코드 생성'}
              </button>
            )}
            <p className="text-xs text-gray-400 text-center">코드 유효기간: 7일</p>
          </div>
        </div>
      )}

      {/* 코드 참여 모달 */}
      {joinModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setJoinModal(false)} />
          <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">코드로 참여하기</h2>
              <button onClick={() => setJoinModal(false)} className="text-gray-400 text-xl"><FontAwesomeIcon icon={faXmark} /></button>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1">초대 코드</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-center text-lg tracking-widest font-bold uppercase focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4"
              placeholder="AB12CD"
              maxLength={6}
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
            />
            <button onClick={handleJoin} className="w-full bg-teal-600 text-white font-semibold py-3 rounded-xl">
              참여하기
            </button>
          </div>
        </div>
      )}
    </>
  )
}
