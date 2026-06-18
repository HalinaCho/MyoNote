'use client'

import { useChild } from '@/context/ChildContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTree, faMobileScreen } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

const DAY_KR = ['일', '월', '화', '수', '목', '금', '토']
const BAR_H = 52

function getLast7Days(): string[] {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    days.push(`${y}-${m}-${day}`)
  }
  return days
}

function parseDateLocal(dateStr: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(y, mo - 1, d)
}

interface BarRowProps {
  icon: IconDefinition
  iconCls: string
  label: string
  values: (number | null)[]
  dayLabels: string[]
  goal: number
  isOverBad: boolean
}

function BarRow({ icon, iconCls, label, values, dayLabels, goal, isOverBad }: BarRowProps) {
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
                v == null
                  ? 'bg-gray-100'
                  : isBad
                    ? (isOverBad ? 'bg-rose-300' : 'bg-amber-300')
                    : 'bg-[#10bcad]'
              }`}
              style={{ height: h, alignSelf: 'flex-end' }}
            />
          )
        })}
      </div>

      <div className="flex gap-1.5 mt-1">
        {dayLabels.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-gray-400">{d}</div>
        ))}
      </div>
    </div>
  )
}

export default function LifestyleTab() {
  const { lifestyle, activeChild } = useChild()

  const days = getLast7Days()
  const dayLabels = days.map(d => DAY_KR[parseDateLocal(d).getDay()])

  const outdoorGoal = activeChild?.outdoorGoal ?? 2
  const phoneGoal   = activeChild?.phoneGoal   ?? 2

  const outdoorValues = days.map(d => lifestyle[d]?.outdoor ?? null)
  const phoneValues   = days.map(d => lifestyle[d]?.phone   ?? null)

  const hasAnyData = [...outdoorValues, ...phoneValues].some(v => v !== null)

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
      <h3 className="font-bold text-gray-800">최근 7일 생활습관</h3>

      {!hasAnyData ? (
        <p className="text-sm text-gray-400 text-center py-4">캘린더에서 생활습관을 기록해주세요.</p>
      ) : (
        <>
          <BarRow
            icon={faTree} iconCls="text-[#10bcad]" label="야외활동"
            values={outdoorValues} dayLabels={dayLabels}
            goal={outdoorGoal} isOverBad={false}
          />
          <div className="border-t border-gray-100" />
          <BarRow
            icon={faMobileScreen} iconCls="text-amber-500" label="스마트폰"
            values={phoneValues} dayLabels={dayLabels}
            goal={phoneGoal} isOverBad={true}
          />
        </>
      )}
    </div>
  )
}
