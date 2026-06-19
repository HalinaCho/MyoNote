'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useChild } from '@/context/ChildContext'
import TabSkeleton from '@/components/ui/TabSkeleton'
import ComplianceTab from '@/components/analytics/ComplianceTab'
import LifestyleMonthlyTab, { type Half } from '@/components/analytics/LifestyleMonthlyTab'
import { today } from '@/lib/utils/date'
import { getDayStatus } from '@/lib/utils/compliance'
import TimeSpinner from '@/components/lifestyle/TimeSpinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faTree, faMobileScreen } from '@fortawesome/free-solid-svg-icons'

function fmtTime(h: number) {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins > 0 ? `${hrs}시간 ${mins}분` : `${hrs}시간`
}

export default function CalendarPage() {
  const { logs, lifestyle, treatmentsForDate, isLoading, saveTreatmentLog, saveLifestyle } = useChild()
  const [calYear, setCalYear]   = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [statsTab, setStatsTab] = useState<'care' | 'lifestyle'>('care')

  const today_ = new Date()
  const curYear = today_.getFullYear()
  const curHalf: Half = today_.getMonth() < 6 ? '상' : '하'
  const [statsYear, setStatsYear] = useState(curYear)
  const [statsHalf, setStatsHalf] = useState<Half>(curHalf)
  const handleStatsPrev = () => {
    if (statsHalf === '상') { setStatsYear(y => y - 1); setStatsHalf('하') }
    else setStatsHalf('상')
  }
  const handleStatsNext = () => {
    if (statsHalf === '하') { setStatsYear(y => y + 1); setStatsHalf('상') }
    else setStatsHalf('하')
  }
  const nextStatsYear = statsHalf === '하' ? statsYear + 1 : statsYear
  const nextStatsHalf: Half = statsHalf === '하' ? '상' : '하'
  const isStatsNextFuture = nextStatsYear > curYear
    || (nextStatsYear === curYear && nextStatsHalf === '하' && curHalf === '상')
  const [dayModal, setDayModal] = useState<string | null>(null)
  const [lifeForm, setLifeForm] = useState({ outdoorH: 0, outdoorM: 0, phoneH: 0, phoneM: 0 })
  const [lifeSaving, setLifeSaving] = useState(false)

  const todayStr = today()
  const firstDay    = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const DAY_KO = ['일','월','화','수','목','금','토']

  // 표시 중인 달에 케어 2개 이상이던 날이 있으면 '부분' 범례 노출
  const monthHasPartial = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1
    return `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }).some(ds => treatmentsForDate(ds).length >= 2)

  const changeMonth = (delta: number) => {
    let m = calMonth + delta, y = calYear
    if (m > 11) { m = 0; y++ }
    if (m < 0)  { m = 11; y-- }
    setCalMonth(m); setCalYear(y)
  }

  const openDay = (ds: string) => {
    const life = lifestyle[ds]
    if (life) {
      const outdoorH = Math.floor(life.outdoor)
      const outdoorM = Math.round((life.outdoor - outdoorH) * 60)
      const phoneH = Math.floor(life.phone)
      const phoneM = Math.round((life.phone - phoneH) * 60)
      setLifeForm({ outdoorH, outdoorM, phoneH, phoneM })
    } else {
      setLifeForm({ outdoorH: 0, outdoorM: 0, phoneH: 0, phoneM: 0 })
    }
    setDayModal(ds)
  }

  const handleCareToggle = async (ds: string, key: string, val: boolean) => {
    const log = logs[ds] || {}
    await saveTreatmentLog(ds, { ...log, [key]: val })
  }

  const handleLifeSave = async () => {
    if (!dayModal) return
    setLifeSaving(true)
    try {
      await saveLifestyle(dayModal, {
        outdoor: lifeForm.outdoorH + lifeForm.outdoorM / 60,
        phone:   lifeForm.phoneH   + lifeForm.phoneM   / 60,
        sleep: 0,
      })
      toast.success('저장되었습니다')
      setDayModal(null)
    } catch { toast.error('저장에 실패했습니다') }
    finally { setLifeSaving(false) }
  }

  if (isLoading) return <TabSkeleton />

  return (
    <>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        {/* 월 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 text-lg">‹</button>
          <span className="font-bold text-gray-800">{calYear}년 {calMonth + 1}월</span>
          <button onClick={() => changeMonth(1)}  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 text-lg">›</button>
        </div>

        {/* 요일 */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_KO.map(d => <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>)}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d  = i + 1
            const ds = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
            const status    = getDayStatus(logs, treatmentsForDate, ds)
            const isToday   = ds === todayStr
            const clickable = ds <= todayStr
            const life      = lifestyle[ds]

            const bg =
              status === 'done'    ? 'bg-teal-100 text-teal-700'
              : status === 'partial' ? 'bg-amber-100 text-amber-700'
              : status === 'missed'  ? 'bg-rose-100 text-rose-600'
              : 'bg-gray-50 text-gray-300'

            return (
              <button
                key={ds}
                disabled={!clickable}
                onClick={() => clickable && openDay(ds)}
                className={`aspect-square flex flex-col items-center justify-between py-1.5 rounded-lg transition-colors
                  ${bg} ${isToday ? 'ring-2 ring-teal-500' : ''} ${clickable ? 'hover:opacity-80 active:scale-95' : ''}`}
              >
                <span className="text-sm sm:text-base font-semibold leading-none">{d}</span>
                <div className="h-1.5 flex items-center justify-center">
                  {life && <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
                </div>
              </button>
            )
          })}
        </div>

        {/* 범례 */}
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-teal-100"/>케어완료</span>
          {monthHasPartial && (
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-100"/>부분</span>
          )}
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-rose-100"/>미완료</span>
          <span className="w-px h-3 bg-gray-200 mx-0.5" />
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            생활습관 기록
          </span>
        </div>
      </div>

      {/* 날짜 바텀시트 */}
      {dayModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDayModal(null)} />
          <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-800">{dayModal}</h2>
              <button onClick={() => setDayModal(null)} className="text-gray-400 text-xl"><FontAwesomeIcon icon={faXmark} /></button>
            </div>

            {/* 케어 — 그 날짜에 활성이던 케어만 표시 */}
            {treatmentsForDate(dayModal).length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">케어</p>
                <div className="space-y-2">
                  {treatmentsForDate(dayModal).map(t => {
                    const done = !!(logs[dayModal] || {})[t.key]
                    return (
                      <label key={t.key} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50">
                        <span className="text-sm font-medium text-gray-700">{t.name}</span>
                        <div className="relative">
                          <input type="checkbox" checked={done} onChange={e => handleCareToggle(dayModal, t.key, e.target.checked)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-teal-500 transition-colors" />
                          <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 생활습관 */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">생활습관</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-teal-50 rounded-2xl p-3 border-2 border-teal-100">
                  <div className="flex items-center gap-1.5 mb-3">
                    <FontAwesomeIcon icon={faTree} className="text-teal-500" />
                    <span className="text-xs font-semibold text-teal-700">야외활동</span>
                  </div>
                  <TimeSpinner
                    hours={lifeForm.outdoorH} minutes={lifeForm.outdoorM}
                    onHour={v => setLifeForm(f => ({ ...f, outdoorH: v }))}
                    onMinute={v => setLifeForm(f => ({ ...f, outdoorM: v }))}
                    btnCls="bg-teal-200 text-teal-700 hover:bg-teal-300"
                    textCls="text-teal-700"
                  />
                  <p className="text-xs text-teal-400 mt-2 text-center">권장 2시간↑</p>
                </div>
                <div className="bg-amber-50 rounded-2xl p-3 border-2 border-amber-100">
                  <div className="flex items-center gap-1.5 mb-3">
                    <FontAwesomeIcon icon={faMobileScreen} className="text-amber-500" />
                    <span className="text-xs font-semibold text-amber-700">스마트폰</span>
                  </div>
                  <TimeSpinner
                    hours={lifeForm.phoneH} minutes={lifeForm.phoneM}
                    onHour={v => setLifeForm(f => ({ ...f, phoneH: v }))}
                    onMinute={v => setLifeForm(f => ({ ...f, phoneM: v }))}
                    btnCls="bg-amber-200 text-amber-700 hover:bg-amber-300"
                    textCls="text-amber-700"
                  />
                  <p className="text-xs text-amber-400 mt-2 text-center">권장 2시간↓</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleLifeSave} disabled={lifeSaving}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {lifeSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      )}

      {/* 통계 카드 */}
      <div className="mt-3 bg-white rounded-2xl p-4 shadow-sm">
        {/* 카드 헤더: 제목 + 기간 네비게이션 */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800">월평균 비교</h3>
          <div className="flex items-center gap-0.5">
            <button onClick={handleStatsPrev}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 active:bg-gray-200 transition-colors">
              ‹
            </button>
            <span className="text-sm font-semibold text-gray-600 w-[90px] text-center">
              {statsYear}년 {statsHalf}반기
            </span>
            <button onClick={handleStatsNext} disabled={isStatsNextFuture}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-30 disabled:pointer-events-none">
              ›
            </button>
          </div>
        </div>

        {/* 탭 토글 */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-3">
          {([['care', '근시케어'], ['lifestyle', '생활습관']] as const).map(([t, label]) => (
            <button key={t} onClick={() => setStatsTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
                ${statsTab === t ? 'bg-teal-500 text-white' : 'text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>

        {statsTab === 'care'      && <ComplianceTab year={statsYear} half={statsHalf} bare />}
        {statsTab === 'lifestyle' && <LifestyleMonthlyTab year={statsYear} half={statsHalf} bare />}
      </div>
    </>
  )
}
