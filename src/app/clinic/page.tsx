'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useHospital } from '@/context/HospitalContext'
import * as q from '@/lib/supabase/queries'
import { errMessage } from '@/lib/utils/error'
import { calcAgeLabel } from '@/lib/utils/date'
import { axialGrowth } from '@/lib/axialGrowth'
import { makeTreatmentsForDate } from '@/lib/treatments'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend,
} from 'chart.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUserGroup, faUserPlus, faFileMedical, faTriangleExclamation,
  faUserSlash, faCalendarDay, faChevronRight, faArrowUp, faArrowDown,
} from '@fortawesome/free-solid-svg-icons'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

// 진행 위험도 구간 — 연간 성장률 카드(GrowthRateCard)와 같은 기준을 쓴다
const RISK = {
  stable: { label: '안정', color: '#14b8a6' },
  watch:  { label: '주의', color: '#f59e0b' },
  fast:   { label: '진행', color: '#f43f5e' },
  none:   { label: '판정 불가', color: '#e5e7eb' },
} as const
type RiskKey = keyof typeof RISK

function riskOf(rate: number | null): RiskKey {
  if (rate === null) return 'none'
  return Math.abs(rate) < 0.2 ? 'stable' : Math.abs(rate) < 0.35 ? 'watch' : 'fast'
}

// 두 눈 중 더 빠른 쪽을 그 환자의 진행 속도로 본다(더 위험한 쪽 기준)
function fasterRate(p: q.PatientSummary): number | null {
  const pick = (get: (e: q.PatientSummary['exams'][number]) => number | null) =>
    axialGrowth(p.exams.map(e => ({ date: e.date, value: get(e) ?? NaN })).filter(x => Number.isFinite(x.value)))
  const od = pick(e => e.axOD)
  const os = pick(e => e.axOS)
  if (!od && !os) return null
  return Math.max(od?.ratePerYear ?? -Infinity, os?.ratePerYear ?? -Infinity)
}

function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-800 text-sm">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

function KpiCard({
  icon, label, value, prev, tone = 'teal',
}: { icon: typeof faUserGroup; label: string; value: number; prev?: number; tone?: 'teal' | 'amber' | 'gray' }) {
  const diff = prev === undefined ? null : value - prev
  const iconCls = tone === 'amber' ? 'text-amber-500' : tone === 'gray' ? 'text-gray-400' : 'text-teal-500'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-1">
        <FontAwesomeIcon icon={icon} className={iconCls} />
        {label}
      </div>
      <div className="text-2xl font-bold text-gray-800 leading-tight">{value}</div>
      {diff !== null && (
        <div className={`text-[11px] mt-0.5 ${diff > 0 ? 'text-teal-600' : diff < 0 ? 'text-rose-500' : 'text-gray-400'}`}>
          {diff !== 0 && <FontAwesomeIcon icon={diff > 0 ? faArrowUp : faArrowDown} className="mr-1 text-[9px]" />}
          지난달 {prev} → {diff > 0 ? `+${diff}` : diff === 0 ? '변화 없음' : diff}
        </div>
      )}
    </div>
  )
}

export default function ClinicDashboardPage() {
  const { hospital, isLoading: hospitalLoading, error: hospitalError } = useHospital()
  const [stats, setStats] = useState<q.HomeStats | null>(null)
  const [roster, setRoster] = useState<q.RosterPatient[] | null>(null)
  const [overdue, setOverdue] = useState<q.OverduePatient[]>([])
  const [monthly, setMonthly] = useState<q.MonthlyStat[]>([])
  const [summaries, setSummaries] = useState<q.PatientSummary[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hospital) return
    Promise.all([
      q.fetchHomeStats(hospital.id),
      q.fetchPatientRoster(hospital.id),
      q.fetchOverduePatients(hospital.id),
      q.fetchMonthlyStats(hospital.id, 12),
      q.fetchPatientSummaries(hospital.id),
    ])
      .then(([s, r, o, m, ps]) => { setStats(s); setRoster(r); setOverdue(o); setMonthly(m); setSummaries(ps) })
      .catch(err => setError(errMessage(err)))
  }, [hospital])

  if (hospitalError) return <p className="text-sm text-rose-500">{hospitalError}</p>
  if (error) return <p className="text-sm text-rose-500">{error}</p>
  if (hospitalLoading || stats === null || roster === null) {
    return <div className="animate-pulse text-sm text-gray-400">불러오는 중…</div>
  }

  const today = new Date().toISOString().slice(0, 10)
  const todayVisits = roster.filter(p => p.nextAppointment === today)
  const overdueCount = overdue.filter(p => p.status === 'overdue').length
  const churnedCount = overdue.filter(p => p.status === 'churned').length

  // ── 진행 위험도 분포 ──────────────────────────────────────────
  const rated = summaries.map(p => ({ p, rate: fasterRate(p) }))
  const riskCount: Record<RiskKey, number> = { stable: 0, watch: 0, fast: 0, none: 0 }
  rated.forEach(r => { riskCount[riskOf(r.rate)]++ })
  const fastest = rated
    .filter(r => r.rate !== null && riskOf(r.rate) !== 'stable')
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))
    .slice(0, 5)

  // ── 치료별 환자 분포 (오늘 기준 진행 중인 케어) ────────────────
  const careCount = new Map<string, number>()
  summaries.forEach(p => {
    makeTreatmentsForDate(p.treatments)(today).forEach(t => {
      careCount.set(t.name, (careCount.get(t.name) ?? 0) + 1)
    })
  })
  const careRows = [...careCount.entries()].sort((a, b) => b[1] - a[1])
  const careMax = careRows[0]?.[1] ?? 1

  const monthLabels = monthly.map(m => m.month.slice(2).replace('-', '.'))
  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } }, grid: { color: '#F3F4F6' } },
    },
  } as const

  return (
    <div className="space-y-4">
      <h1 className="font-bold text-lg text-gray-800">대시보드</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard icon={faUserGroup} label="총 환자" value={stats.totalPatients} />
        <KpiCard icon={faUserPlus} label="이번달 신규 연결" value={stats.newThisMonth} prev={stats.newLastMonth} />
        <KpiCard icon={faFileMedical} label="이번달 검사 입력" value={stats.examsThisMonth} prev={stats.examsLastMonth} />
        <KpiCard icon={faTriangleExclamation} label="재방문 필요" value={overdueCount} tone="amber" />
        <KpiCard icon={faUserSlash} label="이탈됨" value={churnedCount} tone="gray" />
      </div>

      {/* 카드 높이가 서로 안 묶이도록 그리드 대신 열별 스택을 쓴다 */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className="flex-1 min-w-0 w-full space-y-4">
          <Card title="진행 위험도 분포" right={<span className="text-[11px] text-gray-400">최근 1년 성장률 기준</span>}>
            {summaries.length === 0 ? (
              <p className="text-sm text-gray-400">아직 연결된 환자가 없습니다.</p>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div style={{ width: 160, height: 160 }} className="shrink-0">
                  <Doughnut
                    data={{
                      labels: (Object.keys(RISK) as RiskKey[]).map(k => RISK[k].label),
                      datasets: [{
                        data: (Object.keys(RISK) as RiskKey[]).map(k => riskCount[k]),
                        backgroundColor: (Object.keys(RISK) as RiskKey[]).map(k => RISK[k].color),
                        borderWidth: 0,
                      }],
                    }}
                    options={{ responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { display: false } } }}
                  />
                </div>
                <div className="flex-1 min-w-0 w-full space-y-1.5">
                  {(Object.keys(RISK) as RiskKey[]).map(k => (
                    <div key={k} className="flex items-center gap-2 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: RISK[k].color }} />
                      <span className="text-gray-600 flex-1">{RISK[k].label}</span>
                      <span className="font-semibold text-gray-800">{riskCount[k]}명</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {fastest.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-50">
                <div className="text-[11px] font-medium text-gray-400 mb-1">진행이 빠른 환자</div>
                {fastest.map(({ p, rate }) => (
                  <Link key={p.childId} href={`/clinic/patients?child=${p.childId}`}
                    className="flex items-center justify-between py-1.5 hover:bg-gray-50 rounded px-1 -mx-1">
                    <span className="text-sm text-gray-700">{p.childName}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: RISK[riskOf(rate)].color }}>
                        +{(rate ?? 0).toFixed(2)} mm/yr
                      </span>
                      <FontAwesomeIcon icon={faChevronRight} className="text-gray-300 text-[10px]" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card title="월별 검사 입력" right={<span className="text-[11px] text-gray-400">최근 12개월</span>}>
            <div style={{ height: 200 }}>
              <Bar
                data={{
                  labels: monthLabels,
                  datasets: [{ data: monthly.map(m => m.exams), backgroundColor: '#14b8a6', borderRadius: 4, maxBarThickness: 28 }],
                }}
                options={chartOpts}
              />
            </div>
          </Card>
        </div>

        <div className="flex-1 min-w-0 w-full space-y-4">
          <Card title={`오늘 방문 예정 (${todayVisits.length})`} right={<FontAwesomeIcon icon={faCalendarDay} className="text-teal-500 text-xs" />}>
            {todayVisits.length === 0 ? (
              <p className="text-sm text-gray-400">오늘 예약된 환자가 없습니다.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {todayVisits.map(p => (
                  <Link key={p.childId} href={`/clinic/patients?child=${p.childId}`}
                    className="flex items-center justify-between py-2.5 hover:bg-gray-50 rounded px-1 -mx-1">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{p.childName}</div>
                      <div className="text-xs text-gray-400">{calcAgeLabel(p.birth)}</div>
                    </div>
                    <FontAwesomeIcon icon={faChevronRight} className="text-gray-300 text-xs" />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card title="신규 연결 · 이탈" right={<span className="text-[11px] text-gray-400">최근 12개월</span>}>
            <div style={{ height: 200 }}>
              <Bar
                data={{
                  labels: monthLabels,
                  datasets: [
                    { label: '신규 연결', data: monthly.map(m => m.connected), backgroundColor: '#14b8a6', borderRadius: 4, maxBarThickness: 14 },
                    { label: '이탈', data: monthly.map(m => m.churned), backgroundColor: '#f43f5e', borderRadius: 4, maxBarThickness: 14 },
                  ],
                }}
                options={{ ...chartOpts, plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } }}
              />
            </div>
          </Card>

          <Card title="치료별 환자 분포" right={<span className="text-[11px] text-gray-400">오늘 진행 중인 케어</span>}>
            {careRows.length === 0 ? (
              <p className="text-sm text-gray-400">등록된 케어가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {careRows.map(([name, count]) => (
                  <div key={name}>
                    <div className="flex items-center justify-between text-sm mb-0.5">
                      <span className="text-gray-600 truncate">{name}</span>
                      <span className="font-semibold text-gray-800">{count}명</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(count / careMax) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
