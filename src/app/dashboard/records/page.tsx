'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useChild } from '@/context/ChildContext'
import TabSkeleton from '@/components/ui/TabSkeleton'
import EmptyState from '@/components/ui/EmptyState'
import { today } from '@/lib/utils/date'
import type { ExamRecord } from '@/types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faXmark, faCircleInfo, faCalendarDays, faPlus } from '@fortawesome/free-solid-svg-icons'

function calcSeq(sph: string, cyl: string) {
  const s = parseFloat(sph)
  if (isNaN(s)) return '—'
  const c = parseFloat(cyl) || 0
  return (-(s + c / 2)).toFixed(2)
}

const withMinus  = (v: string) => v ? `-${v}` : ''
const stripMinus = (v: string) => v.replace(/^-/, '')

const EMPTY_EXAM = { date: today(), clinic: '', axOD: '', axOS: '', sphOD: '', sphOS: '', cylOD: '', cylOS: '', note: '', nextAppointment: '' }
const INPUT = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500'

export default function RecordsPage() {
  const { exams, isLoading, saveExam, updateExam, deleteExam } = useChild()
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState<ExamRecord | null>(null)
  const [form, setForm]         = useState(EMPTY_EXAM)
  const [saving, setSaving]     = useState(false)
  const [showCRInfo, setShowCRInfo] = useState(false)

  const seqOD = calcSeq(form.sphOD, form.cylOD)
  const seqOS = calcSeq(form.sphOS, form.cylOS)

  const openAdd = () => {
    setEditing(null)
    setForm({ ...EMPTY_EXAM, clinic: exams[0]?.clinic ?? '' })
    setModal(true)
  }
  const openEdit = (e: ExamRecord) => {
    setEditing(e)
    setForm({
      date: e.date, clinic: e.clinic, axOD: e.axOD, axOS: e.axOS,
      sphOD: stripMinus(e.sphOD), sphOS: stripMinus(e.sphOS),
      cylOD: stripMinus(e.cylOD), cylOS: stripMinus(e.cylOS),
      note: e.note, nextAppointment: e.nextAppointment ?? '',
    })
    setModal(true)
  }
  const closeModal = () => { setModal(false); setEditing(null); setForm(EMPTY_EXAM) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.date) { toast.error('검사일을 입력해주세요'); return }
    setSaving(true)
    try {
      const signedForm = {
        ...form,
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

  if (isLoading) return <TabSkeleton />

  return (
    <>
      {exams.length === 0 ? (
        <EmptyState message="검사기록이 없습니다." action={{ label: '첫 기록 추가', onClick: openAdd }} />
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
      <button
        onClick={openAdd}
        className="fixed bottom-24 z-30 w-14 h-14 bg-teal-600 hover:bg-teal-500 text-white rounded-full shadow-lg flex items-center justify-center transition-colors active:scale-95"
        style={{ right: 'max(1rem, calc((100vw - 480px) / 2 + 1rem))' }}
      >
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
              <Field label="검사일">
                <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className={INPUT}/>
              </Field>
              <Field label="안과">
                <input placeholder="병원명" value={form.clinic} onChange={e=>setForm(f=>({...f,clinic:e.target.value}))} className={INPUT}/>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="안축장 우안 (mm)">
                  <input type="number" step="0.01" placeholder="24.82" value={form.axOD} onChange={e=>setForm(f=>({...f,axOD:e.target.value}))} className={INPUT}/>
                </Field>
                <Field label="안축장 좌안 (mm)">
                  <input type="number" step="0.01" placeholder="24.91" value={form.axOS} onChange={e=>setForm(f=>({...f,axOS:e.target.value}))} className={INPUT}/>
                </Field>
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
                <div className="grid gap-2 mb-1 text-xs text-center text-gray-400 font-medium px-1" style={{gridTemplateColumns:'4.5rem 1fr 1fr 1fr'}}>
                  <span/><span>Sph</span><span>Cyl</span><span>SEQ (자동)</span>
                </div>
                <div className="grid gap-2 items-center mb-2" style={{gridTemplateColumns:'4.5rem 1fr 1fr 1fr'}}>
                  <span className="text-xs text-center text-gray-500 font-medium">우안(OD)</span>
                  <NegInput value={form.sphOD} onChange={v=>setForm(f=>({...f,sphOD:v}))} placeholder="3.00"/>
                  <NegInput value={form.cylOD} onChange={v=>setForm(f=>({...f,cylOD:v}))} placeholder="0.50"/>
                  <div className="h-10 flex items-center justify-center bg-teal-50 rounded-lg text-sm font-bold text-teal-700">{seqOD}</div>
                </div>
                <div className="grid gap-2 items-center" style={{gridTemplateColumns:'4.5rem 1fr 1fr 1fr'}}>
                  <span className="text-xs text-center text-gray-500 font-medium">좌안(OS)</span>
                  <NegInput value={form.sphOS} onChange={v=>setForm(f=>({...f,sphOS:v}))} placeholder="3.00"/>
                  <NegInput value={form.cylOS} onChange={v=>setForm(f=>({...f,cylOS:v}))} placeholder="0.50"/>
                  <div className="h-10 flex items-center justify-center bg-teal-50 rounded-lg text-sm font-bold text-teal-700">{seqOS}</div>
                </div>
              </div>

              <Field label="메모">
                <textarea rows={2} placeholder="특이사항 등" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} className={INPUT}/>
              </Field>
              <Field label="다음 예약일">
                <input type="date" value={form.nextAppointment} onChange={e=>setForm(f=>({...f,nextAppointment:e.target.value}))} className={INPUT}/>
              </Field>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

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
