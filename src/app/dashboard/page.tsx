'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useChild } from '@/context/ChildContext'
import ChildFormModal from '@/components/child/ChildFormModal'
import TimeSpinner from '@/components/lifestyle/TimeSpinner'
import { today, formatDate } from '@/lib/utils/date'
import { calcStreak, calcMonthCompliance, getDayStatus } from '@/lib/utils/compliance'
import { getAlertDay } from '@/lib/notificationPrefs'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faMinus, faFire, faXmark, faTree, faMobileScreen, faCalendarDays, faPen, faBell, faHospital } from '@fortawesome/free-solid-svg-icons'
import { faCircle } from '@fortawesome/free-regular-svg-icons'
import OnboardingFlow from '@/components/onboarding/OnboardingFlow'
import TabSkeleton from '@/components/ui/TabSkeleton'
import LifestyleTab from '@/components/analytics/LifestyleTab'

const INPUT = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 accent-[#10bcad]'

export default function HomePage() {
  const router = useRouter()
  const { activeChild, activeTreatments, treatmentsForDate, logs, lifestyle, exams, isLoading, saveTreatmentLog, saveLifestyle, updateExam } = useChild()
  const [showAddChild, setShowAddChild] = useState(false)
  const [showLifestyle, setShowLifestyle] = useState(false)
  const [alertDay, setAlertDayState] = useState<number | null>(null)
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set())

  useEffect(() => { setAlertDayState(getAlertDay()) }, [])

  const dismissBanner = (key: string) =>
    setDismissedBanners(prev => new Set(prev).add(key))
  const [lifeForm, setLifeForm] = useState({ date: today(), outdoorH: 0, outdoorM: 0, phoneH: 0, phoneM: 0 })
  const [editingAppt, setEditingAppt] = useState(false)
  const [apptDate, setApptDate] = useState('')
  const [lifeSaving, setLifeSaving] = useState(false)
  const todayStr = today()
  const todayLog = logs[todayStr] || {}

  useEffect(() => {
    const handler = () => setShowAddChild(true)
    document.addEventListener('open-add-child', handler)
    return () => document.removeEventListener('open-add-child', handler)
  }, [])

  const openLifestyleModal = () => {
    if (todayLife) {
      const outdoorH = Math.floor(todayLife.outdoor)
      const outdoorM = Math.round((todayLife.outdoor - outdoorH) * 60)
      const phoneH   = Math.floor(todayLife.phone)
      const phoneM   = Math.round((todayLife.phone   - phoneH)   * 60)
      setLifeForm(f => ({ ...f, outdoorH, outdoorM, phoneH, phoneM }))
    }
    setShowLifestyle(true)
  }

  const handleLifeSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLifeSaving(true)
    try {
      await saveLifestyle(lifeForm.date, {
        outdoor: lifeForm.outdoorH + lifeForm.outdoorM / 60,
        phone:   lifeForm.phoneH   + lifeForm.phoneM   / 60,
        sleep: 0,
      })
      toast.success('생활습관이 저장되었습니다')
      setShowLifestyle(false)
      setLifeForm({ date: today(), outdoorH: 0, outdoorM: 0, phoneH: 0, phoneM: 0 })
    } catch { toast.error('저장에 실패했습니다') }
    finally { setLifeSaving(false) }
  }

  const toggleTreatment = async (key: string) => {
    const newVal = !todayLog[key]
    await saveTreatmentLog(todayStr, { ...todayLog, [key]: newVal })
    toast.success(newVal ? '케어 완료로 표시했습니다' : '완료 취소했습니다')
  }

  if (isLoading) return <TabSkeleton />

  if (!activeChild) {
    return <OnboardingFlow />
  }

  const fmtTime = (h: number) => {
    const hrs = Math.floor(h)
    const mins = Math.round((h - hrs) * 60)
    return mins > 0 ? `${hrs}시간 ${mins}분` : `${hrs}시간`
  }

  const streak   = calcStreak(logs, treatmentsForDate)
  const monthPct = calcMonthCompliance(logs, treatmentsForDate, new Date().getFullYear(), new Date().getMonth())
  const todayLife = lifestyle[todayStr]

  const nextAppt = exams
    .filter(e => e.nextAppointment && e.nextAppointment >= todayStr)
    .sort((a, b) => a.nextAppointment.localeCompare(b.nextAppointment))[0]
  const dDays = nextAppt
    ? Math.round((new Date(nextAppt.nextAppointment).getTime() - new Date(todayStr).getTime()) / 86400000)
    : null

  // 배너 표시 조건
  const showDDayBanner =
    alertDay !== null &&
    dDays !== null &&
    dDays <= alertDay &&
    !dismissedBanners.has('dday')

  const careNotEntered =
    activeTreatments.length > 0 &&
    !logs[todayStr] &&
    !dismissedBanners.has('care')

  const dDayBannerStyle =
    dDays! <= 3
      ? { bg: 'bg-rose-50',  text: 'text-rose-600',  sub: 'text-rose-400',  icon: 'text-rose-400'  }
      : { bg: 'bg-amber-50', text: 'text-amber-700', sub: 'text-amber-500', icon: 'text-amber-400' }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const ds = formatDate(d)
    return { d, ds, status: getDayStatus(logs, treatmentsForDate, ds) }
  })
  const DAY_KO = ['일','월','화','수','목','금','토']

  return (
    <>
      {/* ── 알림 배너 ── */}
      {showDDayBanner && nextAppt && (
        <div className={`flex items-center gap-3 ${dDayBannerStyle.bg} rounded-2xl px-4 py-3 mb-3`}>
          <FontAwesomeIcon icon={faHospital} className={`text-base flex-shrink-0 ${dDayBannerStyle.icon}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${dDayBannerStyle.text}`}>
              {dDays === 0 ? '오늘 병원 예약일입니다!' : `병원 예약 D-${dDays}`}
            </p>
            <p className={`text-xs mt-0.5 ${dDayBannerStyle.sub}`}>
              {nextAppt.nextAppointment}{nextAppt.clinic ? ` · ${nextAppt.clinic}` : ''}
            </p>
          </div>
          <button onClick={() => dismissBanner('dday')} className={`p-1 ${dDayBannerStyle.sub}`}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      )}

      {careNotEntered && (
        <div className="flex items-center gap-3 bg-amber-50 rounded-2xl px-4 py-3 mb-3">
          <FontAwesomeIcon icon={faBell} className="text-base text-amber-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-700">오늘 케어를 아직 기록하지 않았습니다</p>
            <p className="text-xs text-amber-500 mt-0.5">아래에서 오늘의 케어를 체크해주세요</p>
          </div>
          <button onClick={() => dismissBanner('care')} className="p-1 text-amber-400">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      )}

      {/* ── 오늘의 케어 ── */}
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
                <button key={t.key} onClick={() => toggleTreatment(t.key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left
                    ${done ? 'border-[#10bcad]/30 bg-teal-50' : 'border-gray-100 bg-gray-50/60 hover:border-teal-100'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0
                    ${done ? 'bg-[#10bcad] text-white' : 'bg-white border-2 border-gray-200 text-gray-300'}`}>
                    <FontAwesomeIcon icon={done ? faCheck : faCircle} />
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-semibold ${done ? 'text-gray-800' : 'text-gray-600'}`}>{t.name}</div>
                    {t.schedule && <div className="text-xs text-gray-400">{t.schedule}</div>}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
                    ${done ? 'bg-[#10bcad]/15 text-teal-700' : 'bg-gray-100 text-gray-400'}`}>
                    {done ? '완료' : '미완료'}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* ── 케어 달성률 ── */}
      {activeTreatments.length > 0 && (
        <section className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-3">최근 7일 근시케어</h2>

          <div className="flex justify-around mb-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${streak >= 7 ? 'text-[#10bcad]' : 'text-gray-800'}`}>
                {streak}일
              </div>
              <div className="text-xs text-gray-400 mt-0.5 flex items-center justify-center gap-1">
                <FontAwesomeIcon icon={faFire} className="text-amber-400" /> 연속 달성
              </div>
            </div>
            <div className="w-px bg-gray-100" />
            <div className="text-center">
              <div className={`text-2xl font-bold ${monthPct >= 90 ? 'text-[#10bcad]' : monthPct >= 70 ? 'text-amber-500' : 'text-gray-800'}`}>
                {monthPct}%
              </div>
              <div className="text-xs text-gray-400 mt-0.5">이번 달</div>
            </div>
          </div>

          {/* 주간 스트립 */}
          <div
            className="flex gap-1 cursor-pointer"
            onClick={() => router.push('/dashboard/calendar')}
          >
            {weekDays.map(({ d, ds, status }) => {
              const isToday = ds === todayStr
              const dotBg =
                status === 'done'    ? 'bg-[#10bcad]' :
                status === 'partial' ? 'bg-[#fde68a]' :
                status === 'missed'  ? 'bg-[#fda4af]' : 'bg-gray-100'
              return (
                <div key={ds} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-400">{DAY_KO[d.getDay()]}</span>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${dotBg}
                    ${isToday ? 'ring-2 ring-[#10bcad] ring-offset-1' : ''}`}>
                    {status === 'done'    ? <FontAwesomeIcon icon={faCheck}  className="text-white text-xs" />
                    : status === 'partial' ? <FontAwesomeIcon icon={faMinus}  className="text-amber-700 text-xs" />
                    : status === 'missed'  ? <FontAwesomeIcon icon={faXmark}  className="text-rose-500 text-xs" />
                    : null}
                  </div>
                  <span className={`text-xs ${isToday ? 'font-bold text-[#10bcad]' : 'text-gray-500'}`}>
                    {d.getDate()}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

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
                onClick={openLifestyleModal}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left
                  ${!hasData
                    ? 'border-gray-100 bg-gray-50/60 hover:border-teal-100'
                    : good
                      ? 'border-[#10bcad]/30 bg-teal-50'
                      : item.badBg}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0
                  ${!hasData
                    ? 'bg-white border-2 border-gray-200 text-gray-300'
                    : good
                      ? 'bg-teal-100 text-[#10bcad]'
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
                      ? 'bg-[#10bcad]/15 text-teal-700'
                      : item.badBadgeCls}`}>
                  {!hasData ? '미기록' : good ? item.badgeGood : item.badgeBad}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── 최근 7일 생활습관 ── */}
      <section className="mb-3">
        <LifestyleTab />
      </section>

      {/* ── 다음 예약일 ── */}
      {nextAppt && (
        <section className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-gray-800">다음 병원 예약일</h2>
            {!editingAppt && (
              <button onClick={() => { setApptDate(nextAppt.nextAppointment); setEditingAppt(true) }}
                className="text-gray-300 hover:text-gray-500 text-sm p-1 transition-colors">
                <FontAwesomeIcon icon={faPen} />
              </button>
            )}
          </div>
          {editingAppt ? (
            <div className="mt-2 flex items-center gap-2">
              <input type="date" value={apptDate} onChange={e => setApptDate(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 accent-[#10bcad]" />
              <button onClick={async () => {
                if (!apptDate) return
                try {
                  await updateExam(nextAppt.id, { ...nextAppt, nextAppointment: apptDate })
                  toast.success('예약일이 수정되었습니다')
                } catch { toast.error('수정에 실패했습니다') }
                setEditingAppt(false)
              }} className="bg-[#10bcad] hover:bg-teal-600 text-white text-sm px-3 py-2 rounded-lg font-medium transition-colors">
                저장
              </button>
              <button onClick={() => setEditingAppt(false)}
                className="text-gray-400 hover:text-gray-600 text-sm p-2">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between mt-2">
              <span className="flex items-center gap-1.5 text-gray-700 text-sm font-medium">
                <FontAwesomeIcon icon={faCalendarDays} className="text-gray-400 text-xs" />
                {nextAppt.nextAppointment}
              </span>
              <span className={`text-base font-bold px-3 py-1 rounded-full
                ${dDays! <= 3 ? 'bg-rose-50 text-rose-500'
                  : dDays! <= 7 ? 'bg-[#fde68a]/40 text-amber-600'
                  : 'bg-teal-50 text-[#10bcad]'}`}>
                {dDays === 0 ? 'D-Day' : `D-${dDays}`}
              </span>
            </div>
          )}
          {nextAppt.clinic && !editingAppt &&
            <p className="text-xs text-gray-400 mt-1">{nextAppt.clinic}</p>}
        </section>
      )}

      <ChildFormModal open={showAddChild} onClose={() => setShowAddChild(false)} />

      {showLifestyle && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowLifestyle(false)} />
          <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">생활습관 기록</h2>
              <button onClick={() => setShowLifestyle(false)} className="text-gray-400 text-xl"><FontAwesomeIcon icon={faXmark} /></button>
            </div>
            <form onSubmit={handleLifeSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
                <input type="date" value={lifeForm.date}
                  onChange={e => setLifeForm(f => ({ ...f, date: e.target.value }))}
                  className={INPUT} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-teal-50 rounded-2xl p-4 border-2 border-teal-100">
                  <div className="flex items-center gap-1.5 mb-4">
                    <FontAwesomeIcon icon={faTree} className="text-xl text-[#10bcad]" />
                    <span className="text-xs font-semibold text-gray-700">야외활동</span>
                  </div>
                  <TimeSpinner
                    hours={lifeForm.outdoorH} minutes={lifeForm.outdoorM}
                    onHour={v => setLifeForm(f => ({ ...f, outdoorH: v }))}
                    onMinute={v => setLifeForm(f => ({ ...f, outdoorM: v }))}
                    btnCls="bg-teal-100 text-teal-700 hover:bg-teal-200"
                    textCls="text-gray-700"
                  />
                  <p className="text-xs text-gray-400 mt-3 text-center">권장 2시간↑</p>
                </div>
                <div className="bg-amber-50 rounded-2xl p-4 border-2 border-amber-100">
                  <div className="flex items-center gap-1.5 mb-4">
                    <FontAwesomeIcon icon={faMobileScreen} className="text-xl text-amber-500" />
                    <span className="text-xs font-semibold text-gray-700">스마트폰</span>
                  </div>
                  <TimeSpinner
                    hours={lifeForm.phoneH} minutes={lifeForm.phoneM}
                    onHour={v => setLifeForm(f => ({ ...f, phoneH: v }))}
                    onMinute={v => setLifeForm(f => ({ ...f, phoneM: v }))}
                    btnCls="bg-amber-100 text-amber-700 hover:bg-amber-200"
                    textCls="text-gray-700"
                  />
                  <p className="text-xs text-gray-400 mt-3 text-center">권장 2시간↓</p>
                </div>
              </div>
              <button type="submit" disabled={lifeSaving}
                className="w-full bg-[#10bcad] hover:bg-teal-600 disabled:bg-teal-200 text-white font-semibold py-3 rounded-xl transition-colors">
                {lifeSaving ? '저장 중...' : '저장'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
