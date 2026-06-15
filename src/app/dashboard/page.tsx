'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useChild } from '@/context/ChildContext'
import ChildFormModal from '@/components/child/ChildFormModal'
import { today, formatDate } from '@/lib/utils/date'
import { calcStreak, calcMonthCompliance, getDayStatus } from '@/lib/utils/compliance'

export default function HomePage() {
  const { activeChild, activeTreatments, logs, lifestyle, isLoading, saveTreatmentLog } = useChild()
  const [showAddChild, setShowAddChild] = useState(false)
  const todayStr = today()
  const todayLog = logs[todayStr] || {}

  // 헤더에서 "자녀 추가" 클릭 시 모달 열기
  useEffect(() => {
    const handler = () => setShowAddChild(true)
    document.addEventListener('open-add-child', handler)
    return () => document.removeEventListener('open-add-child', handler)
  }, [])

  const toggleTreatment = async (key: 'atropine' | 'dreamlens') => {
    const newVal = !todayLog[key]
    const atropine  = key === 'atropine'  ? newVal : !!todayLog.atropine
    const dreamlens = key === 'dreamlens' ? newVal : !!todayLog.dreamlens
    await saveTreatmentLog(todayStr, atropine, dreamlens)
    toast.success(newVal ? '치료 완료로 표시했습니다' : '완료 취소했습니다')
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">불러오는 중...</div>
  }

  if (!activeChild) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
          <div className="text-5xl">👁</div>
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
      {/* 오늘의 치료 */}
      <section className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800">오늘의 치료</h2>
          <span className="text-xs text-gray-400">
            {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
        </div>

        {activeTreatments.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">
            설정에서 자녀의 치료 항목을 등록해주세요.
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
                    {done ? '✓' : '○'}
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

      {/* 치료 순응도 */}
      {activeTreatments.length > 0 && (
        <section className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-3">치료 순응도</h2>

          <div className="flex justify-around mb-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${streak >= 7 ? 'text-green-600' : 'text-gray-800'}`}>
                {streak}일
              </div>
              <div className="text-xs text-gray-400 mt-0.5">🔥 연속 달성</div>
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
                    {status === 'done' ? <span className="text-white text-xs">✓</span>
                      : status === 'partial' ? <span className="text-white text-xs">△</span>
                      : status === 'future' ? '' : ''}
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
              { icon: '🌳', label: '야외활동', value: todayLife.outdoor, unit: 'h', good: todayLife.outdoor >= 2 },
              { icon: '📱', label: '스마트폰', value: todayLife.phone,   unit: 'h', good: todayLife.phone   <= 2 },
              { icon: '😴', label: '수면',     value: todayLife.sleep,   unit: 'h', good: todayLife.sleep   >= 8 },
            ].map(item => (
              <div key={item.label} className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-xl mb-1">{item.icon}</div>
                <div className={`text-lg font-bold ${item.good ? 'text-green-600' : 'text-red-500'}`}>
                  {item.value}{item.unit}
                </div>
                <div className="text-xs text-gray-400">{item.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-2">
            오늘 기록이 없습니다 —{' '}
            <span className="text-blue-500 cursor-pointer" onClick={() => document.dispatchEvent(new CustomEvent('open-lifestyle'))}>
              기록하기
            </span>
          </p>
        )}
      </section>

      <ChildFormModal open={showAddChild} onClose={() => setShowAddChild(false)} />
    </>
  )
}
