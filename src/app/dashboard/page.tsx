'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useChild } from '@/context/ChildContext'
import ChildFormModal from '@/components/child/ChildFormModal'
import TimeSpinner from '@/components/lifestyle/TimeSpinner'
import { today, formatDate } from '@/lib/utils/date'
import { calcStreak, calcMonthCompliance, getDayStatus } from '@/lib/utils/compliance'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faCheck, faMinus, faFire, faXmark, faTree, faMobileScreen } from '@fortawesome/free-solid-svg-icons'
import { faCircle } from '@fortawesome/free-regular-svg-icons'

const INPUT = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function HomePage() {
  const { activeChild, activeTreatments, logs, lifestyle, isLoading, saveTreatmentLog, saveLifestyle } = useChild()
  const [showAddChild, setShowAddChild] = useState(false)
  const [showLifestyle, setShowLifestyle] = useState(false)
  const [lifeForm, setLifeForm] = useState({ date: today(), outdoorH: 0, outdoorM: 0, phoneH: 0, phoneM: 0 })
  const [lifeSaving, setLifeSaving] = useState(false)
  const todayStr = today()
  const todayLog = logs[todayStr] || {}

  // 헤더에서 "자녀 추가" 클릭 시 모달 열기
  useEffect(() => {
    const handler = () => setShowAddChild(true)
    document.addEventListener('open-add-child', handler)
    return () => document.removeEventListener('open-add-child', handler)
  }, [])

  const handleLifeSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLifeSaving(true)
    try {
      await saveLifestyle(lifeForm.date, {
        outdoor: lifeForm.outdoorH + lifeForm.outdoorM / 60,
        phone:   lifeForm.phoneH   + lifeForm.phoneM   / 60,
      })
      toast.success('생활습관이 저장되었습니다')
      setShowLifestyle(false)
      setLifeForm({ date: today(), outdoorH: 0, outdoorM: 0, phoneH: 0, phoneM: 0 })
    } catch { toast.error('저장에 실패했습니다') }
    finally { setLifeSaving(false) }
  }

  const toggleTreatment = async (key: 'atropine' | 'dreamlens') => {
    const newVal = !todayLog[key]
    const atropine  = key === 'atropine'  ? newVal : !!todayLog.atropine
    const dreamlens = key === 'dreamlens' ? newVal : !!todayLog.dreamlens
    await saveTreatmentLog(todayStr, atropine, dreamlens)
    toast.success(newVal ? '케어 완료로 표시했습니다' : '완료 취소했습니다')
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">불러오는 중...</div>
  }

  if (!activeChild) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
          <FontAwesomeIcon icon={faEye} className="text-5xl text-blue-200" />
          <div>
            <p className="font-semibold text-gray-700">아직 등록된 자녀가 없습니다</p>
            <p className="text-sm text-gray-400 mt-1">자녀를 추가해 근시 관리를 시작하세요</p>
          </div>
          <button
            onClick={() => setShowAddChild(true)}
            className="bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm"
          >
            자녀 추가하기
          </button>
        </div>
        <ChildFormModal open={showAddChild} onClose={() => setShowAddChild(false)} />
      </>
    )
  }

  const fmtTime = (h: number) => { const hrs = Math.floor(h); const mins = Math.round((h - hrs) * 60); return mins > 0 ? `${hrs}시간 ${mins}분` : `${hrs}시간` }

  const streak  = calcStreak(logs, activeTreatments)
  const monthPct = calcMonthCompliance(logs, activeTreatments, new Date().getFullYear(), new Date().getMonth())
  const todayLife = lifestyle[todayStr]

  // 주간 스트립
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const ds = formatDate(d)
    return { d, ds, status: getDayStatus(logs, activeTreatments, ds) }
  })
  const DAY_KO = ['일','월','화','수','목','금','토']

  return (
    <>
      {/* 오늘의 케어 */}
      <section className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800">오늘의 케어</h2>
          <span className="text-xs text-gray-400">
            {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
        </div>

        {activeTreatments.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">
            설정에서 자녀의 케어 항목을 등록해주세요.
          </p>
        ) : (
          <div className="space-y-2">
            {activeTreatments.map(t => {
              const done = !!todayLog[t.key]
              return (
                <button
                  key={t.key}
                  onClick={() => toggleTreatment(t.key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left
                    ${done ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                    ${done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    <FontAwesomeIcon icon={done ? faCheck : faCircle} />
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-semibold ${done ? 'text-green-700' : 'text-gray-700'}`}>{t.name}</div>
                    <div className="text-xs text-gray-400">{t.time}</div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                    ${done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {done ? '완료' : '미완료'}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* 케어 달성률 */}
      {activeTreatments.length > 0 && (
        <section className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-3">케어 달성률</h2>

          <div className="flex justify-around mb-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${streak >= 7 ? 'text-green-600' : 'text-gray-800'}`}>
                {streak}일
              </div>
              <div className="text-xs text-gray-400 mt-0.5 flex items-center justify-center gap-1"><FontAwesomeIcon icon={faFire} className="text-orange-400" /> 연속 달성</div>
            </div>
            <div className="w-px bg-gray-100" />
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">{monthPct}%</div>
              <div className="text-xs text-gray-400 mt-0.5">이번 달</div>
            </div>
          </div>

          {/* 주간 스트립 */}
          <div className="flex gap-1">
            {weekDays.map(({ d, ds, status }) => {
              const isToday = ds === todayStr
              const dotColor = status === 'done' ? 'bg-green-500' : status === 'partial' ? 'bg-yellow-400' : status === 'missed' ? 'bg-red-400' : 'bg-gray-100'
              return (
                <div key={ds} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-400">{DAY_KO[d.getDay()]}</span>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${dotColor}
                    ${isToday ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}>
                    {status === 'done' ? <FontAwesomeIcon icon={faCheck} className="text-white text-xs" />
                      : status === 'partial' ? <FontAwesomeIcon icon={faMinus} className="text-white text-xs" />
                      : null}
                  </div>
                  <span className={`text-xs ${isToday ? 'font-bold text-blue-600' : 'text-gray-500'}`}>
                    {d.getDate()}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 오늘의 생활습관 */}
      <section className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800">오늘의 생활습관</h2>
        </div>
        {todayLife ? (
          <div className="flex gap-3">
            {[
              { icon: faTree,         label: '야외활동', value: todayLife.outdoor, color: todayLife.outdoor >= 2 ? 'text-green-600' : todayLife.outdoor > 0 ? 'text-amber-500' : 'text-red-500', bg: 'bg-green-50' },
              { icon: faMobileScreen, label: '스마트폰', value: todayLife.phone,   color: todayLife.phone <= 2 ? 'text-green-600' : todayLife.phone <= 4 ? 'text-amber-500' : 'text-red-500',   bg: 'bg-amber-50'  },
            ].map(item => (
              <div key={item.label} className={`flex-1 ${item.bg} rounded-xl p-3 text-center`}>
                <FontAwesomeIcon icon={item.icon} className="text-xl mb-1" />
                <div className={`text-lg font-bold ${item.color}`}>
                  {fmtTime(item.value)}
                </div>
                <div className="text-xs text-gray-400">{item.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-2">
            오늘 기록이 없습니다 —{' '}
            <span className="text-blue-500 cursor-pointer" onClick={() => setShowLifestyle(true)}>
              기록하기
            </span>
          </p>
        )}
      </section>

      <ChildFormModal open={showAddChild} onClose={() => setShowAddChild(false)} />

      {showLifestyle && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowLifestyle(false)} />
          <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">생활습관 기록</h2>
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
                <div className="bg-green-50 rounded-2xl p-4 border-2 border-green-100">
                  <div className="flex items-center gap-1.5 mb-4">
                    <FontAwesomeIcon icon={faTree} className="text-xl text-green-600" />
                    <span className="text-xs font-semibold text-green-700">야외활동</span>
                  </div>
                  <TimeSpinner
                    hours={lifeForm.outdoorH} minutes={lifeForm.outdoorM}
                    onHour={v => setLifeForm(f => ({ ...f, outdoorH: v }))}
                    onMinute={v => setLifeForm(f => ({ ...f, outdoorM: v }))}
                    btnCls="bg-green-200 text-green-700 hover:bg-green-300"
                    textCls="text-green-700"
                  />
                  <p className="text-xs text-green-400 mt-3 text-center">권장 2시간↑</p>
                </div>
                <div className="bg-amber-50 rounded-2xl p-4 border-2 border-amber-100">
                  <div className="flex items-center gap-1.5 mb-4">
                    <FontAwesomeIcon icon={faMobileScreen} className="text-xl text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700">스마트폰</span>
                  </div>
                  <TimeSpinner
                    hours={lifeForm.phoneH} minutes={lifeForm.phoneM}
                    onHour={v => setLifeForm(f => ({ ...f, phoneH: v }))}
                    onMinute={v => setLifeForm(f => ({ ...f, phoneM: v }))}
                    btnCls="bg-amber-200 text-amber-700 hover:bg-amber-300"
                    textCls="text-amber-700"
                  />
                  <p className="text-xs text-amber-400 mt-3 text-center">권장 2시간↓</p>
                </div>
              </div>
              <button type="submit" disabled={lifeSaving}
                className="w-full bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl">
                {lifeSaving ? '저장 중...' : '저장'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
