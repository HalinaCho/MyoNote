'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useHospital } from '@/context/HospitalContext'
import * as q from '@/lib/supabase/queries'
import { errMessage } from '@/lib/utils/error'
import { patientMeta, dueClass } from '@/lib/utils/patient'
import { pastLabel, dueLabel } from '@/lib/utils/date'
import { calcRecentCompliance } from '@/lib/utils/compliance'
import { makeTreatmentsForDate } from '@/lib/treatments'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronRight, faChevronLeft, faMagnifyingGlass, faXmark,
  faTriangleExclamation, faUserSlash,
} from '@fortawesome/free-solid-svg-icons'

// 검색어는 sessionStorage — 환자 카드에 들어갔다 돌아와도 목록이 그대로 유지되게.
// 최근 검색어는 localStorage — 브라우저를 닫아도 남아야 다음 진료 때 쓸 수 있다.
const QUERY_KEY  = 'mn_clinic_patient_query'
const RECENT_KEY = 'mn_clinic_recent_patient_search'
const RECENT_MAX = 8

// 순응도 색: 낮을수록 눈에 띄게 — 원장이 훑어보며 놓친 환자를 찾는 화면이라 대비를 준다
function pctClass(pct: number | null) {
  if (pct === null) return 'text-gray-300'
  if (pct >= 80) return 'text-teal-600'
  if (pct >= 50) return 'text-amber-500'
  return 'text-rose-500'
}
const pctText = (pct: number | null) => (pct === null ? '—' : `${pct}%`)

function OverdueCard({
  icon, iconClass, label, count, expanded, onToggle,
}: { icon: typeof faTriangleExclamation; iconClass: string; label: string; count: number; expanded: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className={`flex-1 bg-white rounded-xl border px-3 py-3 text-center transition-colors
        ${expanded ? 'border-teal-500' : 'border-gray-100'}`}>
      <FontAwesomeIcon icon={icon} className={`${iconClass} text-sm mb-1`} />
      <div className="text-xl font-bold text-gray-800">{count}</div>
      <div className="text-[11px] text-gray-400">{label}</div>
    </button>
  )
}

export default function ClinicPatientsAllPage() {
  const { hospital, isLoading: hospitalLoading, error: hospitalError } = useHospital()
  const [patients, setPatients] = useState<q.RosterPatient[] | null>(null)
  const [care, setCare] = useState<Record<string, q.PatientCare>>({})
  const [overdue, setOverdue] = useState<q.OverduePatient[] | null>(null)
  const [error, setError] = useState('')

  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<string[]>([])
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [expanded, setExpanded] = useState<'overdue' | 'churned' | null>(null)

  useEffect(() => {
    if (!hospital) return
    Promise.all([q.fetchPatientRoster(hospital.id), q.fetchPatientCare(hospital.id, 30), q.fetchOverduePatients(hospital.id)])
      .then(([roster, careMap, od]) => { setPatients(roster); setCare(careMap); setOverdue(od) })
      .catch(err => setError(errMessage(err)))
  }, [hospital])

  // 저장소 접근이 막힌 브라우저(시크릿 모드 등)에서도 검색 자체는 동작해야 하므로 전부 try/catch.
  // 서버 렌더에는 storage가 없어 초기값으로 못 읽는다(하이드레이션 불일치) → 마운트 후 1회 복원.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 저장소에서 마운트 시 1회 복원
      setQuery(sessionStorage.getItem(QUERY_KEY) ?? '')
      const saved = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
      if (Array.isArray(saved)) setRecent(saved.filter((v): v is string => typeof v === 'string'))
    } catch { /* 저장소를 못 쓰면 검색어 유지·최근검색만 없는 상태로 동작 */ }
  }, [])

  const updateQuery = (v: string) => {
    setQuery(v)
    try { sessionStorage.setItem(QUERY_KEY, v) } catch { /* 유지 실패해도 검색은 동작 */ }
  }

  const saveRecent = (list: string[]) => {
    setRecent(list)
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)) } catch { /* 위와 동일 */ }
  }
  // 검색이 "완료"된 시점(엔터·환자 선택)에만 최근검색에 넣는다 — 타이핑 중 글자마다 쌓이면 쓸모없어진다
  const addRecent = (term: string) => {
    const t = term.trim()
    if (!t) return
    saveRecent([t, ...recent.filter(r => r !== t)].slice(0, RECENT_MAX))
  }

  const clearQuery = () => { updateQuery(''); inputRef.current?.focus() }

  if (hospitalError) return <p className="text-sm text-rose-500">{hospitalError}</p>
  if (hospitalLoading || patients === null || overdue === null) {
    return <div className="animate-pulse text-sm text-gray-400">불러오는 중…</div>
  }
  if (error) return <p className="text-sm text-rose-500">{error}</p>

  const overdueList = overdue.filter(p => p.status === 'overdue')
  const churnedList = overdue.filter(p => p.status === 'churned')

  const keyword = query.trim().toLowerCase()
  const filtered = keyword
    ? patients.filter(p => p.childName.toLowerCase().includes(keyword))
    : patients
  const showRecent = focused && recent.length > 0

  return (
    <div>
      <Link href="/clinic/patients" className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1 mb-3">
        <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" /> 환자 검색
      </Link>

      <div className="flex gap-2 mb-5">
        <OverdueCard icon={faTriangleExclamation} iconClass="text-amber-500" label="재방문 필요"
          count={overdueList.length} expanded={expanded === 'overdue'}
          onToggle={() => setExpanded(v => v === 'overdue' ? null : 'overdue')} />
        <OverdueCard icon={faUserSlash} iconClass="text-gray-400" label="이탈됨"
          count={churnedList.length} expanded={expanded === 'churned'}
          onToggle={() => setExpanded(v => v === 'churned' ? null : 'churned')} />
      </div>

      {expanded === 'overdue' && (
        <div className="mb-5 bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {overdueList.length === 0 ? (
            <p className="text-sm text-gray-400 px-4 py-3">예약일이 지났는데 재방문하지 않은 환자가 없습니다.</p>
          ) : overdueList.map(p => (
            <div key={p.childId} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-gray-800">{p.childName}</span>
              {/* 아래 목록과 같은 말로 — 같은 화면에서 "D+8"과 "8일 지남"이 섞이면 읽는 규칙이 둘이 된다.
                  일수는 서버가 센 daysOverdue를 그대로 쓴다(클라이언트 날짜로 다시 세지 않는다). */}
              <span className="text-sm text-rose-600 font-semibold" title={p.nextAppointment ?? ''}>
                {p.daysOverdue}일 지남
              </span>
            </div>
          ))}
        </div>
      )}
      {expanded === 'churned' && (
        <div className="mb-5 bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {churnedList.length === 0 ? (
            <p className="text-sm text-gray-400 px-4 py-3">최근 6개월 내 이탈한 환자가 없습니다.</p>
          ) : churnedList.map(p => (
            <div key={p.childId} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-gray-800">{p.childName}</span>
              <span className="text-xs text-gray-400" title={p.churnedAt ?? ''}>
                {pastLabel(p.churnedAt) || p.churnedAt} 연결 종료
              </span>
            </div>
          ))}
        </div>
      )}

      <h1 className="font-bold text-gray-800 mb-3">
        환자 목록 {keyword ? `— 검색 결과 ${filtered.length}명` : `(${patients.length})`}
      </h1>

      <div className="relative mb-3">
        <FontAwesomeIcon icon={faMagnifyingGlass}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-300" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => updateQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={e => {
            if (e.key === 'Enter') { addRecent(query); setFocused(false); inputRef.current?.blur() }
            if (e.key === 'Escape') { clearQuery(); setFocused(false) }
          }}
          placeholder="환자 이름으로 검색"
          className="w-full h-10 bg-white border border-gray-200 rounded-xl pl-9 pr-9 text-sm
                     focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        {query && (
          <button type="button" onClick={clearQuery} aria-label="검색어 지우기"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full
                       text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <FontAwesomeIcon icon={faXmark} className="text-xs" />
          </button>
        )}

        {showRecent && (
          // onMouseDown 기본동작을 막아 input의 blur가 클릭보다 먼저 일어나는 걸 방지
          <div onMouseDown={e => e.preventDefault()}
            className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-100
                       rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-50">
              <span className="text-[11px] font-medium text-gray-400">최근 검색</span>
              <button type="button" onClick={() => saveRecent([])}
                className="text-[11px] text-gray-400 hover:text-rose-500">전체 삭제</button>
            </div>
            {recent.map(term => (
              <div key={term} className="flex items-center hover:bg-gray-50">
                <button type="button"
                  onClick={() => { updateQuery(term); setFocused(false); inputRef.current?.blur() }}
                  className="flex-1 text-left px-3 py-2 text-sm text-gray-700 truncate">
                  {term}
                </button>
                <button type="button" aria-label={`${term} 최근 검색에서 삭제`}
                  onClick={() => saveRecent(recent.filter(r => r !== term))}
                  className="px-3 py-2 text-gray-300 hover:text-rose-500">
                  <FontAwesomeIcon icon={faXmark} className="text-xs" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {patients.length === 0 ? (
        <p className="text-sm text-gray-400">아직 연결된 환자가 없습니다. 설정에서 QR 코드를 안내해주세요.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400">&lsquo;{query.trim()}&rsquo;와 일치하는 환자가 없습니다.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          <div className="flex items-center gap-3 px-4 py-2 text-[11px] font-medium text-gray-400">
            <div className="flex-1">환자</div>
            <div className="w-12 text-center">7일</div>
            <div className="w-12 text-center">30일</div>
            <div className="w-20 text-right">다음 예약</div>
            <div className="w-20 text-right">최근 검사</div>
            <div className="w-4" />
          </div>
          {filtered.map(p => {
            const c = care[p.childId]
            const forDate = makeTreatmentsForDate(c?.treatments ?? [])
            const logs = c?.logs ?? {}
            const pct7  = c ? calcRecentCompliance(logs, forDate, 7)  : null
            const pct30 = c ? calcRecentCompliance(logs, forDate, 30) : null
            return (
              <Link key={p.childId} href={`/clinic/patients?child=${p.childId}`}
                onClick={() => addRecent(query)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{p.childName}</div>
                  {/* 아랫줄은 인적사항만 — 예약·검사 날짜는 각자 열로 나갔다 */}
                  <div className="text-xs text-gray-400">{patientMeta(p.birth, p.gender)}</div>
                </div>
                <div className={`w-12 text-center text-sm font-semibold ${pctClass(pct7)}`}>{pctText(pct7)}</div>
                <div className={`w-12 text-center text-sm font-semibold ${pctClass(pct30)}`}>{pctText(pct30)}</div>
                {/* 절대 날짜는 마우스를 올렸을 때 — 평소엔 "얼마나 남았나"만 읽으면 된다 */}
                <div className={`w-20 text-right text-xs ${dueClass(p.nextAppointment)}`}
                  title={p.nextAppointment ?? ''}>
                  {dueLabel(p.nextAppointment) || '-'}
                </div>
                <div className="w-20 text-right text-xs text-gray-400" title={p.lastExamDate ?? ''}>
                  {pastLabel(p.lastExamDate) || '-'}
                </div>
                <FontAwesomeIcon icon={faChevronRight} className="w-4 text-gray-300 text-xs" />
              </Link>
            )
          })}
        </div>
      )}

      <p className="mt-3 text-[11px] text-gray-400">
        7일·30일은 케어(아트로핀·드림렌즈 등) 순응도입니다. 케어가 등록되지 않은 환자는 —로 표시됩니다.
      </p>
    </div>
  )
}
