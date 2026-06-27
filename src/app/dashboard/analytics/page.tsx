'use client'

import { useState } from 'react'
import { AxialTrendView, AxialPctView } from '@/components/analytics/AxialTab'
import SerTab from '@/components/analytics/SerTab'
import ForecastCard from '@/components/analytics/ForecastCard'
import AiReportCard from '@/components/analytics/AiReportCard'

type Tab = 'trends' | 'forecast'

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('trends')

  return (
    <div>
      <div className="mb-3">
        <AiReportCard />
      </div>
      <div className="flex bg-white rounded-xl mb-3 p-1 shadow-sm">
        {([['trends', '변화추이'], ['forecast', '또래·예측']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === t ? 'bg-teal-500 text-white' : 'text-gray-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'trends' && (
        <div className="space-y-3">
          <AxialTrendView />
          <SerTab />
        </div>
      )}
      {tab === 'forecast' && (
        <div className="space-y-3">
          <AxialPctView />
          <ForecastCard />
        </div>
      )}
    </div>
  )
}
