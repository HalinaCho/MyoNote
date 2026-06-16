'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useChild } from '@/context/ChildContext'
import { today, formatDate } from '@/lib/utils/date'
import { getDayStatus } from '@/lib/utils/compliance'
import type { ExamRecord } from '@/types'
import TimeSpinner from '@/components/lifestyle/TimeSpinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faXmark, faCheck, faMinus, faTree, faMobileScreen, faTrashCan, faCircleInfo, faCalendarDays, faPlus } from '@fortawesome/free-solid-svg-icons'

type Tab = 'exam' | 'treatment' | 'lifestyle'

export default function RecordsPage() {
  const [tab, setTab] = useState<Tab>('treatment')
  return (
    <div>
      <div className="flex bg-white rounded-xl mb-3 p-1 shadow-sm">
        {([['treatment','캘린더'],['lifestyle','생활습관'],['exam','안과 검사']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === t ? 'bg-teal-600 text-white' : 'text-gray-500'}`}>
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

function calcSeq(sph: string, cyl: string) {
  const s = parseFloat(sph)
  if (isNaN(s)) return '—'
  const c = parseFloat(cyl) || 0
  return (-(s + c / 2)).toFixed(2)
}

const withMinus = (v: string) => v ? `-${v}` : ''
const stripMinus = (v: string) => v.replace(/^-/, '')

const EMPTY_EXAM = { date: today(), clinic: '', axOD: '', axOS: '', sphOD: '', sphOS: '', cylOD: '', cylOS: '', note: '', nextAppointment: '' }

function ExamTab() {
  const { exams, saveExam, updateExam, deleteExam } = useChild()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<ExamRecord | null>(null)
  const [form, setForm] = useState(EMPTY_EXAM)
  const [saving, setSaving] = useState(false)
  const [showCRInfo, setShowCRInfo] = useState(false)

  const seqOD = calcSeq(form.sphOD, form.cylOD)
  const seqOS = calcSeq(form.sphOS, form.cylOS)

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_EXAM, clinic: exams[0]?.clinic ?? '' }); setModal(true) }
  const openEdit = (e: ExamRecord) => {
    setEditing(e)
    setForm({ date: e.date, clinic: e.clinic, axOD: e.axOD, axOS: e.axOS,
              sphOD: stripMinus(e.sphOD), sphOS: stripMinus(e.sphOS),
              cylOD: stripMinus(e.cylOD), cylOS: stripMinus(e.cylOS),
              note: e.note, nextAppointment: e.nextAppointment ?? '' })
    setModal(true)
  }
  const closeModal = () => { setModal(false); setEditing(null); setForm(EMPTY_EXAM) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.date) { toast.error('검사일을 입력해주세요'); return }
    setSaving(true)
    try {
      const signedForm = { ...form,
        sphOD: withMinus(form.sphOD), sphOS: withMinus(form.sphOS),
        cylOD: withMinus(form.cylOD), cylOS: withMinus(form.cylOS),
        serOD: '', serOS: '',
      }
      if (editing) {
        await updateExam(editing.id, signedForm)
        toast.success('수정되었습니다')
      } else {
        await saveExam(signedForm)
        toast.success('검사기록이 저장되었습니다')
      }
      closeModal()
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
                  <button onClick={() => openEdit(e)} className="text-gray-300 hover:text-teal-400 text-sm"><FontAwesomeIcon icon={faPen} /></button>
                  <button onClick={() => handleDelete(e)} className="text-gray-300 hover:text-rose-400 text-sm"><FontAwesomeIcon icon={faXmark} /></button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                {(e.axOD || e.axOS) && (
                  <div className="flex justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-gray-500">안축장 (OD/OS)</span>
                    <span className="font-medium">{e.axOD||'—'} / {e.axOS||'—'} mm</span>
                  </div>
                )}
                {(e.sphOD || e.sphOS) && (
                  <div className="flex justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-gray-500">Sph (OD/OS)</span>
                    <span className="font-medium">{e.sphOD||'—'} / {e.sphOS||'—'} D</span>
                  </div>
                )}
                {(e.cylOD || e.cylOS) && (
                  <div className="flex justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-gray-500">Cyl (OD/OS)</span>
                    <span className="font-medium">{e.cylOD||'—'} / {e.cylOS||'—'} D</span>
                  </div>
                )}
                {(e.serOD || e.serOS) && (
                  <div className="flex justify-between bg-teal-50 rounded-lg px-3 py-2">
                    <span className="text-teal-600 font-medium">SEQ (OD/OS)</span>
                    <span className="font-bold text-teal-700">{e.serOD||'—'} / {e.serOS||'—'} D</span>
                  </div>
                )}
                {e.note && <div className="text-xs text-gray-400 px-1">{e.note}</div>}
                {e.nextAppointment && (
                  <div className="flex items-center gap-1.5 text-xs text-teal-500 px-1 mt-0.5">
                    <FontAwesomeIcon icon={faCalendarDays} />
                    <span>다음 예약: {e.nextAppointment}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button onClick={() => openAdd()}
        className="fixed bottom-24 z-30 w-14 h-14 bg-teal-600 hover:bg-teal-500 text-white rounded-full shadow-lg flex items-center justify-center transition-colors active:scale-95"
        style={{ right: 'max(1rem, calc((100vw - 480px) / 2 + 1rem))' }}>
        <FontAwesomeIcon icon={faPlus} className="text-xl" />
      </button>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? '검사기록 수정' : '검사기록 추가'}</h2>
              <button onClick={closeModal} className="text-gray-400 text-xl"><FontAwesomeIcon icon={faXmark} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <Field label="검사일"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className={INPUT}/></Field>
              <Field label="안과"><input placeholder="병원명" value={form.clinic} onChange={e=>setForm(f=>({...f,clinic:e.target.value}))} className={INPUT}/></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="안축장 우안 (mm)"><input type="number" step="0.01" placeholder="24.82" value={form.axOD} onChange={e=>setForm(f=>({...f,axOD:e.target.value}))} className={INPUT}/></Field>
                <Field label="안축장 좌안 (mm)"><input type="number" step="0.01" placeholder="24.91" value={form.axOS} onChange={e=>setForm(f=>({...f,axOS:e.target.value}))} className={INPUT}/></Field>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">굴절 도수 (D)</span>
                  <button type="button" onClick={() => setShowCRInfo(v => !v)}
                    className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors
                      ${showCRInfo ? 'bg-teal-500 text-white' : 'bg-teal-50 text-teal-500 hover:bg-teal-100'}`}>
                    <FontAwesomeIcon icon={faCircleInfo} />
                    조절마비(CR)검사 결과 우선
                  </button>
                </div>
                {showCRInfo && (
                  <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 mb-3 text-xs space-y-1.5 text-teal-900">
                    <p className="font-semibold">조절마비검사(CR검사)란?</p>
                    <p>CR(Cycloplegic Refraction)은 조절마비 안약을 점안해 눈의 조절 기능을 일시적으로 풀어준 상태에서 굴절이상을 측정하는 검사입니다.</p>
                    <p>어린이는 조절력이 강해 일반 검사만으로는 실제 근시 도수가 낮게 측정될 수 있습니다. CR검사 결과가 실제 굴절 상태를 더 정확하게 반영하므로, 입력 시 CR검사 수치를 우선 입력해주세요.</p>
                  </div>
                )}
                {/* 헤더 행 */}
                <div className="grid gap-2 mb-1 text-xs text-center text-gray-400 font-medium px-1" style={{gridTemplateColumns:'4.5rem 1fr 1fr 1fr'}}>
                  <span></span><span>Sph</span><span>Cyl</span><span>SEQ (자동)</span>
                </div>
                {/* 우안 */}
                <div className="grid gap-2 items-center mb-2" style={{gridTemplateColumns:'4.5rem 1fr 1fr 1fr'}}>
                  <span className="text-xs text-center text-gray-500 font-medium">우안(OD)</span>
                  <NegInput value={form.sphOD} onChange={v=>setForm(f=>({...f,sphOD:v}))} placeholder="3.00"/>
                  <NegInput value={form.cylOD} onChange={v=>setForm(f=>({...f,cylOD:v}))} placeholder="0.50"/>
                  <div className="h-10 flex items-center justify-center bg-teal-50 rounded-lg text-sm font-bold text-teal-700">
                    {seqOD}
                  </div>
                </div>
                {/* 좌안 */}
                <div className="grid gap-2 items-center" style={{gridTemplateColumns:'4.5rem 1fr 1fr 1fr'}}>
                  <span className="text-xs text-center text-gray-500 font-medium">좌안(OS)</span>
                  <NegInput value={form.sphOS} onChange={v=>setForm(f=>({...f,sphOS:v}))} placeholder="3.00"/>
                  <NegInput value={form.cylOS} onChange={v=>setForm(f=>({...f,cylOS:v}))} placeholder="0.50"/>
                  <div className="h-10 flex items-center justify-center bg-teal-50 rounded-lg text-sm font-bold text-teal-700">
                    {seqOS}
                  </div>
                </div>
              </div>

              <Field label="메모"><textarea rows={2} placeholder="특이사항 등" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} className={INPUT}/></Field>
              <Field label="다음 예약일"><input type="date" value={form.nextAppointment} onChange={e=>setForm(f=>({...f,nextAppointment:e.target.value}))} className={INPUT}/></Field>
              <button type="submit" disabled={saving} className="w-full bg-teal-600 disabled:bg-teal-300 text-white font-semibold py-3 rounded-xl">
                {saving ? '저장 중...' : editing ? '수정하기' : '저장'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ── 케어기록 캘린더 ────────────────────────────────────────────

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
            const bg = status === 'done' ? 'bg-teal-100 text-teal-700'
              : status === 'partial' ? 'bg-amber-100 text-amber-700'
              : status === 'missed'  ? 'bg-rose-100 text-rose-600'
              : 'bg-gray-50 text-gray-300'
            return (
              <button key={ds} disabled={!clickable}
                onClick={() => clickable && setDayModal(ds)}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-colors
                  ${bg} ${isToday ? 'ring-2 ring-teal-400' : ''} ${clickable ? 'hover:opacity-80 active:scale-95' : ''}`}>
                <span>{d}</span>
                <span className="text-xs leading-none">
                  {status === 'done' ? <FontAwesomeIcon icon={faCheck} /> : status === 'partial' ? <FontAwesomeIcon icon={faMinus} /> : status === 'missed' ? <FontAwesomeIcon icon={faXmark} /> : null}
                </span>
              </button>
            )
          })}
        </div>

        {/* 범례 */}
        <div className="flex gap-3 mt-3 justify-center text-xs text-gray-500">
          {[['bg-teal-100','완료'],['bg-amber-100','부분'],['bg-rose-100','미완료'],['bg-gray-50','예정']].map(([c,l])=>(
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
              <button onClick={() => setDayModal(null)} className="text-gray-400 text-xl"><FontAwesomeIcon icon={faXmark} /></button>
            </div>
            {activeTreatments.length === 0 ? (
              <p className="text-sm text-gray-400">등록된 케어 항목이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {activeTreatments.map(t => {
                  const done = !!(logs[dayModal] || {})[t.key]
                  return (
                    <label key={t.key} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 cursor-pointer">
                      <span className="text-sm font-medium text-gray-700">{t.name}</span>
                      <div className="relative">
                        <input type="checkbox" checked={done} onChange={e => handleToggle(dayModal, t.key, e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-teal-600 transition-colors" />
                        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
            <button onClick={() => setDayModal(null)} className="w-full mt-4 bg-teal-600 text-white font-semibold py-3 rounded-xl text-sm">확인</button>
          </div>
        </div>
      )}
    </>
  )
}

// ── 생활습관 ──────────────────────────────────────────────────

function fmtTime(h: number) {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins > 0 ? `${hrs}시간 ${mins}분` : `${hrs}시간`
}

function LifestyleTab() {
  const { lifestyle, saveLifestyle, deleteLifestyle } = useChild()
  const [modal, setModal] = useState(false)
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [form, setForm] = useState({ date: today(), outdoorH: 0, outdoorM: 0, phoneH: 0, phoneM: 0 })
  const [saving, setSaving] = useState(false)

  const recentDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i)
    const ds = formatDate(d)
    return { ds, data: lifestyle[ds] }
  })

  const openAdd = (date?: string) => {
    setEditingDate(null)
    setForm({ date: date ?? today(), outdoorH: 0, outdoorM: 0, phoneH: 0, phoneM: 0 })
    setModal(true)
  }

  const openEdit = (ds: string, data: { outdoor: number; phone: number }) => {
    setEditingDate(ds)
    const outdoorH = Math.floor(data.outdoor)
    const outdoorM = Math.round((data.outdoor - outdoorH) * 60)
    const phoneH = Math.floor(data.phone)
    const phoneM = Math.round((data.phone - phoneH) * 60)
    setForm({ date: ds, outdoorH, outdoorM, phoneH, phoneM })
    setModal(true)
  }

  const closeModal = () => { setModal(false); setEditingDate(null) }

  const handleDelete = async (ds: string) => {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return
    try { await deleteLifestyle(ds); toast.success('삭제됐습니다') }
    catch { toast.error('삭제에 실패했습니다') }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.date) { toast.error('날짜를 입력해주세요'); return }
    setSaving(true)
    try {
      await saveLifestyle(form.date, {
        outdoor: form.outdoorH + form.outdoorM / 60,
        phone:   form.phoneH   + form.phoneM   / 60,
        sleep: 0,
      })
      toast.success(editingDate ? '수정되었습니다' : '생활습관이 저장되었습니다')
      closeModal()
    } catch { toast.error('저장에 실패했습니다') }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs text-gray-400 font-medium">최근 7일</span>
        <button onClick={() => setShowInfo(v => !v)}
          className={`text-sm transition-colors ${showInfo ? 'text-teal-500' : 'text-gray-300 hover:text-gray-400'}`}>
          <FontAwesomeIcon icon={faCircleInfo} />
        </button>
      </div>

      {showInfo && (
        <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 mb-3 text-xs space-y-2">
          <p className="font-semibold text-teal-700">색상 기준</p>
          <div className="flex items-center gap-2 text-gray-600">
            <FontAwesomeIcon icon={faTree} className="text-teal-600 w-3.5 flex-shrink-0" />
            <span className="font-medium">야외활동</span>
            <span className="ml-auto flex gap-2">
              <span><span className="font-semibold text-teal-600">초록</span> 2h↑</span>
              <span><span className="font-semibold text-amber-500">노랑</span> 0~2h</span>
              <span><span className="font-semibold text-rose-500">빨강</span> 0h</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <FontAwesomeIcon icon={faMobileScreen} className="text-amber-600 w-3.5 flex-shrink-0" />
            <span className="font-medium">스마트폰</span>
            <span className="ml-auto flex gap-2">
              <span><span className="font-semibold text-teal-600">초록</span> 2h↓</span>
              <span><span className="font-semibold text-amber-500">노랑</span> 2~4h</span>
              <span><span className="font-semibold text-rose-500">빨강</span> 4h↑</span>
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {recentDays.map(({ ds, data }) => (
          <div key={ds} className="bg-white rounded-xl shadow-sm flex items-center gap-2 px-3 py-2.5">
            <div className="text-sm font-semibold text-gray-500 w-11 flex-shrink-0">{ds.slice(5)}</div>
            {data ? (
              <>
                <div className="flex gap-1.5 flex-1 min-w-0">
                  <div className={`flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold
                    ${data.outdoor >= 2 ? 'bg-teal-50 text-teal-700' : data.outdoor > 0 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-500'}`}>
                    <FontAwesomeIcon icon={faTree} className="flex-shrink-0 text-xs" />
                    <span className="truncate">{fmtTime(data.outdoor)}</span>
                  </div>
                  <div className={`flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold
                    ${data.phone <= 2 ? 'bg-teal-50 text-teal-700' : data.phone <= 4 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-500'}`}>
                    <FontAwesomeIcon icon={faMobileScreen} className="flex-shrink-0 text-xs" />
                    <span className="truncate">{fmtTime(data.phone)}</span>
                  </div>
                </div>
                <div className="flex items-center flex-shrink-0">
                  <button onClick={() => openEdit(ds, data)} className="text-gray-300 hover:text-teal-400 p-1.5">
                    <FontAwesomeIcon icon={faPen} />
                  </button>
                  <button onClick={() => handleDelete(ds)} className="text-gray-300 hover:text-rose-400 p-1.5">
                    <FontAwesomeIcon icon={faTrashCan} />
                  </button>
                </div>
              </>
            ) : (
              <button onClick={() => openAdd(ds)} className="flex-1 text-left text-sm text-gray-300 hover:text-teal-400 active:text-teal-500">
                + 기록 추가
              </button>
            )}
          </div>
        ))}
      </div>

      {/* FAB */}
      <button onClick={() => openAdd()}
        className="fixed bottom-24 z-30 w-14 h-14 bg-teal-600 hover:bg-teal-500 text-white rounded-full shadow-lg flex items-center justify-center transition-colors active:scale-95"
        style={{ right: 'max(1rem, calc((100vw - 480px) / 2 + 1rem))' }}>
        <FontAwesomeIcon icon={faPlus} className="text-xl" />
      </button>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">{editingDate ? '생활습관 수정' : '생활습관 기록'}</h2>
              <button onClick={closeModal} className="text-gray-400 text-xl"><FontAwesomeIcon icon={faXmark} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <Field label="날짜">
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={INPUT} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-teal-50 rounded-2xl p-4 border-2 border-teal-100">
                  <div className="flex items-center gap-1.5 mb-4">
                    <FontAwesomeIcon icon={faTree} className="text-xl text-teal-600" />
                    <span className="text-xs font-semibold text-teal-700">야외활동</span>
                  </div>
                  <TimeSpinner
                    hours={form.outdoorH} minutes={form.outdoorM}
                    onHour={v => setForm(f => ({ ...f, outdoorH: v }))}
                    onMinute={v => setForm(f => ({ ...f, outdoorM: v }))}
                    btnCls="bg-teal-200 text-teal-700 hover:bg-teal-300"
                    textCls="text-teal-700"
                  />
                  <p className="text-xs text-teal-400 mt-3 text-center">권장 2시간↑</p>
                </div>
                <div className="bg-amber-50 rounded-2xl p-4 border-2 border-amber-100">
                  <div className="flex items-center gap-1.5 mb-4">
                    <FontAwesomeIcon icon={faMobileScreen} className="text-xl text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700">스마트폰</span>
                  </div>
                  <TimeSpinner
                    hours={form.phoneH} minutes={form.phoneM}
                    onHour={v => setForm(f => ({ ...f, phoneH: v }))}
                    onMinute={v => setForm(f => ({ ...f, phoneM: v }))}
                    btnCls="bg-amber-200 text-amber-700 hover:bg-amber-300"
                    textCls="text-amber-700"
                  />
                  <p className="text-xs text-amber-400 mt-3 text-center">권장 2시간↓</p>
                </div>
              </div>
              <button type="submit" disabled={saving} className="w-full bg-teal-600 disabled:bg-teal-300 text-white font-semibold py-3 rounded-xl">
                {saving ? '저장 중...' : editingDate ? '수정하기' : '저장'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ── 공통 ──────────────────────────────────────────────────────

const INPUT = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500'

function NegInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none select-none">−</span>
      <input
        type="number" step="0.25" min="0" placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg pl-6 pr-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
    </div>
  )
}

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
      <span className={`font-semibold ${good ? 'text-teal-600' : 'text-rose-500'}`}>{val}h</span>
    </div>
  )
}
