'use client'

import { useState } from 'react'
import AxialTab from '@/components/analytics/AxialTab'
import SerTab from '@/components/analytics/SerTab'
import AiReportCard from '@/components/analytics/AiReportCard'

type Tab = 'axial' | 'ser'

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('axial')

  return (
    <div>
      <div className="mb-3">
        <AiReportCard />
      </div>
      <div className="flex bg-white rounded-xl mb-3 p-1 shadow-sm">
        {([['axial','안축장'],['ser','굴절 도수']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === t ? 'bg-teal-500 text-white' : 'text-gray-500'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'axial' && <AxialTab />}
      {tab === 'ser'   && <SerTab />}
    </div>
  )
}
