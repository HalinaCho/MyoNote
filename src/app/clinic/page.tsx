'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useHospital } from '@/context/HospitalContext'
import * as q from '@/lib/supabase/queries'
import { calcAgeLabel } from '@/lib/utils/date'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUserGroup, faUserPlus, faFileMedical, faCalendarDay, faChevronRight } from '@fortawesome/free-solid-svg-icons'

function StatCard({ icon, label, value }: { icon: typeof faUserGroup; label: string; value: number }) {
  return (
    <div className="flex-1 bg-white rounded-xl border border-gray-100 px-3 py-3 text-center">
      <FontAwesomeIcon icon={icon} className="text-teal-500 text-sm mb-1" />
      <div className="text-xl font-bold text-gray-800">{value}</div>
      <div className="text-[11px] text-gray-400">{label}</div>
    </div>
  )
}

export default function ClinicHomePage() {
  const { hospital, isLoading: hospitalLoading, error: hospitalError } = useHospital()
  const [stats, setStats] = useState<q.HomeStats | null>(null)
  const [patients, setPatients] = useState<q.RosterPatient[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hospital) return
    Promise.all([q.fetchHomeStats(hospital.id), q.fetchPatientRoster(hospital.id)])
      .then(([s, roster]) => { setStats(s); setPatients(roster) })
      .catch(err => setError(err instanceof Error ? err.message : '조회에 실패했습니다'))
  }, [hospital])

  if (hospitalError) return <p className="text-sm text-rose-500">{hospitalError}</p>
  if (hospitalLoading || stats === null || patients === null) {
    return <div className="animate-pulse text-sm text-gray-400">불러오는 중…</div>
  }
  if (error) return <p className="text-sm text-rose-500">{error}</p>

  const today = new Date().toISOString().slice(0, 10)
  const todayVisits = patients.filter(p => p.nextAppointment === today)

  return (
    <div className="space-y-6">
      <section className="flex gap-2">
        <StatCard icon={faUserGroup} label="총 환자" value={stats.totalPatients} />
        <StatCard icon={faUserPlus} label="이번달 신규 연결" value={stats.newThisMonth} />
        <StatCard icon={faFileMedical} label="이번달 검사 입력" value={stats.examsThisMonth} />
      </section>

      <section>
        <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <FontAwesomeIcon icon={faCalendarDay} className="text-teal-500" />
          오늘 방문 예정 ({todayVisits.length})
        </h2>
        {todayVisits.length === 0 ? (
          <p className="text-sm text-gray-400">오늘 예약된 환자가 없습니다.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {todayVisits.map(p => (
              <Link key={p.childId} href={`/clinic/patients?child=${p.childId}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                <div>
                  <div className="text-sm font-medium text-gray-800">{p.childName}</div>
                  <div className="text-xs text-gray-400">{calcAgeLabel(p.birth)}</div>
                </div>
                <FontAwesomeIcon icon={faChevronRight} className="text-gray-300 text-xs" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
