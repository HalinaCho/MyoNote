'use client'

import { useState } from 'react'
import { useChild } from '@/context/ChildContext'
import { calcMonthCompliance } from '@/lib/utils/compliance'
import AxialTab from '@/components/analytics/AxialTab'
import SerTab from '@/components/analytics/SerTab'
import ComplianceTab from '@/components/analytics/ComplianceTab'

type Tab = 'axial' | 'ser' | 'compliance'

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('axial')

  return (
    <div>
      <div className="flex bg-white rounded-xl mb-3 p-1 shadow-sm">
        {([['axial','안축장'],['ser','굴절 도수'],['compliance','달성률']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'axial'      && <AxialTab />}
      {tab === 'ser'        && <SerTab />}
      {tab === 'compliance' && <ComplianceTab />}
    </div>
  )
}
