'use client'

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
  const valid = values.filter((v): v is number => v !== null)
  const avg = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null
  const meetsGoal = avg != null && (isOverBad ? avg <= goal : avg >= goal)
  const maxVal = Math.max(goal * 1.5, ...valid, 0.5)

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
      <div className="flex items-end gap-1.5" style={{ height: BAR_H }}>
        {values.map((v, i) => {
          const h = v != null ? Math.max(Math.round((v / maxVal) * BAR_H), 4) : 4
          const isBad = v != null && (isOverBad ? v > goal : v < goal)
          return (
            <div
              key={i}
              className={`flex-1 rounded-t-sm ${
                v == null ? 'bg-gray-100'
                : isBad ? (isOverBad ? 'bg-rose-300' : 'bg-amber-300')
                : 'bg-[#10bcad]'
              }`}
              style={{ height: h, alignSelf: 'flex-end' }}
            />
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
        icon={faTree} iconCls="text-[#10bcad]" label="야외활동"
        values={outdoorVals} monthLabels={monthLabels}
        goal={outdoorGoal} isOverBad={false}
      />
      <div className="border-t border-gray-100" />
      <BarRow
        icon={faMobileScreen} iconCls="text-amber-500" label="스마트폰"
        values={phoneVals} monthLabels={monthLabels}
        goal={phoneGoal} isOverBad={true}
      />
    </div>
  )
}
