'use client'

import { useEffect, useState } from 'react'
import { useHospital } from '@/context/HospitalContext'
import * as q from '@/lib/supabase/queries'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation, faUserSlash } from '@fortawesome/free-solid-svg-icons'

export default function ClinicHomePage() {
  const { hospital, isLoading: hospitalLoading, error: hospitalError } = useHospital()
  const [patients, setPatients] = useState<q.OverduePatient[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hospital) return
    q.fetchOverduePatients(hospital.id)
      .then(setPatients)
      .catch(err => setError(err instanceof Error ? err.message : '조회에 실패했습니다'))
  }, [hospital])

  if (hospitalError) return <p className="text-sm text-rose-500">{hospitalError}</p>
  if (hospitalLoading || patients === null) {
    return <div className="animate-pulse text-sm text-gray-400">불러오는 중…</div>
  }
  if (error) return <p className="text-sm text-rose-500">{error}</p>

  const overdue = patients.filter(p => p.status === 'overdue')
  const churned = patients.filter(p => p.status === 'churned')

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500" />
          재방문 필요 ({overdue.length})
        </h2>
        {overdue.length === 0 ? (
          <p className="text-sm text-gray-400">예약일이 지났는데 재방문하지 않은 환자가 없습니다.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {overdue.map(p => (
              <div key={p.childId} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium text-gray-800">{p.childName}</span>
                <span className="text-sm text-rose-500 font-semibold">
                  {p.nextAppointment} · D+{p.daysOverdue}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <FontAwesomeIcon icon={faUserSlash} className="text-gray-400" />
          이탈됨 ({churned.length})
        </h2>
        {churned.length === 0 ? (
          <p className="text-sm text-gray-400">최근 6개월 내 이탈한 환자가 없습니다.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {churned.map(p => (
              <div key={p.childId} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium text-gray-800">{p.childName}</span>
                <span className="text-xs text-gray-400">{p.churnedAt} 연결 종료</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
