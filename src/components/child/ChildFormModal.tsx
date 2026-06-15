'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useChild } from '@/context/ChildContext'
import type { Child } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  editing?: Child | null
}

const EMPTY = { name: '', birth: '', gender: 'M' as 'M' | 'F', treatAtropine: false, treatDreamlens: false }

export default function ChildFormModal({ open, onClose, editing }: Props) {
  const { addChild, updateChild } = useChild()
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(editing
      ? { name: editing.name, birth: editing.birth, gender: editing.gender,
          treatAtropine: editing.treatAtropine, treatDreamlens: editing.treatDreamlens }
      : EMPTY
    )
  }, [editing, open])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('이름을 입력해주세요'); return }
    if (!form.birth)        { toast.error('생년월일을 입력해주세요'); return }
    setSaving(true)
    try {
      if (editing) {
        await updateChild({ id: editing.id, ...form })
        toast.success('수정되었습니다')
      } else {
        await addChild(form)
        toast.success(`${form.name} 등록 완료`)
      }
      onClose()
    } catch {
      toast.error('저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{editing ? '자녀 수정' : '자녀 추가'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="자녀 이름"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.birth}
              onChange={e => setForm(f => ({ ...f, birth: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
            <div className="flex gap-2">
              {(['M', 'F'] as const).map(g => (
                <button
                  key={g} type="button"
                  onClick={() => setForm(f => ({ ...f, gender: g }))}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors
                    ${form.gender === g
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  {g === 'M' ? '👦 남자' : '👧 여자'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">진행 중인 치료</label>
            <div className="space-y-2">
              {[
                { key: 'treatAtropine' as const,  label: '아트로핀 점안' },
                { key: 'treatDreamlens' as const, label: '드림렌즈 착용'  },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit" disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {saving ? '저장 중...' : (editing ? '수정하기' : '추가하기')}
          </button>
        </form>
      </div>
    </div>
  )
}
