'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { Hospital } from '@/types'
import * as q from '@/lib/supabase/queries'

interface HospitalContextType {
  hospital: Hospital | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const HospitalContext = createContext<HospitalContextType | null>(null)

export function HospitalProvider({ children }: { children: React.ReactNode }) {
  const [hospital, setHospital] = useState<Hospital | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const hospitalId = await q.fetchMyHospitalId()
      setHospital(hospitalId ? await q.fetchHospital(hospitalId) : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '병원 정보를 불러오지 못했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <HospitalContext.Provider value={{ hospital, isLoading, error, refresh }}>
      {children}
    </HospitalContext.Provider>
  )
}

export function useHospital() {
  const ctx = useContext(HospitalContext)
  if (!ctx) throw new Error('useHospital must be used within HospitalProvider')
  return ctx
}
