'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useHospital } from '@/context/HospitalContext'
import * as q from '@/lib/supabase/queries'
import { calcAgeLabel } from '@/lib/utils/date'
import { calcRecentCompliance } from '@/lib/utils/compliance'
import { makeTreatmentsForDate } from '@/lib/treatments'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons'

// 순응도 색: 낮을수록 눈에 띄게 — 원장이 훑어보며 놓친 환자를 찾는 화면이라 대비를 준다
function pctClass(pct: number | null) {
  if (pct === null) return 'text-gray-300'
  if (pct >= 80) return 'text-teal-600'
  if (pct >= 50) return 'text-amber-500'
  return 'text-rose-500'
}
const pctText = (pct: number | null) => (pct === null ? '—' : `${pct}%`)

export default function ClinicPatientsPage() {
  const { hospital, isLoading: hospitalLoading, error: hospitalError } = useHospital()
  const [patients, setPatients] = useState<q.RosterPatient[] | null>(null)
  const [care, setCare] = useState<Record<string, q.PatientCare>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hospital) return
    Promise.all([q.fetchPatientRoster(hospital.id), q.fetchPatientCare(hospital.id, 30)])
      .then(([roster, careMap]) => { setPatients(roster); setCare(careMap) })
      .catch(err => setError(err instanceof Error ? err.message : '조회에 실패했습니다'))
  }, [hospital])

  if (hospitalError) return <p className="text-sm text-rose-500">{hospitalError}</p>
  if (hospitalLoading || patients === null) {
    return <div className="animate-pulse text-sm text-gray-400">불러오는 중…</div>
  }
  if (error) return <p className="text-sm text-rose-500">{error}</p>

  return (
    <div>
      <h1 className="font-bold text-gray-800 mb-4">환자 목록 ({patients.length})</h1>
      {patients.length === 0 ? (
        <p className="text-sm text-gray-400">아직 연결된 환자가 없습니다. 설정에서 QR 코드를 안내해주세요.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          <div className="flex items-center gap-3 px-4 py-2 text-[11px] font-medium text-gray-400">
            <div className="flex-1">환자</div>
            <div className="w-12 text-center">7일</div>
            <div className="w-12 text-center">30일</div>
            <div className="w-24 text-right">최근 검사</div>
            <div className="w-4" />
          </div>
          {patients.map(p => {
            const c = care[p.childId]
            const forDate = makeTreatmentsForDate(c?.treatments ?? [])
            const logs = c?.logs ?? {}
            const pct7  = c ? calcRecentCompliance(logs, forDate, 7)  : null
            const pct30 = c ? calcRecentCompliance(logs, forDate, 30) : null
            return (
              <Link key={p.childId} href={`/clinic/patients/${p.childId}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{p.childName}</div>
                  <div className="text-xs text-gray-400">
                    {calcAgeLabel(p.birth)} · 다음 예약 {p.nextAppointment ?? '-'}
                  </div>
                </div>
                <div className={`w-12 text-center text-sm font-semibold ${pctClass(pct7)}`}>{pctText(pct7)}</div>
                <div className={`w-12 text-center text-sm font-semibold ${pctClass(pct30)}`}>{pctText(pct30)}</div>
                <div className="w-24 text-right text-xs text-gray-400">{p.lastExamDate ?? '-'}</div>
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
