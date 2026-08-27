'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useChild } from '@/context/ChildContext'
import TabSkeleton from '@/components/ui/TabSkeleton'
import DayDetailSheet from '@/components/care/DayDetailSheet'
import { today, formatDate } from '@/lib/utils/date'
import { getDayStatus, calcStreak, calcMonthCompliance } from '@/lib/utils/compliance'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faXmark, faTree, faMobileScreen, faCheck, faMinus, faFire,
  faCalendarDays, faChartSimple, faChevronRight,
} from '@fortawesome/free-solid-svg-icons'
import { faCircle } from '@fortawesome/free-regular-svg-icons'

// 케어 탭 첫 화면 = "오늘 할 일"만. 스크롤 없이 끝나는 게 목표다.
// 월간 캘린더는 /calendar/month, 통계는 /calendar/stats 로 한 단계 들어간다.

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']

function fmtTime(h: number) {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins > 0 ? `${hrs}시간 ${mins}분` : `${hrs}시간`
}

export default function CarePage() {
  const { activeChild, activeTreatments, logs, lifestyle, treatmentsForDate, isLoading, saveTreatmentLog } = useChild()
  const [daySheet, setDaySheet] = useState<string | null>(null)

  const todayStr = today()
  const todayLog  = logs[todayStr] || {}
  const todayLife = lifestyle[todayStr]
  const streak    = calcStreak(logs, treatmentsForDate)
  const monthPct  = calcMonthCompliance(logs, treatmentsForDate, new Date().getFullYear(), new Date().getMonth())
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const ds = formatDate(d)
    return { d, ds, status: getDayStatus(logs, treatmentsForDate, ds) }
  })

  const toggleTodayTreatment = async (key: string) => {
    const newVal = !todayLog[key]
    try {
      await saveTreatmentLog(todayStr, { ...todayLog, [key]: newVal })
      toast.success(newVal ? '케어 완료로 표시했습니다' : '완료 취소했습니다')
    } catch { toast.error('저장에 실패했습니다') }
  }

  if (isLoading) return <TabSkeleton />

  return (
    <>
      {/* ── 요약: 연속 달성 · 이번 달 · 이번 주 스트립 ── */}
      <section className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800">오늘의 케어</h2>
          <Link href="/dashboard/calendar/month" aria-label="월간 캘린더 보기"
            className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-teal-600 px-2 py-1 rounded-lg hover:bg-gray-50">
            <FontAwesomeIcon icon={faCalendarDays} className="text-base" />
            캘린더
          </Link>
        </div>

        {activeTreatments.length > 0 && (
          <>
            <div className="flex justify-around mb-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${streak >= 7 ? 'text-teal-500' : 'text-gray-800'}`}>
                  {streak}일
                </div>
                <div className="text-xs text-gray-400 mt-0.5 flex items-center justify-center gap-1">
                  <FontAwesomeIcon icon={faFire} className="text-amber-400" /> 연속 달성
                </div>
              </div>
              <div className="w-px bg-gray-100" />
              <div className="text-center">
                <div className={`text-2xl font-bold ${monthPct >= 90 ? 'text-teal-500' : monthPct >= 70 ? 'text-amber-500' : 'text-gray-800'}`}>
                  {monthPct}%
                </div>
                <div className="text-xs text-gray-400 mt-0.5">이번 달</div>
              </div>
            </div>

            {/* 주간 스트립 — 날짜를 누르면 그 날 기록 시트가 열림 */}
            <div className="flex gap-1">
              {weekDays.map(({ d, ds, status }) => {
                const isToday = ds === todayStr
                const dotBg =
                  status === 'done'    ? 'bg-teal-500' :
                  status === 'partial' ? 'bg-[#fde68a]' :
                  status === 'missed'  ? 'bg-[#fda4af]' : 'bg-gray-100'
                return (
                  <button key={ds} onClick={() => setDaySheet(ds)}
                    className="flex-1 flex flex-col items-center gap-1 active:scale-95 transition-transform">
                    <span className="text-xs text-gray-400">{DAY_KO[d.getDay()]}</span>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${dotBg}
                      ${isToday ? 'ring-2 ring-teal-500 ring-offset-1' : ''}`}>
                      {status === 'done'    ? <FontAwesomeIcon icon={faCheck}  className="text-white text-xs" />
                      : status === 'partial' ? <FontAwesomeIcon icon={faMinus}  className="text-amber-700 text-xs" />
                      : status === 'missed'  ? <FontAwesomeIcon icon={faXmark}  className="text-rose-500 text-xs" />
                      : null}
                    </div>
                    <span className={`text-xs ${isToday ? 'font-bold text-teal-500' : 'text-gray-500'}`}>
                      {d.getDate()}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </section>

      {/* ── 오늘의 근시케어 ── */}
      <section className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800">오늘의 근시케어</h2>
          <span className="text-xs text-gray-400">
            {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
        </div>

        {activeTreatments.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">설정에서 자녀의 케어 항목을 등록해주세요.</p>
        ) : (
          <div className="space-y-2">
            {activeTreatments.map(t => {
              const done = !!todayLog[t.key]
              return (
                <button key={t.key} onClick={() => toggleTodayTreatment(t.key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left
                    ${done ? 'border-teal-500/30 bg-teal-50' : 'border-gray-100 bg-gray-50/60 hover:border-teal-100'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0
                    ${done ? 'bg-teal-500 text-white' : 'bg-white border-2 border-gray-200 text-gray-300'}`}>
                    <FontAwesomeIcon icon={done ? faCheck : faCircle} />
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-semibold ${done ? 'text-gray-800' : 'text-gray-600'}`}>{t.name}</div>
                    {t.schedule && <div className="text-xs text-gray-400">{t.schedule}</div>}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
                    ${done ? 'bg-teal-500/15 text-teal-700' : 'bg-gray-100 text-gray-400'}`}>
                    {done ? '완료' : '미완료'}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* ── 오늘의 생활습관 ── */}
      <section className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-3">오늘의 생활습관</h2>
        <div className="space-y-2">
          {[
            {
              icon: faMobileScreen, label: '스마트폰',
              value: todayLife?.phone ?? null,
              goal: activeChild?.phoneGoal ?? 2,
              isOverBad: true,
              badgeGood: '목표이하', badgeBad: '초과',
              badBg:       'border-rose-200/50 bg-rose-50',
              badIconCls:  'bg-rose-100 text-rose-400',
              badBadgeCls: 'bg-rose-100 text-rose-500',
            },
            {
              icon: faTree, label: '야외활동',
              value: todayLife?.outdoor ?? null,
              goal: activeChild?.outdoorGoal ?? 2,
              isOverBad: false,
              badgeGood: '달성',   badgeBad: '미달성',
              badBg:       'border-amber-200/50 bg-amber-50',
              badIconCls:  'bg-amber-100 text-amber-500',
              badBadgeCls: 'bg-amber-100 text-amber-700',
            },
          ].map(item => {
            const hasData = item.value !== null
            const good = hasData && (item.isOverBad ? item.value! <= item.goal : item.value! >= item.goal)
            return (
              <button
                key={item.label}
                onClick={() => setDaySheet(todayStr)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left
                  ${!hasData
                    ? 'border-gray-100 bg-gray-50/60 hover:border-teal-100'
                    : good
                      ? 'border-teal-500/30 bg-teal-50'
                      : item.badBg}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0
                  ${!hasData
                    ? 'bg-white border-2 border-gray-200 text-gray-300'
                    : good
                      ? 'bg-teal-100 text-teal-500'
                      : item.badIconCls}`}>
                  <FontAwesomeIcon icon={item.icon} />
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-semibold ${hasData ? 'text-gray-800' : 'text-gray-600'}`}>
                    {item.label}
                  </div>
                  <div className="text-xs text-gray-400">
                    {hasData ? fmtTime(item.value!) : '기록 없음'}
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
                  ${!hasData
                    ? 'bg-gray-100 text-gray-400'
                    : good
                      ? 'bg-teal-500/15 text-teal-700'
                      : item.badBadgeCls}`}>
                  {!hasData ? '미기록' : good ? item.badgeGood : item.badgeBad}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── 기록 돌아보기 ── */}
      <Link href="/dashboard/calendar/stats"
        className="w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm transition-colors hover:bg-gray-50">
        <FontAwesomeIcon icon={faChartSimple} className="text-base text-teal-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">기록 돌아보기</p>
          <p className="text-xs text-gray-400 mt-0.5">최근 7일 생활습관과 월평균 비교를 볼 수 있어요</p>
        </div>
        <FontAwesomeIcon icon={faChevronRight} className="text-xs text-gray-300 flex-shrink-0" />
      </Link>

      {/* key로 날짜를 물려 시트가 그 날짜 기록으로 새로 마운트되게 한다 */}
      {daySheet && <DayDetailSheet key={daySheet} date={daySheet} onClose={() => setDaySheet(null)} />}
    </>
  )
}
