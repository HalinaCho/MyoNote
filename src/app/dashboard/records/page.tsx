'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useChild } from '@/context/ChildContext'
import TabSkeleton from '@/components/ui/TabSkeleton'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { today } from '@/lib/utils/date'
import { buildExamComparison } from '@/lib/aiReport'
import { downscaleImage, extractExam, axialToPatch, refractionToPatch } from '@/lib/examExtract'
import type { AxialFields, RefractionFields } from '@/lib/examExtract'
import type { ExamRecord } from '@/types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faXmark, faCircleInfo, faCalendarDays, faPlus, faRightLeft, faCamera, faArrowsRotate, faChevronDown, faChevronUp, faArrowUpFromBracket } from '@fortawesome/free-solid-svg-icons'

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
// 안축장 변화량(mm) — 부호 포함
const fmtDeltaMm = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}mm`

const EMPTY_EXAM = { date: today(), clinic: '', axOD: '', axOS: '', sphOD: '', sphOS: '', cylOD: '', cylOS: '', note: '', nextAppointment: '' }
// 단일 줄 입력칸 공통 규칙 — 높이 h-9(36px)로 통일(SEQ 박스·헤더·업로드 버튼과 동일)
const INPUT = 'w-full h-9 bg-gray-50 focus:bg-white border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 accent-teal-500'
// 여러 줄(메모)용 — 높이는 rows로 자동, 나머지 스타일은 INPUT과 통일
const TEXTAREA = 'w-full bg-gray-50 focus:bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500'

export default function RecordsPage() {
  const { exams, isLoading, saveExam, updateExam, deleteExam } = useChild()
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState<ExamRecord | null>(null)
  const [form, setForm]         = useState(EMPTY_EXAM)
  const [saving, setSaving]     = useState(false)
  const [showCRInfo, setShowCRInfo] = useState(false)
  const [showOcrInfo, setShowOcrInfo] = useState(false)
  const [showRefraction, setShowRefraction] = useState(false)  // 굴절도수(선택) 섹션 펼침
  const [apptFocus, setApptFocus] = useState(false)            // 다음 예약일 포커스(플레이스홀더 오버레이용)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())  // 접힌 연도(기본 전부 펼침)
  const [deleting, setDeleting] = useState<ExamRecord | null>(null)
  const [confirmPosSph, setConfirmPosSph] = useState<string | null>(null)  // 양수 Sph 저장 전 확인
  const [extracting, setExtracting] = useState<'axial' | 'refraction' | null>(null)
  const [extractStage, setExtractStage] = useState<string | null>(null)  // OCR 대기 중 단계별 안내 문구
  const [extractProgress, setExtractProgress] = useState(0)              // OCR 진행바(시간 기반 추정, 92%에서 대기)

  const years = [...new Set(exams.map(e => e.date.slice(0, 4)))].sort().reverse()
  // 다음 예약은 가장 최신 검사에서만 의미 있음 → 최신 카드에만 노출
  const latestExamId = exams.length ? exams.reduce((a, b) => (b.date > a.date ? b : a)).id : null
  const toggleYear = (y: string) => setCollapsed(prev => {
    const next = new Set(prev)
    if (next.has(y)) next.delete(y); else next.add(y)
    return next
  })

  const seqOD = calcSeq(form.sphOD, form.cylOD)
  const seqOS = calcSeq(form.sphOS, form.cylOS)

  const openAdd = () => {
    setEditing(null)
    setForm({ ...EMPTY_EXAM, clinic: exams[0]?.clinic ?? '' })
    setShowRefraction(false)
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
    setShowRefraction(!!(e.sphOD || e.sphOS || e.cylOD || e.cylOS))  // 굴절값 있으면 펼쳐서 보이게
    setModal(true)
  }
  const closeModal = () => { setModal(false); setEditing(null); setForm(EMPTY_EXAM) }

  // 근시 앱에서 Sph 양수(원시)는 드물어, −를 깜빡한 실수일 가능성이 큼 → 저장 전 확인
  const positiveSph = () => {
    const labels: string[] = []
    const od = parseFloat(form.sphOD), os = parseFloat(form.sphOS)
    if (!isNaN(od) && od > 0) labels.push(`우안(OD) +${od.toFixed(2)}`)
    if (!isNaN(os) && os > 0) labels.push(`좌안(OS) +${os.toFixed(2)}`)
    return labels
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.date) { toast.error('검사일을 입력해주세요'); return }
    const pos = positiveSph()
    if (pos.length > 0) { setConfirmPosSph(pos.join(', ')); return }   // 양수 Sph → 확인 모달
    await doSave()
  }

  const doSave = async () => {
    setConfirmPosSph(null)
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
    // 문구는 실제 단계(downscale이 이제 <1초라 깜빡임) 대신 ~20초를 읽기 좋게 시간 배분한 안심용.
    setExtractStage('사진을 최적화하고 있어요…')
    const stageTimers = [
      setTimeout(() => setExtractStage('AI가 검사값을 읽는 중이에요…'), 4000),
      setTimeout(() => setExtractStage('거의 다 됐어요, 잠시만요…'), 13000),
    ]
    // 진행바: 실측 진행률이 없으므로 경과시간 기반 추정. S자(로지스틱)로 초반은 천천히,
    // 중반에 차오르다 96%에 점근(완료 전 100% 미도달=정직). 중점 8초, 기울기 0.5
    // → 14초쯤 90% 넘겨 응답이 빨리 끝나도 높은 데서 마무리.
    setExtractProgress(0)
    const startedAt = performance.now()
    const progressTimer = setInterval(() => {
      const t = (performance.now() - startedAt) / 1000
      setExtractProgress(96 / (1 + Math.exp(-0.5 * (t - 8))))
    }, 150)
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
      if (type === 'refraction') setShowRefraction(true)   // 굴절 채웠으면 섹션 펼침
      toast.success('자동 입력했어요. 저장 전 꼭 확인해주세요.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '추출에 실패했습니다.')
    } finally {
      clearInterval(progressTimer)
      stageTimers.forEach(clearTimeout)
      setExtracting(null)
      setExtractStage(null)
      setExtractProgress(0)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try { await deleteExam(deleting.id); toast.success('삭제됐습니다') }
    catch { toast.error('삭제에 실패했습니다') }
    finally { setDeleting(null) }
  }

  if (isLoading) return <TabSkeleton />

  return (
    <>
      {exams.length === 0 ? (
        <EmptyState message="검사기록이 없습니다." action={{ label: '첫 기록 추가', onClick: openAdd }} />
      ) : (
        <div className="space-y-3">
          <span className="text-sm text-gray-400">전체 {exams.length}건</span>
          {years.map(y => {
            const items = exams.filter(e => e.date.startsWith(y))
            const open = !collapsed.has(y)
            return (
            <div key={y}>
              <button
                onClick={() => toggleYear(y)}
                className="sticky top-0 z-10 w-full flex items-center justify-between bg-[#edf7f6] py-2 px-1"
              >
                <span className="text-sm font-bold text-gray-700">
                  {y}년<span className="ml-1.5 font-normal text-gray-400">{items.length}건</span>
                </span>
                <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="text-gray-400 text-xs" />
              </button>
              {open && (
                <div className="space-y-2 mt-1">
                  {items.map(e => (
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
              </div>

              <ExamCardFooter exams={exams} examId={e.id} isLatest={e.id === latestExamId} nextAppointment={e.nextAppointment} onAddAppt={() => openEdit(e)} />
            </div>
                  ))}
                </div>
              )}
            </div>
            )
          })}
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

      <ConfirmModal
        open={!!confirmPosSph}
        danger={false}
        title="Sph 부호가 맞나요?"
        message={confirmPosSph ? `${confirmPosSph} 가 양수(+, 원시)로 입력되어 있어요.\n근시는 음수(−)입니다. 입력한 부호가 맞나요?` : ''}
        confirmLabel="네, 맞아요"
        cancelLabel="다시 확인"
        onConfirm={doSave}
        onCancel={() => setConfirmPosSph(null)}
      />

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <form onSubmit={handleSave} className="flex flex-col min-h-0 flex-1">
              {/* 고정 헤더: 제목 + 닫기 + 검사일·안과 */}
              <div className="px-5 pt-5 pb-4 bg-teal-500">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-white">{editing ? '검사기록 수정' : '검사기록 추가'}</h2>
                  <button type="button" onClick={closeModal} className="text-white/80 hover:text-white text-xl"><FontAwesomeIcon icon={faXmark} /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-teal-50 mb-1">검사일</label>
                    <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}
                      className="w-full h-9 bg-white border border-transparent rounded-lg px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/70"/>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-teal-50 mb-1">안과</label>
                    <input placeholder="병원명" value={form.clinic} onChange={e=>setForm(f=>({...f,clinic:e.target.value}))}
                      className="w-full h-9 bg-white border border-transparent rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/70"/>
                  </div>
                </div>
              </div>

              {/* 스크롤 본문 */}
              <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3">
              <div className="bg-teal-50/60 rounded-xl p-3">
                <p className="text-xs font-semibold text-teal-700 mb-2">
                  <FontAwesomeIcon icon={faCamera} className="mr-1" />
                  검사지 사진으로 자동 채우기
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <ExtractButton label="안축장 검사지" type="axial" extracting={extracting} onFile={handleExtract} />
                  <ExtractButton label="굴절 검사지" type="refraction" extracting={extracting} onFile={handleExtract} />
                </div>
                {extracting ? (
                  <div className="mt-2" aria-live="polite">
                    <p className="text-[11px] text-teal-600">{extractStage}</p>
                    <div className="mt-1 h-1 rounded-full bg-teal-100 overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-[width] duration-200 ease-out"
                        style={{ width: `${extractProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-1.5 mt-2">
                    <p className="flex-1 text-[11px] text-gray-400">각각 올리면 자동으로 채워져요. 저장 전 꼭 확인·수정하세요.</p>
                    <button type="button" onClick={() => setShowOcrInfo(v => !v)} className="shrink-0 text-gray-400 mt-px" aria-label="안내">
                      <FontAwesomeIcon icon={faCircleInfo} className="text-[11px]" />
                    </button>
                  </div>
                )}
                {showOcrInfo && (
                  <p className="text-[11px] text-gray-400 mt-1">사진은 측정값 추출을 위해 외부 AI(Upstage)로 전송되며 저장되지 않습니다.</p>
                )}
              </div>
              {/* 필드 그룹 — 카드 대신 얇은 구분선으로 구역 구분 */}
              <div className="divide-y divide-gray-100">
              <Field className="pb-3" label={
                <span className="flex items-center justify-between">
                  <span>안축장 (mm)<span className="ml-1.5 align-middle text-[10px] font-semibold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">필수</span></span>
                  <SwapEyesButton onClick={()=>setForm(f=>({...f,axOD:f.axOS,axOS:f.axOD}))} />
                </span>
              }>
                <div className="grid gap-2 items-center" style={{gridTemplateColumns:'4.5rem 1fr 4.5rem 1fr'}}>
                  <span className="text-xs text-center text-gray-500 font-medium">우안(OD)</span>
                  <input type="number" step="0.01" value={form.axOD} onChange={e=>setForm(f=>({...f,axOD:e.target.value}))} className={INPUT}/>
                  <span className="text-xs text-center text-gray-500 font-medium">좌안(OS)</span>
                  <input type="number" step="0.01" value={form.axOS} onChange={e=>setForm(f=>({...f,axOS:e.target.value}))} className={INPUT}/>
                </div>
              </Field>

              <div className="py-3">
                <button type="button" onClick={() => setShowRefraction(v => !v)}
                  className="w-full flex items-center justify-between" aria-expanded={showRefraction}>
                  <span className="text-sm font-medium text-gray-700">
                    굴절 도수 (D)
                    <span className="ml-1.5 align-middle text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">선택</span>
                  </span>
                  <FontAwesomeIcon icon={showRefraction ? faChevronUp : faChevronDown} className="text-xs text-gray-400" />
                </button>
                {showRefraction && (
                  <div className="mt-1">
                    <div className="flex justify-between items-center mb-2">
                      <SwapEyesButton onClick={()=>setForm(f=>({...f,sphOD:f.sphOS,sphOS:f.sphOD,cylOD:f.cylOS,cylOS:f.cylOD}))} />
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
                      <SignedInput value={form.sphOD} onChange={v=>setForm(f=>({...f,sphOD:v}))} placeholder=""/>
                      <NegInput value={form.cylOD} onChange={v=>setForm(f=>({...f,cylOD:v}))} placeholder=""/>
                      <div className="h-9 flex items-center justify-center bg-teal-50 rounded-lg text-sm font-bold text-teal-700">{seqOD}</div>
                    </div>
                    <div className="grid gap-2 items-center" style={{gridTemplateColumns:'4.5rem 1fr 1fr 1fr'}}>
                      <span className="text-xs text-center text-gray-500 font-medium">좌안(OS)</span>
                      <SignedInput value={form.sphOS} onChange={v=>setForm(f=>({...f,sphOS:v}))} placeholder=""/>
                      <NegInput value={form.cylOS} onChange={v=>setForm(f=>({...f,cylOS:v}))} placeholder=""/>
                      <div className="h-9 flex items-center justify-center bg-teal-50 rounded-lg text-sm font-bold text-teal-700">{seqOS}</div>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2 leading-snug">
                      Sph는 근시면 <span className="font-medium text-gray-500">−</span>(예: −3.00), 원시면 <span className="font-medium text-gray-500">+</span>를 붙여 입력해주세요.
                    </p>
                  </div>
                )}
              </div>

              <Field className="py-3" label="다음 예약일">
                {/* type=date는 일반 placeholder 미지원 → 빈 상태(비포커스)에만 YY.MM.DD 오버레이 */}
                <div className="relative">
                  <input type="date" value={form.nextAppointment}
                    onChange={e=>setForm(f=>({...f,nextAppointment:e.target.value}))}
                    onFocus={()=>setApptFocus(true)} onBlur={()=>setApptFocus(false)}
                    className={`${INPUT} ${!form.nextAppointment && !apptFocus ? 'text-transparent' : ''}`}/>
                  {!form.nextAppointment && !apptFocus && (
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-400">YYYY.MM.DD</span>
                  )}
                </div>
              </Field>

              <Field className="pt-3" label="추가 정보 (선택)">
                <textarea rows={2} placeholder="메모 — 특이사항 등" value={form.note}
                  onChange={e=>setForm(f=>({...f,note:e.target.value}))} className={TEXTAREA}/>
              </Field>
              </div>
              </div>

              {/* 고정 저장 바 */}
              <div className="px-5 py-3 border-t border-gray-100">
                <button type="submit" disabled={saving} className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-semibold py-3 rounded-xl transition-colors">
                  {saving ? '저장 중...' : editing ? '수정하기' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// OCR이 우안(OD)/좌안(OS)을 반대로 읽는 경우가 잦아, 한 번에 되돌리는 좌우 스왑 버튼.
function SwapEyesButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-teal-600 transition-colors"
      title="우안(OD)과 좌안(OS) 값을 서로 바꿉니다">
      <FontAwesomeIcon icon={faRightLeft} className="text-[10px]" />
      좌우 바꾸기
    </button>
  )
}

function Field({ label, children, className = '' }: { label: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
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
        className="w-full h-9 bg-gray-50 focus:bg-white border border-gray-200 rounded-lg pl-6 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
    </div>
  )
}

// Sph용: 부호 포함 자유 입력. value는 부호 포함 문자열("-3.00"/"+1.00"/"").
// 메인 입력경로는 OCR 자동입력(부호 포함)이라 토글 없이 단순 입력으로 충분 — 입력칸을 넓게 씀.
// 부호는 사용자가 입력한 그대로 보존(자동 변환 없음) — 근시는 −를 직접 입력. 크기만 소수 2자리 정규화.
// −를 깜빡해 양수가 되는 실수는 저장 시 양수(+) 확인 모달로 잡는다.
function SignedInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const handleBlur = () => {
    const raw = value.trim()
    if (raw === '') { if (value !== '') onChange(''); return }
    const n = parseFloat(raw)
    if (isNaN(n)) return
    const sign = n < 0 ? '-' : raw.startsWith('+') ? '+' : ''   // 입력한 부호 그대로 유지
    onChange(`${sign}${Math.abs(n).toFixed(2)}`)
  }
  return (
    <input
      type="text" inputMode="decimal" placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={handleBlur}
      className="w-full h-9 bg-gray-50 focus:bg-white border border-gray-200 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
    />
  )
}

// 지난 검사와 비교 (안축장 길이, 결정적 계산 — AI 없음, 상담 권유·불안 조장 없이 사실만)
const VERDICT_KO: Record<'faster' | 'similar' | 'slower', string> = {
  faster: '빠른 편', similar: '비슷한 편', slower: '느린 편',
}
// 판정 밴드 설명 (구체 비율 대신 기준 범위)
const VERDICT_BAND: Record<'faster' | 'similar' | 'slower', string> = {
  faster: '직전보다 20% 이상 빠름', similar: '직전과 ±20% 이내', slower: '직전보다 20% 이상 느림',
}
// 컬러 상징: 빠름=로즈(주의)·비슷=엠버·느림=틸(양호)
const VERDICT_COLOR: Record<'faster' | 'similar' | 'slower', string> = {
  faster: 'text-rose-500', similar: 'text-amber-600', slower: 'text-teal-600',
}
function ExamCardFooter({ exams, examId, isLatest, nextAppointment, onAddAppt }: {
  exams: ExamRecord[]; examId: string; isLatest: boolean; nextAppointment?: string | null; onAddAppt: () => void
}) {
  const cmp = buildExamComparison(exams, examId)
  const [open, setOpen] = useState(false)
  if (!cmp && !isLatest) return null   // 비교도 없고 최신도 아니면 푸터 자체 생략
  const eyes = (od: number | null, os: number | null) => {
    const parts: string[] = []
    if (od != null) parts.push(`우안 ${fmtDeltaMm(od)}`)
    if (os != null) parts.push(`좌안 ${fmtDeltaMm(os)}`)
    return parts.join(' · ')
  }
  return (
    <div className="mt-2.5 pt-2.5 border-t border-gray-50">
      {/* 한 줄: 좌=비교 토글(있을 때), 우=다음 예약(최신 카드만) */}
      <div className="flex items-center gap-2">
        {cmp && (
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1.5 text-xs font-medium text-teal-600"
            aria-expanded={open}
          >
            <FontAwesomeIcon icon={faRightLeft} className="text-[11px]" />
            지난 검사와 비교
            <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="text-[10px] text-gray-400" />
          </button>
        )}
        {isLatest && (nextAppointment ? (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-teal-500">
            <FontAwesomeIcon icon={faCalendarDays} className="text-[11px]" />
            다음 예약 {nextAppointment}
          </span>
        ) : (
          <button onClick={onAddAppt} className="ml-auto flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700">
            <FontAwesomeIcon icon={faCalendarDays} className="text-[11px]" />
            다음 예약일 입력
          </button>
        ))}
      </div>
      {cmp && open && (
        <div className="mt-2 bg-teal-50/60 rounded-lg p-3 text-sm text-gray-700 space-y-1.5">
          <p className="flex gap-2">
            <span className="text-teal-400 mt-0.5 select-none">•</span>
            <span>지난 검사({cmp.prevDate}) 대비 {cmp.months1}개월 — 안축장 {eyes(cmp.delta1.od, cmp.delta1.os)}</span>
          </p>
          {cmp.prior && (
            <p className="flex gap-2">
              <span className={`mt-0.5 select-none ${VERDICT_COLOR[cmp.prior.verdict]}`}>•</span>
              <span className="text-gray-600">
                같은 {cmp.months1}개월로 맞추면 직전 구간은 — 안축장 {eyes(cmp.prior.scaled0.od, cmp.prior.scaled0.os)} →
                <b>성장 속도</b> <b className={VERDICT_COLOR[cmp.prior.verdict]}>{VERDICT_KO[cmp.prior.verdict]}</b>
                <span className="text-gray-400 text-xs"> ({VERDICT_BAND[cmp.prior.verdict]})</span>
              </span>
            </p>
          )}
          {cmp.shortInterval && (
            <p className="text-[11px] text-gray-400 pl-4">검사 간격이 짧아 참고용이에요.</p>
          )}
        </div>
      )}
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
    <label className={`flex items-center justify-center gap-1.5 text-xs font-medium border rounded-lg h-9 px-2 transition-colors
      ${disabled ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-teal-300 text-teal-600 bg-white cursor-pointer active:bg-teal-50'}`}>
      <FontAwesomeIcon icon={busy ? faArrowsRotate : faArrowUpFromBracket} className={busy ? 'animate-spin' : ''} />
      {busy ? '인식 중…' : label}
      <input
        type="file" accept="image/*" className="hidden" disabled={disabled}
        onChange={e => { onFile(type, e.target.files?.[0]); e.currentTarget.value = '' }}
      />
    </label>
  )
}
