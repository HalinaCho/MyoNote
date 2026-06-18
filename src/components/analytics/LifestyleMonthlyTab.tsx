'use client'

import { useState } from 'react'
import { useChild } from '@/context/ChildContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTree, faMobileScreen } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import type { LifestyleLogs } from '@/types'

export type Half = '상' | '하'
const BAR_H = 52

function calcMonthAvg(lifestyle: LifestyleLogs, year: number, month: number) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const entries = Object.entries(lifestyle)
    .filter(([k]) => k.startsWith(prefix))
    .map(([, v]) => v)
  if (!entries.length) return null
  return {
    outdoor: entries.reduce((s, e) => s + e.outdoor, 0) / entries.length,
    phone:   entries.reduce((s, e) => s + e.phone, 0)   / entries.length,
  }
}

function fmtH(h: number) {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  if (hrs === 0) return `${mins}분`
  if (mins === 0) return `${hrs}시간`
  return `${hrs}시간 ${mins}분`
}

interface BarRowProps {
  icon: IconDefinition
  iconCls: string
  label: string
  values: (number | null)[]
  monthLabels: string[]
  goal: number
  isOverBad: boolean
}

function BarRow({ icon, iconCls, label, values, monthLabels, goal, isOverBad }: BarRowProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const valid = values.filter((v): v is number => v !== null)
  const avg = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null
  const meetsGoal = avg != null && (isOverBad ? avg <= goal : avg >= goal)
  const maxVal = Math.max(goal * 1.5, ...valid, 0.5)
  const goalH = (goal / maxVal) * BAR_H

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
          <FontAwesomeIcon icon={icon} className={iconCls} />
          {label}
        </span>
        {avg != null ? (
          <div className="text-xs">
            <span className={`font-semibold ${meetsGoal ? 'text-teal-600' : isOverBad ? 'text-rose-500' : 'text-amber-500'}`}>
              평균 {avg.toFixed(1)}h
            </span>
            <span className="text-gray-400 ml-1">/ 목표 {goal}h {isOverBad ? '이하' : '이상'}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">기록 없음</span>
        )}
      </div>

      <div className="relative flex gap-1.5" style={{ height: BAR_H }}>
        {/* 좋음 구역 배경 */}
        <div
          className="absolute left-0 right-0 bg-teal-50/60 pointer-events-none"
          style={isOverBad
            ? { bottom: 0, height: goalH }
            : { bottom: goalH, height: BAR_H - goalH }
          }
        />
        {/* 목표 가이드라인 */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-gray-400/70 pointer-events-none"
          style={{ bottom: goalH }}
        />

        {values.map((v, i) => {
          const h = v != null ? Math.max(Math.round((v / maxVal) * BAR_H), 4) : 4
          const isBad = v != null && (isOverBad ? v > goal : v < goal)
          const isActive = activeIdx === i
          return (
            <div key={i} className="relative flex-1 flex items-end">
              {isActive && v != null && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0.5 bg-gray-800/90 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap z-20">
                  {fmtH(v)}
                </div>
              )}
              <div
                onClick={() => v != null && setActiveIdx(isActive ? null : i)}
                className={`w-full rounded-t-sm transition-opacity ${v != null ? 'cursor-pointer' : ''} ${isActive ? 'opacity-70' : ''} ${
                  v == null ? 'bg-gray-100'
                  : isBad ? (isOverBad ? 'bg-rose-300' : 'bg-amber-300')
                  : 'bg-[#10bcad]'
                }`}
                style={{ height: h }}
              />
            </div>
          )
        })}
      </div>

      <div className="flex gap-1.5 mt-1">
        {monthLabels.map((m, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-gray-400">{m}</div>
        ))}
      </div>
    </div>
  )
}

interface Props { year: number; half: Half }

export default function LifestyleMonthlyTab({ year, half }: Props) {
  const { lifestyle, activeChild } = useChild()

  const months = Array.from({ length: 6 }, (_, i) => {
    const monthIndex = half === '상' ? i : i + 6
    return { year, month: monthIndex, label: `${monthIndex + 1}월` }
  })

  const monthData    = months.map(m => calcMonthAvg(lifestyle, m.year, m.month))
  const outdoorVals  = monthData.map(d => d?.outdoor ?? null)
  const phoneVals    = monthData.map(d => d?.phone   ?? null)
  const monthLabels  = months.map(m => m.label)

  const outdoorGoal = activeChild?.outdoorGoal ?? 2
  const phoneGoal   = activeChild?.phoneGoal   ?? 2

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
      <h3 className="font-bold text-gray-800">생활습관 월평균</h3>

      <BarRow
        icon={faMobileScreen} iconCls="text-gray-500" label="스마트폰"
        values={phoneVals} monthLabels={monthLabels}
        goal={phoneGoal} isOverBad={true}
      />
      <div className="border-t border-gray-100" />
      <BarRow
        icon={faTree} iconCls="text-gray-500" label="야외활동"
        values={outdoorVals} monthLabels={monthLabels}
        goal={outdoorGoal} isOverBad={false}
      />
    </div>
  )
}
