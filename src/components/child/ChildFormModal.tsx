'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useChild } from '@/context/ChildContext'
import { TREATMENT_PRESETS, makeTreatmentKey } from '@/lib/treatments'
import type { Child } from '@/types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faTree, faMobileScreen, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

interface Props {
  open: boolean
  onClose: () => void
  editing?: Child | null
}

// 폼이 다루는 "현재 활성 케어" 항목
interface ActiveTreatment {
  key: string
  name: string
  preset: 'atropine' | 'dreamlens' | null
  schedule: string
}

const EMPTY_BASE = { name: '', birth: '', gender: 'M' as 'M' | 'F', outdoorGoal: 2, phoneGoal: 2 }

// 자녀 정의 → 현재 활성(열린 기간) 케어 목록
function toActiveTreatments(child?: Child | null): ActiveTreatment[] {
  return (child?.treatments ?? [])
    .filter(t => (t.periods ?? []).some(p => p.e == null))
    .map(t => ({ key: t.key, name: t.name, preset: t.preset, schedule: t.schedule }))
}

function GoalStepper({ icon, iconCls, label, dir, value, onChange }: {
  icon: IconDefinition; iconCls: string; label: string; dir: '이상' | '이하'; value: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="flex items-center gap-1.5 text-sm text-gray-700">
        <FontAwesomeIcon icon={icon} className={iconCls} />
        {label} <span className="text-xs text-gray-400">({dir})</span>
      </span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(0, value - 0.5))}
          className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-base leading-none">−</button>
        <span className="text-sm font-semibold text-gray-800 w-14 text-center">{value}시간</span>
        <button type="button" onClick={() => onChange(Math.min(12, value + 0.5))}
          className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-base leading-none">+</button>
      </div>
    </div>
  )
}

export default function ChildFormModal({ open, onClose, editing }: Props) {
  const { addChild, updateChild } = useChild()
  const [form, setForm] = useState({ ...EMPTY_BASE })
  const [treatments, setTreatments] = useState<ActiveTreatment[]>([])
  const [customName, setCustomName] = useState('')
  const [customSchedule, setCustomSchedule] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(editing
      ? { name: editing.name, birth: editing.birth, gender: editing.gender,
          outdoorGoal: editing.outdoorGoal ?? 2, phoneGoal: editing.phoneGoal ?? 2 }
      : { ...EMPTY_BASE }
    )
    setTreatments(toActiveTreatments(editing))
    setCustomName('')
    setCustomSchedule('')
  }, [editing, open])

  if (!open) return null

  const togglePreset = (preset: 'atropine' | 'dreamlens', name: string, schedule: string) => {
    setTreatments(prev => prev.some(t => t.key === preset)
      ? prev.filter(t => t.key !== preset)
      : [...prev, { key: preset, name, preset, schedule }]
    )
  }

  const addCustom = () => {
    const name = customName.trim()
    if (!name) { toast.error('케어 이름을 입력해주세요'); return }
    setTreatments(prev => [...prev, { key: makeTreatmentKey(), name, preset: null, schedule: customSchedule.trim() }])
    setCustomName('')
    setCustomSchedule('')
  }

  const removeTreatment = (key: string) =>
    setTreatments(prev => prev.filter(t => t.key !== key))

  const customItems = treatments.filter(t => t.preset === null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('이름을 입력해주세요'); return }
    if (!form.birth)        { toast.error('생년월일을 입력해주세요'); return }
    setSaving(true)
    try {
      const payload = { ...form, treatments }
      if (editing) {
        await updateChild({ id: editing.id, ...payload })
        toast.success('수정되었습니다')
      } else {
        await addChild(payload)
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
      <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{editing ? '자녀 수정' : '자녀 추가'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none"><FontAwesomeIcon icon={faXmark} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#10bcad]"
              placeholder="자녀 이름"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#10bcad] accent-[#10bcad]"
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
                      ? 'bg-[#10bcad] text-white border-[#10bcad]'
                      : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  {g === 'M' ? '👦 남자' : '👧 여자'}
                </button>
              ))}
            </div>
          </div>

          {/* 진행 중인 난시케어 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">진행 중인 난시케어</label>

            {/* 프리셋 */}
            <div className="space-y-2">
              {TREATMENT_PRESETS.map(({ preset, name, schedule }) => {
                const checked = treatments.some(t => t.key === preset)
                return (
                  <label key={preset} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePreset(preset, name, schedule)}
                      className="w-4 h-4 rounded accent-[#10bcad]"
                    />
                    <span className="flex-1 text-sm text-gray-700">{name}</span>
                    <span className="text-xs text-gray-400">{schedule}</span>
                  </label>
                )
              })}
            </div>

            {/* 직접입력 케어 목록 */}
            {customItems.length > 0 && (
              <div className="space-y-2 mt-2">
                {customItems.map(t => (
                  <div key={t.key} className="flex items-center gap-3 p-3 rounded-lg border border-[#10bcad]/30 bg-teal-50/40">
                    <span className="flex-1 text-sm text-gray-700">{t.name}</span>
                    {t.schedule && <span className="text-xs text-gray-400">{t.schedule}</span>}
                    <button type="button" onClick={() => removeTreatment(t.key)}
                      className="text-gray-400 hover:text-rose-500 p-0.5"><FontAwesomeIcon icon={faTrashCan} /></button>
                  </div>
                ))}
              </div>
            )}

            {/* 직접입력 추가 */}
            <div className="mt-2 p-3 rounded-lg border border-dashed border-gray-300 space-y-2">
              <p className="text-xs font-medium text-gray-500">직접입력 추가</p>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10bcad]"
                placeholder="케어 이름 (예: 마이사이트)"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
              />
              <div className="flex gap-2">
                <input
                  className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10bcad]"
                  placeholder="스케줄 (예: 주간 착용)"
                  value={customSchedule}
                  onChange={e => setCustomSchedule(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
                />
                <button type="button" onClick={addCustom}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg bg-[#10bcad] text-white text-sm font-medium whitespace-nowrap">
                  <FontAwesomeIcon icon={faPlus} /> 추가
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">생활습관 권장 목표 (일 기준)</label>
            <div className="border border-gray-200 rounded-lg px-3 divide-y divide-gray-100">
              <GoalStepper icon={faMobileScreen} iconCls="text-gray-500" label="스마트폰" dir="이하"
                value={form.phoneGoal}  onChange={v => setForm(f => ({ ...f, phoneGoal: v }))} />
              <GoalStepper icon={faTree} iconCls="text-gray-500" label="야외활동" dir="이상"
                value={form.outdoorGoal} onChange={v => setForm(f => ({ ...f, outdoorGoal: v }))} />
            </div>
          </div>

          <button
            type="submit" disabled={saving}
            className="w-full bg-[#10bcad] hover:bg-teal-600 disabled:bg-teal-300 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {saving ? '저장 중...' : (editing ? '수정하기' : '추가하기')}
          </button>
        </form>
      </div>
    </div>
  )
}
