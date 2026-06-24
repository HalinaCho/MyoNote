'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useChild } from '@/context/ChildContext'
import TabSkeleton from '@/components/ui/TabSkeleton'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { today } from '@/lib/utils/date'
import { buildExamExplainContext } from '@/lib/aiReport'
import { downscaleImage, extractExam, axialToPatch, refractionToPatch } from '@/lib/examExtract'
import type { AxialFields, RefractionFields } from '@/lib/examExtract'
import type { ExamRecord } from '@/types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faXmark, faCircleInfo, faCalendarDays, faPlus, faWandMagicSparkles, faCamera, faArrowsRotate, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons'

// Sph는 부호 있는 값(+/−), Cyl은 minus-cyl 크기(양수, 실제값은 음수).
// SEQ = Sph + (−Cyl)/2 = Sph − Cyl크기/2
function calcSeq(sphSigned: string, cylMag: string) {
  const s = parseFloat(sphSigned)
  if (isNaN(s)) return '—'
  const c = parseFloat(cylMag) || 0
  return (s - c / 2).toFixed(2)
}

const withMinus  = (v: string) => v ? `-${v}` : ''
const stripMinus = (v: string) => v.replace(/^-/, '')
const fmtD = (v: string) => { const n = parseFloat(v); return isNaN(n) ? '—' : n.toFixed(2) }
// 양수면 + 기호 표시 (Sph·SEQ 등 부호가 의미 있는 값용). 음수는 toFixed가 −를 포함.
const fmtSigned = (v: string) => { const n = parseFloat(v); return isNaN(n) ? '—' : (n > 0 ? '+' : '') + n.toFixed(2) }

const EMPTY_EXAM = { date: today(), clinic: '', axOD: '', axOS: '', sphOD: '', sphOS: '', cylOD: '', cylOS: '', note: '', nextAppointment: '' }
const INPUT = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 accent-teal-500'

export default function RecordsPage() {
  const { exams, activeChild, isLoading, saveExam, updateExam, deleteExam } = useChild()
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState<ExamRecord | null>(null)
  const [form, setForm]         = useState(EMPTY_EXAM)
  const [saving, setSaving]     = useState(false)
  const [showCRInfo, setShowCRInfo] = useState(false)
  const [showOcrInfo, setShowOcrInfo] = useState(false)
  const [showMemo, setShowMemo] = useState(false)
  const [selectedYear, setSelectedYear] = useState('')
  const [deleting, setDeleting] = useState<ExamRecord | null>(null)
  const [explains, setExplains] = useState<Record<string, { loading?: boolean; points?: { label: string; text: string }[]; error?: string; open?: boolean }>>({})
  const [extracting, setExtracting] = useState<'axial' | 'refraction' | null>(null)

  const years = [...new Set(exams.map(e => e.date.slice(0, 4)))].sort().reverse()
  const activeYear = selectedYear || years[0] || ''
  const filtered = activeYear ? exams.filter(e => e.date.startsWith(activeYear)) : exams

  const seqOD = calcSeq(form.sphOD, form.cylOD)
  const seqOS = calcSeq(form.sphOS, form.cylOS)

  const openAdd = () => {
    setEditing(null)
    setForm({ ...EMPTY_EXAM, clinic: exams[0]?.clinic ?? '' })
    setShowMemo(false)
    setModal(true)
  }
  const openEdit = (e: ExamRecord) => {
    setEditing(e)
    setForm({
      date: e.date, clinic: e.clinic, axOD: e.axOD, axOS: e.axOS,
      sphOD: e.sphOD, sphOS: e.sphOS,                       // Sph: 부호 유지(+/−)
      cylOD: stripMinus(e.cylOD), cylOS: stripMinus(e.cylOS), // Cyl: 크기로(음수 표기 제거)
      note: e.note, nextAppointment: e.nextAppointment ?? '',
    })
    setShowMemo(!!e.note)   // 메모 있으면 펼쳐서 보이게
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
        // Sph는 form에 이미 부호 포함(+/−). Cyl은 minus-cyl이라 크기→음수.
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

  const handleExtract = async (type: 'axial' | 'refraction', file: File | undefined) => {
    if (!file || extracting) return
    setExtracting(type)
    try {
      const img = await downscaleImage(file)
      const fields = await extractExam(type, img)
      const patch = type === 'axial'
        ? axialToPatch(fields as AxialFields)
        : refractionToPatch(fields as RefractionFields)
      if (Object.keys(patch).length === 0) {
        toast.error('검사지에서 값을 읽지 못했어요. 더 선명한 사진으로 시도해주세요.')
        return
      }
      setForm(f => ({ ...f, ...patch }))   // 추출된 필드만 채움 (나머지 유지)
      toast.success('자동 입력했어요. 저장 전 꼭 확인해주세요.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '추출에 실패했습니다.')
    } finally {
      setExtracting(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try { await deleteExam(deleting.id); toast.success('삭제됐습니다') }
    catch { toast.error('삭제에 실패했습니다') }
    finally { setDeleting(null) }
  }

  const toggleExplain = async (exam: ExamRecord) => {
    const cur = explains[exam.id]
    if (cur && (cur.points || cur.error)) {          // 이미 받아온 건 펼침/접힘만
      setExplains(p => ({ ...p, [exam.id]: { ...cur, open: !cur.open } }))
      return
    }
    if (!activeChild) return
    setExplains(p => ({ ...p, [exam.id]: { loading: true, open: true } }))
    try {
      const ctx = buildExamExplainContext({ child: activeChild, exams, examId: exam.id })
      if (!ctx) throw new Error('해설을 만들 수 없습니다.')
      const res = await fetch('/api/exam-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '해설 생성에 실패했습니다.')
      setExplains(p => ({ ...p, [exam.id]: { points: data.explanation.points, open: true } }))
    } catch (err) {
      setExplains(p => ({ ...p, [exam.id]: { error: err instanceof Error ? err.message : '해설 생성 실패', open: true } }))
    }
  }

  if (isLoading) return <TabSkeleton />

  return (
    <>
      {exams.length === 0 ? (
        <EmptyState message="검사기록이 없습니다." action={{ label: '첫 기록 추가', onClick: openAdd }} />
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{filtered.length}건</span>
            <select
              value={activeYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
          </div>
          {filtered.map(e => (
            <div key={e.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-800">{e.date}</span>
                <div className="flex items-center gap-2">
                  {e.clinic && <span className="text-xs text-gray-400">{e.clinic}</span>}
                  <button onClick={() => openEdit(e)} className="text-gray-300 hover:text-teal-400 text-sm"><FontAwesomeIcon icon={faPen} /></button>
                  <button onClick={() => setDeleting(e)} className="text-gray-300 hover:text-rose-400 text-sm"><FontAwesomeIcon icon={faXmark} /></button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                {(e.axOD || e.axOS) && (
                  <div className="flex justify-between bg-teal-50 rounded-lg px-3 py-2">
                    <span className="text-teal-700 font-medium">안축장 (OD/OS)</span>
                    <span className="font-bold text-teal-700">{e.axOD||'—'} / {e.axOS||'—'} mm</span>
                  </div>
                )}
                {(e.sphOD || e.sphOS) && (
                  <div className="flex justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-gray-500">Sph (OD/OS)</span>
                    <span className="font-medium">{fmtSigned(e.sphOD)} / {fmtSigned(e.sphOS)} D</span>
                  </div>
                )}
                {(e.cylOD || e.cylOS) && (
                  <div className="flex justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-gray-500">Cyl (OD/OS)</span>
                    <span className="font-medium">{fmtD(e.cylOD)} / {fmtD(e.cylOS)} D</span>
                  </div>
                )}
                {(e.serOD || e.serOS) && (
                  <div className="flex justify-between bg-amber-50 rounded-lg px-3 py-2">
                    <span className="text-amber-600 font-medium">SEQ (OD/OS)</span>
                    <span className="font-bold text-amber-700">{fmtSigned(e.serOD)} / {fmtSigned(e.serOS)} D</span>
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

              {(e.axOD || e.axOS || e.serOD || e.serOS) && (
                <div className="mt-2.5 pt-2.5 border-t border-gray-50">
                  <button
                    onClick={() => toggleExplain(e)}
                    disabled={explains[e.id]?.loading}
                    className="flex items-center gap-1.5 text-xs font-medium text-teal-600 disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={faWandMagicSparkles} className={explains[e.id]?.loading ? 'animate-pulse' : ''} />
                    AI 해설
                  </button>
                  {explains[e.id]?.open && (
                    <div className="mt-2 bg-teal-50/60 rounded-lg p-3 text-sm leading-relaxed text-gray-700">
                      {explains[e.id]?.loading ? (
                        <span className="text-gray-400">해설 생성 중…</span>
                      ) : explains[e.id]?.error ? (
                        <span className="text-rose-500">{explains[e.id]?.error}</span>
                      ) : (
                        <>
                          <ul className="space-y-1.5">
                            {explains[e.id]?.points?.map((pt, i) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-teal-400 mt-0.5 select-none">•</span>
                                <p className="flex-1">
                                  <span className="font-semibold text-gray-800">{pt.label}</span>
                                  <span className="text-gray-600"> — {pt.text}</span>
                                </p>
                              </li>
                            ))}
                          </ul>
                          <p className="mt-2.5 text-[11px] text-gray-400">참고용 해설이며 진단이 아닙니다. 정확한 판단은 안과 전문의와 상담하세요.</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-24 z-30 w-14 h-14 bg-teal-500 hover:bg-teal-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors active:scale-95"
        style={{ right: 'max(1rem, calc((100vw - 480px) / 2 + 1rem))' }}
      >
        <FontAwesomeIcon icon={faPlus} className="text-xl" />
      </button>

      <ConfirmModal
        open={!!deleting}
        title="검사기록을 삭제할까요?"
        message={deleting ? `${deleting.date} 기록이 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.` : ''}
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? '검사기록 수정' : '검사기록 추가'}</h2>
              <button onClick={closeModal} className="text-gray-400 text-xl"><FontAwesomeIcon icon={faXmark} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="bg-teal-50/60 rounded-xl p-3">
                <p className="text-xs font-semibold text-teal-700 mb-2">
                  <FontAwesomeIcon icon={faCamera} className="mr-1" />
                  검사지 사진으로 자동 채우기
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <ExtractButton label="안축장 검사지" type="axial" extracting={extracting} onFile={handleExtract} />
                  <ExtractButton label="굴절 검사지" type="refraction" extracting={extracting} onFile={handleExtract} />
                </div>
                <div className="flex items-start gap-1.5 mt-2">
                  <p className="flex-1 text-[11px] text-gray-400">각각 올리면 자동으로 채워져요. 저장 전 꼭 확인·수정하세요.</p>
                  <button type="button" onClick={() => setShowOcrInfo(v => !v)} className="shrink-0 text-gray-400 mt-px" aria-label="안내">
                    <FontAwesomeIcon icon={faCircleInfo} className="text-[11px]" />
                  </button>
                </div>
                {showOcrInfo && (
                  <p className="text-[11px] text-gray-400 mt-1">사진은 측정값 추출을 위해 외부 AI(Upstage)로 전송되며 저장되지 않습니다.</p>
                )}
              </div>
              <Field label="검사일">
                <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className={INPUT}/>
              </Field>
              <Field label="안과">
                <input placeholder="병원명" value={form.clinic} onChange={e=>setForm(f=>({...f,clinic:e.target.value}))} className={INPUT}/>
              </Field>
              <div className="border border-gray-100 rounded-xl p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">안축장 (mm)</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="우안 (OD)">
                    <input type="number" step="0.01" placeholder="24.82" value={form.axOD} onChange={e=>setForm(f=>({...f,axOD:e.target.value}))} className={INPUT}/>
                  </Field>
                  <Field label="좌안 (OS)">
                    <input type="number" step="0.01" placeholder="24.91" value={form.axOS} onChange={e=>setForm(f=>({...f,axOS:e.target.value}))} className={INPUT}/>
                  </Field>
                </div>
              </div>

              <div className="border border-gray-100 rounded-xl p-3">
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
                  <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 mb-3 text-xs space-y-1.5 text-teal-700">
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
                  <SignedInput value={form.sphOD} onChange={v=>setForm(f=>({...f,sphOD:v}))} placeholder="3.00"/>
                  <NegInput value={form.cylOD} onChange={v=>setForm(f=>({...f,cylOD:v}))} placeholder="0.50"/>
                  <div className="h-10 flex items-center justify-center bg-teal-50 rounded-lg text-sm font-bold text-teal-700">{seqOD}</div>
                </div>
                <div className="grid gap-2 items-center" style={{gridTemplateColumns:'4.5rem 1fr 1fr 1fr'}}>
                  <span className="text-xs text-center text-gray-500 font-medium">좌안(OS)</span>
                  <SignedInput value={form.sphOS} onChange={v=>setForm(f=>({...f,sphOS:v}))} placeholder="3.00"/>
                  <NegInput value={form.cylOS} onChange={v=>setForm(f=>({...f,cylOS:v}))} placeholder="0.50"/>
                  <div className="h-10 flex items-center justify-center bg-teal-50 rounded-lg text-sm font-bold text-teal-700">{seqOS}</div>
                </div>
              </div>

              <Field label="다음 예약일">
                <input type="date" value={form.nextAppointment} onChange={e=>setForm(f=>({...f,nextAppointment:e.target.value}))} className={INPUT}/>
              </Field>

              <div>
                <button type="button" onClick={() => setShowMemo(v => !v)}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
                  <FontAwesomeIcon icon={showMemo ? faChevronUp : faChevronDown} className="text-xs" />
                  추가 정보 (선택)
                </button>
                {showMemo && (
                  <textarea rows={2} placeholder="메모 — 특이사항 등" value={form.note}
                    onChange={e=>setForm(f=>({...f,note:e.target.value}))} className={`${INPUT} mt-2`}/>
                )}
              </div>

              <button type="submit" disabled={saving} className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-semibold py-3 rounded-xl transition-colors">
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
  const handleBlur = () => {
    if (value === '') return
    const n = parseFloat(value)
    if (!isNaN(n)) onChange(n.toFixed(2))
  }
  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none select-none">−</span>
      <input
        type="text" inputMode="decimal" placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={handleBlur}
        className="w-full border border-gray-200 rounded-lg pl-6 pr-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
    </div>
  )
}

// Sph용: 부호(+/−) 토글 + 크기 입력. value는 부호 포함 문자열("-3.00"/"+1.00"/"").
// 근시가 흔하므로 기본 부호는 '−'. 음수만 가능한 게 아니라 +도 선택 가능(난시 큰 경우 등).
function SignedInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const initSign = (): '-' | '+' => {
    const n = parseFloat(value)
    if (!value || isNaN(n)) return '-'
    return n < 0 ? '-' : '+'
  }
  const [sign, setSign] = useState<'-' | '+'>(initSign())
  const mag = value.replace(/^[+-]/, '')
  const emit = (s: '-' | '+', m: string) => onChange(m === '' ? '' : `${s}${m}`)
  const handleBlur = () => {
    if (mag === '') return
    const n = parseFloat(mag)
    if (!isNaN(n)) emit(sign, Math.abs(n).toFixed(2))
  }
  return (
    <div className="flex border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-teal-500">
      <button
        type="button"
        onClick={() => { const ns = sign === '-' ? '+' : '-'; setSign(ns); emit(ns, mag) }}
        className="w-8 shrink-0 bg-gray-50 text-gray-600 font-bold border-r border-gray-200 active:bg-gray-100 select-none"
        aria-label="부호 전환"
      >
        {sign}
      </button>
      <input
        type="text" inputMode="decimal" placeholder={placeholder}
        value={mag}
        onChange={e => emit(sign, e.target.value)}
        onBlur={handleBlur}
        className="w-full px-2 py-2.5 text-sm focus:outline-none"
      />
    </div>
  )
}

function ExtractButton({ label, type, extracting, onFile }: {
  label: string
  type: 'axial' | 'refraction'
  extracting: 'axial' | 'refraction' | null
  onFile: (type: 'axial' | 'refraction', file: File | undefined) => void
}) {
  const busy = extracting === type
  const disabled = extracting !== null
  return (
    <label className={`flex items-center justify-center gap-1.5 text-xs font-medium border rounded-lg py-2.5 px-2 transition-colors
      ${disabled ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-teal-300 text-teal-600 bg-white cursor-pointer active:bg-teal-50'}`}>
      <FontAwesomeIcon icon={busy ? faArrowsRotate : faCamera} className={busy ? 'animate-spin' : ''} />
      {busy ? '인식 중…' : label}
      <input
        type="file" accept="image/*" className="hidden" disabled={disabled}
        onChange={e => { onFile(type, e.target.files?.[0]); e.currentTarget.value = '' }}
      />
    </label>
  )
}
