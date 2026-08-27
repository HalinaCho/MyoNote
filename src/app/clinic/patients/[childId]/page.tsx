'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useHospital } from '@/context/HospitalContext'
import * as q from '@/lib/supabase/queries'
import { calcAgeLabel } from '@/lib/utils/date'
import { calcRecentCompliance } from '@/lib/utils/compliance'
import { makeTreatmentsForDate } from '@/lib/treatments'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faHospital } from '@fortawesome/free-solid-svg-icons'

const fmt2 = (v: number | null) => (v == null ? '—' : v.toFixed(2))
// 안축장 변화량(mm) — 직전 검사 대비. 근시 진행 속도가 이 화면의 핵심 지표.
const fmtDelta = (cur: number | null, prev: number | null) =>
  cur == null || prev == null ? '' : `${cur - prev > 0 ? '+' : ''}${(cur - prev).toFixed(2)}`

function ComplianceBox({ label, pct }: { label: string; pct: number | null }) {
  const color = pct === null ? 'text-gray-300' : pct >= 80 ? 'text-teal-600' : pct >= 50 ? 'text-amber-500' : 'text-rose-500'
  return (
    <div className="flex-1 bg-white rounded-xl border border-gray-100 px-4 py-3 text-center">
      <div className="text-[11px] text-gray-400 mb-0.5">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{pct === null ? '—' : `${pct}%`}</div>
    </div>
  )
}

export default function ClinicPatientDetailPage() {
  const { childId } = useParams<{ childId: string }>()
  const { hospital, isLoading: hospitalLoading, error: hospitalError } = useHospital()
  const [detail, setDetail] = useState<q.PatientDetail | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hospital || !childId) return
    q.fetchPatientDetail(hospital.id, childId)
      .then(setDetail)
      .catch(err => setError(err instanceof Error ? err.message : '조회에 실패했습니다'))
  }, [hospital, childId])

  if (hospitalError) return <p className="text-sm text-rose-500">{hospitalError}</p>
  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-rose-500">{error}</p>
        <Link href="/clinic/patients" className="text-sm text-teal-600">← 환자 목록으로</Link>
      </div>
    )
  }
  if (hospitalLoading || detail === null) {
    return <div className="animate-pulse text-sm text-gray-400">불러오는 중…</div>
  }

  const forDate = makeTreatmentsForDate(detail.treatments)
  const pct7  = calcRecentCompliance(detail.logs, forDate, 7)
  const pct30 = calcRecentCompliance(detail.logs, forDate, 30)
  const activeCare = forDate(new Date().toISOString().slice(0, 10))
  // exams는 최신순 → 직전 검사는 배열의 다음 항목
  const nextAppointment = detail.exams.find(e => e.nextAppointment)?.nextAppointment ?? null

  return (
    <div className="space-y-5">
      <div>
        <Link href="/clinic/patients" className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1">
          <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" /> 환자 목록
        </Link>
        <h1 className="mt-1 font-bold text-lg text-gray-800">{detail.childName}</h1>
        <p className="text-xs text-gray-400">
          {calcAgeLabel(detail.birth)} · 다음 예약 {nextAppointment ?? '-'}
        </p>
      </div>

      <section>
        <div className="flex gap-2">
          <ComplianceBox label="최근 7일 순응도" pct={pct7} />
          <ComplianceBox label="최근 30일 순응도" pct={pct30} />
        </div>
        <p className="mt-2 text-[11px] text-gray-400">
          진행 중인 케어: {activeCare.length ? activeCare.map(t => t.name).join(', ') : '없음'}
        </p>
      </section>

      <section>
        <h2 className="font-bold text-gray-800 mb-2 text-sm">검사 이력 ({detail.exams.length})</h2>
        {detail.exams.length === 0 ? (
          <p className="text-sm text-gray-400">아직 검사기록이 없습니다.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
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
          표시는 우리 병원에서 입력된 검사입니다. 조회 전용 화면이라 여기서는 수정할 수 없습니다.
        </p>
      </section>
    </div>
  )
}
