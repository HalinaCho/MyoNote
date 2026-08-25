'use client'

import { useEffect, useState } from 'react'
import { useHospital } from '@/context/HospitalContext'
import * as q from '@/lib/supabase/queries'
import { calcAgeLabel } from '@/lib/utils/date'

export default function ClinicPatientsPage() {
  const { hospital, isLoading: hospitalLoading, error: hospitalError } = useHospital()
  const [patients, setPatients] = useState<q.RosterPatient[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hospital) return
    q.fetchPatientRoster(hospital.id)
      .then(setPatients)
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
          {patients.map(p => (
            <div key={p.childId} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-medium text-gray-800">{p.childName}</div>
                <div className="text-xs text-gray-400">{calcAgeLabel(p.birth)}</div>
              </div>
              <div className="text-right text-xs text-gray-400">
                <div>최근 검사 {p.lastExamDate ?? '-'}</div>
                <div>다음 예약 {p.nextAppointment ?? '-'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
