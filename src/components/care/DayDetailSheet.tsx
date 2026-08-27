'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useChild } from '@/context/ChildContext'
import TimeSpinner from '@/components/lifestyle/TimeSpinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faTree, faMobileScreen } from '@fortawesome/free-solid-svg-icons'

// 하루치 기록(케어 토글 + 생활습관 시간)을 고치는 바텀시트.
// 오늘 화면과 월간 캘린더 양쪽에서 쓴다.
//
// 호출부는 반드시 key={date}로 렌더할 것 — 날짜가 바뀌면 새로 마운트되어
// 아래 useState 초기값이 그 날짜 기록으로 다시 잡힌다(effect로 동기화할 필요가 없다).

const splitHM = (v: number | undefined) => {
  const h = Math.floor(v ?? 0)
  return { h, m: Math.round(((v ?? 0) - h) * 60) }
}

export default function DayDetailSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const { logs, lifestyle, treatmentsForDate, saveTreatmentLog, saveLifestyle, deleteLifestyle } = useChild()
  const [form, setForm] = useState(() => {
    const life = lifestyle[date]
    const outdoor = splitHM(life?.outdoor)
    const phone = splitHM(life?.phone)
    return { outdoorH: outdoor.h, outdoorM: outdoor.m, phoneH: phone.h, phoneM: phone.m }
  })
  const [saving, setSaving] = useState(false)

  const careOfDay = treatmentsForDate(date)

  const handleCareToggle = async (key: string, val: boolean) => {
    try {
      await saveTreatmentLog(date, { ...(logs[date] || {}), [key]: val })
    } catch { toast.error('저장에 실패했습니다') }
  }

  const handleSave = async () => {
    const outdoor = form.outdoorH + form.outdoorM / 60
    const phone   = form.phoneH   + form.phoneM   / 60
    setSaving(true)
    try {
      if (outdoor === 0 && phone === 0) {
        // 입력값이 없으면 생활습관 기록을 만들지 않음(케어만 토글 시 유령 도트 방지).
        // 기존 기록을 0으로 비운 경우엔 지운 것으로 보고 삭제.
        if (lifestyle[date]) await deleteLifestyle(date)
      } else {
        await saveLifestyle(date, { outdoor, phone, sleep: 0 })
      }
      toast.success('저장되었습니다')
      onClose()
    } catch { toast.error('저장에 실패했습니다') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-8 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-800">{date}</h2>
          <button onClick={onClose} aria-label="닫기" className="text-gray-400 text-xl">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* 케어 — 그 날짜에 활성이던 케어만 표시 */}
        {careOfDay.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">케어</p>
            <div className="space-y-2">
              {careOfDay.map(t => {
                const done = !!(logs[date] || {})[t.key]
                return (
                  <label key={t.key} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50">
                    <span className="text-sm font-medium text-gray-700">{t.name}</span>
                    <div className="relative">
                      <input type="checkbox" checked={done}
                        onChange={e => handleCareToggle(t.key, e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-teal-500 transition-colors" />
                      <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* 생활습관 */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">생활습관</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-amber-50 rounded-2xl p-3 border-2 border-amber-100">
              <div className="flex items-center gap-1.5 mb-3">
                <FontAwesomeIcon icon={faMobileScreen} className="text-amber-500" />
                <span className="text-xs font-semibold text-amber-700">스마트폰</span>
              </div>
              <TimeSpinner
                hours={form.phoneH} minutes={form.phoneM}
                onHour={v => setForm(f => ({ ...f, phoneH: v }))}
                onMinute={v => setForm(f => ({ ...f, phoneM: v }))}
                btnCls="bg-amber-100 text-amber-700 hover:bg-amber-200"
                textCls="text-amber-700"
              />
              <p className="text-xs text-amber-400 mt-2 text-center">권장 2시간↓</p>
            </div>
            <div className="bg-teal-50 rounded-2xl p-3 border-2 border-teal-100">
              <div className="flex items-center gap-1.5 mb-3">
                <FontAwesomeIcon icon={faTree} className="text-teal-500" />
                <span className="text-xs font-semibold text-teal-700">야외활동</span>
              </div>
              <TimeSpinner
                hours={form.outdoorH} minutes={form.outdoorM}
                onHour={v => setForm(f => ({ ...f, outdoorH: v }))}
                onMinute={v => setForm(f => ({ ...f, outdoorM: v }))}
                btnCls="bg-teal-100 text-teal-700 hover:bg-teal-200"
                textCls="text-teal-700"
              />
              <p className="text-xs text-teal-400 mt-2 text-center">권장 2시간↑</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave} disabled={saving}
          className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}
