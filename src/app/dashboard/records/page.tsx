'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useChild } from '@/context/ChildContext'
import { today, formatDate } from '@/lib/utils/date'
import { getDayStatus } from '@/lib/utils/compliance'
import type { ExamRecord } from '@/types'

type Tab = 'exam' | 'treatment' | 'lifestyle'

export default function RecordsPage() {
  const [tab, setTab] = useState<Tab>('exam')
  return (
    <div>
      <div className="flex bg-white rounded-xl mb-3 p-1 shadow-sm">
        {([['exam','검사기록'],['treatment','치료기록'],['lifestyle','생활습관']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'exam'      && <ExamTab />}
      {tab === 'treatment' && <TreatmentTab />}
      {tab === 'lifestyle' && <LifestyleTab />}
    </div>
  )
}

// ── 검사기록 ──────────────────────────────────────────────────

function ExamTab() {
  const { exams, saveExam, deleteExam } = useChild()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ date: today(), clinic: '', axOD: '', axOS: '', serOD: '', serOS: '', note: '' })
  const [saving, setSaving] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.date) { toast.error('검사일을 입력해주세요'); return }
    setSaving(true)
    try {
      await saveExam(form)
      toast.success('검사기록이 저장되었습니다')
      setModal(false)
      setForm({ date: today(), clinic: '', axOD: '', axOS: '', serOD: '', serOS: '', note: '' })
    } catch { toast.error('저장에 실패했습니다') }
    finally { setSaving(false) }
  }

  const handleDelete = async (exam: ExamRecord) => {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return
    try { await deleteExam(exam.id); toast.success('삭제됐습니다') }
    catch { toast.error('삭제에 실패했습니다') }
  }

  return (
    <>
      <button onClick={() => setModal(true)}
        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl mb-3 text-sm">
        + 기록 추가
      </button>

      {exams.length === 0 ? (
        <div className="text-center text-gray-400 py-12 text-sm">검사기록이 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {exams.map(e => (
            <div key={e.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-800">{e.date}</span>
                <div className="flex items-center gap-2">
                  {e.clinic && <span className="text-xs text-gray-400">{e.clinic}</span>}
                  <button onClick={() => handleDelete(e)} className="text-gray-300 hover:text-red-400 text-sm">✕</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {(e.axOD || e.axOS) && (
                  <div className="col-span-2 flex justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-gray-500">안축장 (OD/OS)</span>
                    <span className="font-medium">{e.axOD||'—'} / {e.axOS||'—'} mm</span>
                  </div>
                )}
                {(e.serOD || e.serOS) && (
                  <div className="col-span-2 flex justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-gray-500">SER (OD/OS)</span>
                    <span className="font-medium">{e.serOD||'—'} / {e.serOS||'—'} D</span>
                  </div>
                )}
                {e.note && <div className="col-span-2 text-xs text-gray-400">{e.note}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModal(false)} />
          <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">검사기록 추가</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <Field label="검사일"><input type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} className={INPUT}/></Field>
              <Field label="안과"><input placeholder="병원명" value={form.clinic} onChange={e => setForm(f=>({...f,clinic:e.target.value}))} className={INPUT}/></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="안축장 우안 (mm)"><input type="number" step="0.01" placeholder="24.82" value={form.axOD} onChange={e=>setForm(f=>({...f,axOD:e.target.value}))} className={INPUT}/></Field>
                <Field label="안축장 좌안 (mm)"><input type="number" step="0.01" placeholder="24.91" value={form.axOS} onChange={e=>setForm(f=>({...f,axOS:e.target.value}))} className={INPUT}/></Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="SER 우안 (D)"><input type="number" step="0.25" placeholder="-3.25" value={form.serOD} onChange={e=>setForm(f=>({...f,serOD:e.target.value}))} className={INPUT}/></Field>
                <Field label="SER 좌안 (D)"><input type="number" step="0.25" placeholder="-3.50" value={form.serOS} onChange={e=>setForm(f=>({...f,serOS:e.target.value}))} className={INPUT}/></Field>
              </div>
              <Field label="메모"><textarea rows={2} placeholder="특이사항 등" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} className={INPUT}/></Field>
              <button type="submit" disabled={saving} className="w-full bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl">
                {saving ? '저장 중...' : '저장'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ── 치료기록 캘린더 ────────────────────────────────────────────

function TreatmentTab() {
  const { logs, activeTreatments, saveTreatmentLog, activeChildId } = useChild()
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [dayModal, setDayModal] = useState<string | null>(null)

  const todayStr = today()
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const DAY_KO = ['일','월','화','수','목','금','토']

  const changeMonth = (delta: number) => {
    let m = calMonth + delta, y = calYear
    if (m > 11) { m = 0; y++ }
    if (m < 0)  { m = 11; y-- }
    setCalMonth(m); setCalYear(y)
  }

  const handleToggle = async (dateStr: string, key: 'atropine' | 'dreamlens', val: boolean) => {
    const log = logs[dateStr] || {}
    const atropine  = key === 'atropine'  ? val : !!log.atropine
    const dreamlens = key === 'dreamlens' ? val : !!log.dreamlens
    await saveTreatmentLog(dateStr, atropine, dreamlens)
    toast.success('기록이 업데이트되었습니다')
  }

  const dayLog = dayModal ? (logs[dayModal] || {}) : {}

  return (
    <>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600">‹</button>
          <span className="font-bold text-gray-800">{calYear}년 {calMonth + 1}월</span>
          <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600">›</button>
        </div>

        {/* 요일 */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_KO.map(d => <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>)}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1
            const ds = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
            const status = getDayStatus(logs, activeTreatments, ds)
            const isToday = ds === todayStr
            const clickable = status !== 'future'
            const bg = status === 'done' ? 'bg-green-100 text-green-700'
              : status === 'partial' ? 'bg-yellow-100 text-yellow-700'
              : status === 'missed'  ? 'bg-red-100 text-red-600'
              : 'bg-gray-50 text-gray-300'
            return (
              <button key={ds} disabled={!clickable}
                onClick={() => clickable && setDayModal(ds)}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-colors
                  ${bg} ${isToday ? 'ring-2 ring-blue-400' : ''} ${clickable ? 'hover:opacity-80 active:scale-95' : ''}`}>
                <span>{d}</span>
                <span className="text-xs leading-none">
                  {status === 'done' ? '✓' : status === 'partial' ? '△' : status === 'missed' ? '✕' : ''}
                </span>
              </button>
            )
          })}
        </div>

        {/* 범례 */}
        <div className="flex gap-3 mt-3 justify-center text-xs text-gray-500">
          {[['bg-green-100','완료'],['bg-yellow-100','부분'],['bg-red-100','미완료'],['bg-gray-50','예정']].map(([c,l])=>(
            <span key={l} className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded-sm ${c}`}/>{l}
            </span>
          ))}
        </div>
      </div>

      {/* 날짜 상세 모달 */}
      {dayModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDayModal(null)} />
          <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">{dayModal}</h2>
              <button onClick={() => setDayModal(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            {activeTreatments.length === 0 ? (
              <p className="text-sm text-gray-400">등록된 치료 항목이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {activeTreatments.map(t => {
                  const done = !!(logs[dayModal] || {})[t.key]
                  return (
                    <label key={t.key} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 cursor-pointer">
                      <span className="text-sm font-medium text-gray-700">{t.name}</span>
                      <div className="relative">
                        <input type="checkbox" checked={done} onChange={e => handleToggle(dayModal, t.key, e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors" />
                        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
            <button onClick={() => setDayModal(null)} className="w-full mt-4 bg-blue-600 text-white font-semibold py-3 rounded-xl text-sm">확인</button>
          </div>
        </div>
      )}
    </>
  )
}

// ── 생활습관 ──────────────────────────────────────────────────

function LifestyleTab() {
  const { lifestyle, saveLifestyle } = useChild()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ date: today(), outdoor: '', phone: '', sleep: '' })
  const [saving, setSaving] = useState(false)

  const recentDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i)
    const ds = formatDate(d)
    return { ds, data: lifestyle[ds] }
  })

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.date) { toast.error('날짜를 입력해주세요'); return }
    setSaving(true)
    try {
      await saveLifestyle(form.date, {
        outdoor: parseFloat(form.outdoor) || 0,
        phone:   parseFloat(form.phone)   || 0,
        sleep:   parseFloat(form.sleep)   || 0,
      })
      toast.success('생활습관이 저장되었습니다')
      setModal(false)
    } catch { toast.error('저장에 실패했습니다') }
    finally { setSaving(false) }
  }

  return (
    <>
      <button onClick={() => setModal(true)} className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl mb-3 text-sm">
        + 기록 추가
      </button>

      <div className="space-y-2">
        {recentDays.map(({ ds, data }) => (
          <div key={ds} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
            <div className="text-sm font-semibold text-gray-500 w-20 flex-shrink-0">{ds.slice(5)}</div>
            {data ? (
              <div className="flex gap-3 flex-1">
                <Stat icon="🌳" val={data.outdoor} good={data.outdoor >= 2} />
                <Stat icon="📱" val={data.phone}   good={data.phone   <= 2} />
                <Stat icon="😴" val={data.sleep}   good={data.sleep   >= 8} />
              </div>
            ) : (
              <span className="text-sm text-gray-300">기록 없음</span>
            )}
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModal(false)} />
          <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">생활습관 기록</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <Field label="날짜"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className={INPUT}/></Field>
              <Field label="야외활동 시간 (h)"><input type="number" min="0" max="24" step="0.5" placeholder="예: 2.0" value={form.outdoor} onChange={e=>setForm(f=>({...f,outdoor:e.target.value}))} className={INPUT}/></Field>
              <Field label="스마트폰 사용 시간 (h)"><input type="number" min="0" max="24" step="0.5" placeholder="예: 1.5" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} className={INPUT}/></Field>
              <Field label="수면 시간 (h)"><input type="number" min="0" max="24" step="0.5" placeholder="예: 9.0" value={form.sleep} onChange={e=>setForm(f=>({...f,sleep:e.target.value}))} className={INPUT}/></Field>
              <button type="submit" disabled={saving} className="w-full bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl">
                {saving ? '저장 중...' : '저장'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ── 공통 ──────────────────────────────────────────────────────

const INPUT = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Stat({ icon, val, good }: { icon: string; val: number; good: boolean }) {
  return (
    <div className="flex items-center gap-1 text-sm">
      <span>{icon}</span>
      <span className={`font-semibold ${good ? 'text-green-600' : 'text-red-500'}`}>{val}h</span>
    </div>
  )
}
