'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useChild } from '@/context/ChildContext'
import { TREATMENT_PRESETS, makeTreatmentKey } from '@/lib/treatments'
import { calcAgeLabel, today } from '@/lib/utils/date'
import ConfirmModal from '@/components/ui/ConfirmModal'
import type { Child } from '@/types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faTree, faMobileScreen, faPlus, faTrashCan, faArrowsRotate, faCheck } from '@fortawesome/free-solid-svg-icons'
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
          className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 hover:bg-teal-200 flex items-center justify-center font-bold text-base leading-none transition-colors">−</button>
        <span className="text-sm font-semibold text-gray-800 w-14 text-center">{value}시간</span>
        <button type="button" onClick={() => onChange(Math.min(12, value + 0.5))}
          className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 hover:bg-teal-200 flex items-center justify-center font-bold text-base leading-none transition-colors">+</button>
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
  const [showCustom, setShowCustom] = useState(false)
  const [saving, setSaving] = useState(false)
  const [initialSnap, setInitialSnap] = useState('')
  const [confirmExit, setConfirmExit] = useState(false)

  useEffect(() => {
    const initForm = editing
      ? { name: editing.name, birth: editing.birth, gender: editing.gender,
          outdoorGoal: editing.outdoorGoal ?? 2, phoneGoal: editing.phoneGoal ?? 2 }
      : { ...EMPTY_BASE }
    const initTreatments = toActiveTreatments(editing)
    setForm(initForm)
    setTreatments(initTreatments)
    setCustomName('')
    setCustomSchedule('')
    setShowCustom(false)
    setInitialSnap(JSON.stringify({ form: initForm, treatments: initTreatments }))
    setConfirmExit(false)
  }, [editing, open])

  if (!open) return null

  // 변경 여부: 폼/케어 목록이 바뀌었거나, 추가 안 한 직접입력이 남아있으면 dirty
  const dirty =
    JSON.stringify({ form, treatments }) !== initialSnap ||
    customName.trim() !== '' || customSchedule.trim() !== ''

  const handleClose = () => {
    if (dirty) setConfirmExit(true)
    else onClose()
  }

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

  const availablePresets = TREATMENT_PRESETS.filter(p => !treatments.some(t => t.key === p.preset))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('이름을 입력해주세요'); return }
    if (!form.birth)        { toast.error('생년월일을 입력해주세요'); return }
    if (form.birth > today()) { toast.error('생년월일은 오늘 이후로 설정할 수 없습니다'); return }
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
    <>
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold">{editing ? '자녀 수정' : '자녀 추가'}</h2>
          <button type="button" onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none"><FontAwesomeIcon icon={faXmark} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-3">

          {/* ── 헤더: 성별 아바타 + 이름/생년월일 ── */}
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, gender: f.gender === 'M' ? 'F' : 'M' }))}
              className="relative w-16 h-16 rounded-full bg-teal-50 border-2 border-teal-500 flex items-center justify-center text-3xl flex-shrink-0 active:scale-95 transition-transform"
              aria-label="성별 전환"
            >
              {form.gender === 'F' ? '👧' : '👦'}
              <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-teal-500 text-white text-[9px] flex items-center justify-center border-2 border-white">
                <FontAwesomeIcon icon={faArrowsRotate} />
              </span>
            </button>
            <div className="flex-1 min-w-0">
              <input
                className="w-full bg-transparent text-lg font-bold text-gray-800 placeholder:text-gray-300 placeholder:font-medium focus:outline-none"
                placeholder="이름"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
              <div className="flex items-center gap-1.5 mt-0.5 text-sm leading-none">
                {form.birth && <span className="text-teal-500 font-medium">{calcAgeLabel(form.birth)}</span>}
                {form.birth && <span className="text-gray-300">·</span>}
                <span className="relative inline-flex items-center gap-1">
                  <span className={form.birth ? 'text-gray-500' : 'text-gray-300'}>{form.birth || '생년월일 입력'}</span>
                  <span className="text-gray-300 text-[10px]">▼</span>
                  <input
                    type="date"
                    max={today()}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    value={form.birth}
                    onChange={e => setForm(f => ({ ...f, birth: e.target.value }))}
                    onClick={e => { try { (e.currentTarget as any).showPicker?.() } catch {} }}
                  />
                </span>
              </div>
            </div>
          </div>

          {/* ── 진행 중인 근시케어 ── */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <span className="w-1 h-4 rounded-full bg-teal-500" />케어 항목
            </h3>
            <div className="rounded-2xl border border-gray-100 p-3">
              {/* 활성 케어 목록 — teal 체크 = 활성 표시 */}
              {treatments.length > 0 && (
                <div className="space-y-2 mb-2.5">
                  {treatments.map(t => (
                    <div key={t.key} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-teal-50">
                      <span className="w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center text-[10px] flex-shrink-0">
                        <FontAwesomeIcon icon={faCheck} />
                      </span>
                      <span className="flex-1 text-sm font-medium text-gray-700">{t.name}</span>
                      {t.schedule && <span className="text-xs text-teal-600/70">{t.schedule}</span>}
                      <button type="button" onClick={() => removeTreatment(t.key)}
                        className="text-gray-300 hover:text-rose-500 p-1"><FontAwesomeIcon icon={faTrashCan} /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* 추가 칩 한 줄 — 프리셋 + 직접입력 */}
              <div className="flex flex-wrap gap-2">
                {availablePresets.map(({ preset, name, schedule }) => (
                  <button key={preset} type="button" onClick={() => togglePreset(preset, name, schedule)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm text-gray-600 hover:border-teal-500 hover:text-teal-500 transition-colors">
                    <FontAwesomeIcon icon={faPlus} className="text-xs" /> {name}
                  </button>
                ))}
                <button type="button" onClick={() => setShowCustom(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors
                    ${showCustom ? 'bg-teal-500 text-white border-teal-500' : 'bg-white border-gray-200 text-gray-600 hover:border-teal-500 hover:text-teal-500'}`}>
                  <FontAwesomeIcon icon={faPlus} className="text-xs" /> 직접입력
                </button>
              </div>

              {/* 직접입력 펼침 영역 */}
              {showCustom && (
                <div className="mt-2.5 space-y-2">
                  <input
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="케어 이름 (예: 마이사이트)"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <input
                      className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="스케줄 (예: 주간 착용)"
                      value={customSchedule}
                      onChange={e => setCustomSchedule(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
                    />
                    <button type="button" onClick={addCustom}
                      className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg bg-teal-500 text-white text-sm font-medium whitespace-nowrap">
                      <FontAwesomeIcon icon={faPlus} /> 추가
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── 생활습관 권장 목표 ── */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <span className="w-1 h-4 rounded-full bg-teal-500" />
              <span>생활습관 목표 <span className="text-xs font-normal text-gray-400">(일 기준)</span></span>
            </h3>
            <div className="rounded-2xl border border-gray-100 px-3">
              <GoalStepper icon={faMobileScreen} iconCls="text-gray-400" label="스마트폰" dir="이하"
                value={form.phoneGoal}  onChange={v => setForm(f => ({ ...f, phoneGoal: v }))} />
              <GoalStepper icon={faTree} iconCls="text-gray-400" label="야외활동" dir="이상"
                value={form.outdoorGoal} onChange={v => setForm(f => ({ ...f, outdoorGoal: v }))} />
            </div>
          </section>
          </div>

          {/* 하단 고정 저장 버튼 */}
          <div className="px-5 py-3 border-t border-gray-100 bg-white rounded-b-2xl">
            <button
              type="submit" disabled={saving}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {saving ? '저장 중...' : (editing ? '수정하기' : '추가하기')}
            </button>
          </div>
        </form>
      </div>
    </div>

    <ConfirmModal
      open={confirmExit}
      title="변경사항을 저장하지 않고 나갈까요?"
      message="입력한 내용이 저장되지 않습니다."
      confirmLabel="나가기"
      cancelLabel="계속 편집"
      onConfirm={() => { setConfirmExit(false); onClose() }}
      onCancel={() => setConfirmExit(false)}
    />
    </>
  )
}
