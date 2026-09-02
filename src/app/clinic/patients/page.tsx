'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useHospital } from '@/context/HospitalContext'
import * as q from '@/lib/supabase/queries'
import { calcAgeLabel } from '@/lib/utils/date'
import { TrendView, PctView, GrowthRateCard } from '@/components/analytics/AxialTab'
import { ForecastView } from '@/components/analytics/ForecastCard'
import { makeTreatmentsForDate } from '@/lib/treatments'
import EmptyState from '@/components/ui/EmptyState'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMagnifyingGlass, faXmark, faHospital, faChartLine, faListUl,
} from '@fortawesome/free-solid-svg-icons'

// 최근 검색은 {이름, id} 쌍으로 저장 — 클릭 한 번에 바로 그 환자로 점프하기 위해서(진료 중 클릭 최소화가 목적)
const RECENT_KEY = 'mn_clinic_recent_patient_jump'
const RECENT_MAX = 8

interface RecentEntry { childId: string; childName: string }

const fmt2 = (v: number | null) => (v == null ? '—' : v.toFixed(2))
const fmtDelta = (cur: number | null, prev: number | null) =>
  cur == null || prev == null ? '' : `${cur - prev > 0 ? '+' : ''}${(cur - prev).toFixed(2)}`

export default function ClinicPatientsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse text-sm text-gray-400">불러오는 중…</div>}>
      <ClinicPatientsPageInner />
    </Suspense>
  )
}

function ClinicPatientsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const childId = searchParams.get('child')

  const { hospital, isLoading: hospitalLoading, error: hospitalError } = useHospital()
  const [roster, setRoster] = useState<q.RosterPatient[] | null>(null)
  const [rosterError, setRosterError] = useState('')

  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<RecentEntry[]>([])
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 선택된 환자와 함께 담아둔다 — 다른 환자로 바꿨을 때 이전 환자 데이터가 잠깐 비치는 걸 막는다
  const [detail, setDetail] = useState<{ childId: string; data: q.PatientDetail } | null>(null)
  const [detailError, setDetailError] = useState<{ childId: string; message: string } | null>(null)

  // 검색용 인덱스는 미리 받아두되, 검색어를 입력하기 전에는 화면에 아무것도 그리지 않는다
  // (원장이 환자와 같이 화면을 보고 있어도 다른 환자 정보가 노출되지 않게)
  useEffect(() => {
    if (!hospital) return
    q.fetchPatientRoster(hospital.id).then(setRoster)
      .catch(err => setRosterError(err instanceof Error ? err.message : '조회에 실패했습니다'))
  }, [hospital])

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
      if (Array.isArray(saved)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 저장소에서 마운트 시 1회 복원
        setRecent(saved.filter((v): v is RecentEntry => typeof v?.childId === 'string' && typeof v?.childName === 'string'))
      }
    } catch { /* 저장소를 못 쓰면 최근검색만 없는 상태로 동작 */ }
  }, [])

  useEffect(() => {
    if (!hospital || !childId) return
    q.fetchPatientDetail(hospital.id, childId)
      .then(data => setDetail({ childId, data }))
      .catch(err => setDetailError({ childId, message: err instanceof Error ? err.message : '조회에 실패했습니다' }))
  }, [hospital, childId])

  const saveRecent = (list: RecentEntry[]) => {
    setRecent(list)
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)) } catch { /* 저장 실패해도 이동은 동작 */ }
  }

  const selectPatient = (p: RecentEntry) => {
    saveRecent([p, ...recent.filter(r => r.childId !== p.childId)].slice(0, RECENT_MAX))
    setQuery('')
    setFocused(false)
    inputRef.current?.blur()
    router.push(`/clinic/patients?child=${p.childId}`)
  }

  if (hospitalError) return <p className="text-sm text-rose-500">{hospitalError}</p>
  if (hospitalLoading || roster === null) {
    return <div className="animate-pulse text-sm text-gray-400">불러오는 중…</div>
  }
  if (rosterError) return <p className="text-sm text-rose-500">{rosterError}</p>

  const keyword = query.trim().toLowerCase()
  const matches = keyword ? roster.filter(p => p.childName.toLowerCase().includes(keyword)).slice(0, 8) : []
  const showRecent = focused && !keyword && recent.length > 0
  const showDropdown = focused && (keyword ? matches.length > 0 : showRecent)

  // 지금 선택된 환자의 것일 때만 화면에 쓴다 — 환자를 바꾸는 순간 이전 데이터는 자동으로 사라진다
  const shownDetail = detail?.childId === childId ? detail.data : null
  const shownError = detailError?.childId === childId ? detailError.message : ''

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-gray-800">환자 검색</h1>
        <Link href="/clinic/patients/all"
          className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1">
          <FontAwesomeIcon icon={faListUl} className="text-[10px]" /> 전체 목록
        </Link>
      </div>

      {/* 넓은 화면에서 검색창까지 늘어나면 허전해 보인다 — 입력 폭만 따로 제한 */}
      <div className="relative max-w-md">
        <FontAwesomeIcon icon={faMagnifyingGlass}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-300" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 100)}
          onKeyDown={e => {
            if (e.key === 'Enter' && matches.length > 0) selectPatient({ childId: matches[0].childId, childName: matches[0].childName })
            if (e.key === 'Escape') { setQuery(''); setFocused(false); inputRef.current?.blur() }
          }}
          placeholder="환자 이름으로 검색"
          className="w-full h-11 bg-white border border-gray-200 rounded-xl pl-9 pr-9 text-sm
                     focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus() }} aria-label="검색어 지우기"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full
                       text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <FontAwesomeIcon icon={faXmark} className="text-xs" />
          </button>
        )}

        {showDropdown && (
          <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-100
                       rounded-xl shadow-lg overflow-hidden">
            {keyword ? (
              matches.map(p => (
                <button key={p.childId} type="button"
                  onClick={() => selectPatient({ childId: p.childId, childName: p.childName })}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50">
                  <span className="text-sm text-gray-700">{p.childName}</span>
                  <span className="text-xs text-gray-400">{calcAgeLabel(p.birth)}</span>
                </button>
              ))
            ) : (
              <>
                <div className="px-3 py-2 text-[11px] font-medium text-gray-400 border-b border-gray-50">최근 검색</div>
                {recent.map(r => (
                  <button key={r.childId} type="button" onClick={() => selectPatient(r)}
                    className="w-full flex items-center px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 truncate">
                    {r.childName}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <PatientPanel childId={childId} detail={shownDetail} error={shownError} />
    </div>
  )
}

function PatientPanel({
  childId, detail, error,
}: { childId: string | null; detail: q.PatientDetail | null; error: string }) {
  if (!childId) {
    return (
      <div className="bg-white rounded-2xl p-10 shadow-sm text-center" style={{ minHeight: 260 }}>
        <FontAwesomeIcon icon={faChartLine} className="text-gray-200 text-3xl mb-3" />
        <p className="text-sm text-gray-400">환자를 검색해서 선택하면 여기에 검사 그래프가 표시됩니다.</p>
      </div>
    )
  }
  if (error) return <p className="text-sm text-rose-500">{error}</p>
  if (!detail) {
    return (
      <div className="bg-white rounded-2xl p-10 shadow-sm text-center animate-pulse" style={{ minHeight: 260 }}>
        <p className="text-sm text-gray-400">불러오는 중…</p>
      </div>
    )
  }

  const chartExams = [...detail.exams]
    .filter(e => e.axOD != null || e.axOS != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => ({ date: e.date, axOD: e.axOD != null ? String(e.axOD) : '', axOS: e.axOS != null ? String(e.axOS) : '' }))

  // exams는 최신순 — 가장 최근 검사에 적힌 다음 예약일이 현재 유효한 예약
  const nextAppointment = detail.exams.find(e => e.nextAppointment)?.nextAppointment ?? null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-bold text-lg text-gray-800">{detail.childName}</h2>
        <p className="text-xs text-gray-400">
          {calcAgeLabel(detail.birth)} · 다음 예약 {nextAppointment ?? '-'}
        </p>
      </div>

      {/* 열별 스택 — 그리드로 묶으면 카드 높이가 서로 끌려가 빈칸이 생긴다 */}
      <div className="flex flex-col xl:flex-row gap-4 items-start">
        <div className="flex-1 min-w-0 w-full space-y-4">
          {chartExams.length < 2 ? (
            <EmptyState message="안축장 기록이 2개 이상 있어야 추세를 볼 수 있습니다." />
          ) : (
            <>
              <TrendView exams={chartExams} hideGrowth />
              <GrowthRateCard exams={chartExams} />
            </>
          )}

        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-2">검사 이력 ({detail.exams.length})</h3>
          {detail.exams.length === 0 ? (
            <p className="text-sm text-gray-400">아직 검사기록이 없습니다.</p>
          ) : (
            // 기록이 쌓여도 페이지가 길어지지 않게 표 안에서만 스크롤한다
            <div className="overflow-auto" style={{ maxHeight: 320 }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-[11px] text-gray-400 border-b border-gray-50">
                    <th className="text-left font-medium px-3 py-2">검사일</th>
                    <th className="text-right font-medium px-3 py-2">안축장 OD</th>
                    <th className="text-right font-medium px-3 py-2">안축장 OS</th>
                    <th className="text-right font-medium px-3 py-2">SEQ OD</th>
                    <th className="text-right font-medium px-3 py-2">SEQ OS</th>
                    <th className="text-left font-medium px-3 py-2">병원</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {detail.exams.map((e, i) => {
                    const prev = detail.exams[i + 1]
                    return (
                      <tr key={e.id}>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-700">{e.date}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {fmt2(e.axOD)}
                          <span className="ml-1 text-[11px] text-gray-400">{fmtDelta(e.axOD, prev?.axOD ?? null)}</span>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {fmt2(e.axOS)}
                          <span className="ml-1 text-[11px] text-gray-400">{fmtDelta(e.axOS, prev?.axOS ?? null)}</span>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">{fmt2(e.serOD)}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{fmt2(e.serOS)}</td>
                        <td className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap">
                          {e.byUs && <FontAwesomeIcon icon={faHospital} className="mr-1 text-teal-500" />}
                          {e.clinic || '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-[11px] text-gray-400">
            <FontAwesomeIcon icon={faHospital} className="mr-1 text-teal-500" />
            표시는 우리 병원에서 입력된 검사입니다. 여기서는 수정할 수 없습니다.
          </p>
        </section>
        </div>

        <div className="flex-1 min-w-0 w-full space-y-4">
          {chartExams.length >= 1 ? (
            <PctView exams={chartExams} birth={detail.birth} />
          ) : (
            <EmptyState message="안축장 기록이 있어야 또래 비교를 볼 수 있습니다." />
          )}
          {chartExams.length >= 2 && (
            <ForecastView
              birth={detail.birth}
              exams={chartExams}
              activeTreatments={makeTreatmentsForDate(detail.treatments)(new Date().toISOString().slice(0, 10))}
            />
          )}
        </div>
      </div>
    </div>
  )
}
