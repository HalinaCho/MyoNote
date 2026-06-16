'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { Child, ExamRecord, TreatmentLogs, LifestyleLogs, Treatment } from '@/types'
import { getActiveTreatments } from '@/lib/treatments'
import * as q from '@/lib/supabase/queries'
import { today } from '@/lib/utils/date'

interface ChildContextType {
  children: Child[]
  activeChildId: string | null
  activeChild: Child | null
  activeTreatments: Treatment[]
  logs: TreatmentLogs
  exams: ExamRecord[]
  lifestyle: LifestyleLogs
  isLoading: boolean
  switchChild: (id: string) => Promise<void>
  refreshChildren: () => Promise<void>
  addChild: (data: q.AddChildInput) => Promise<void>
  updateChild: (data: q.UpdateChildInput) => Promise<void>
  deleteChild: (id: string) => Promise<void>
  saveTreatmentLog: (dateStr: string, atropine: boolean, dreamlens: boolean) => Promise<void>
  saveExam: (exam: Omit<ExamRecord, 'id'>) => Promise<ExamRecord>
  updateExam: (id: string, exam: Omit<ExamRecord, 'id'>) => Promise<void>
  deleteExam: (id: string) => Promise<void>
  saveLifestyle: (dateStr: string, data: { outdoor: number; phone: number; sleep: number }) => Promise<void>
  deleteLifestyle: (dateStr: string) => Promise<void>
}

const ChildContext = createContext<ChildContextType | null>(null)

export function ChildProvider({ children: node }: { children: React.ReactNode }) {
  const [children, setChildren] = useState<Child[]>([])
  const [activeChildId, setActiveChildId] = useState<string | null>(null)
  const [logs, setLogs] = useState<TreatmentLogs>({})
  const [exams, setExams] = useState<ExamRecord[]>([])
  const [lifestyle, setLifestyle] = useState<LifestyleLogs>({})
  const [isLoading, setIsLoading] = useState(true)

  const loadChildData = useCallback(async (childId: string) => {
    const data = await q.fetchChildData(childId)
    setLogs(data.logs)
    setExams(data.exams)
    setLifestyle(data.lifestyle)
  }, [])

  const refreshChildren = useCallback(async () => {
    setIsLoading(true)
    try {
      const list = await q.fetchChildren()
      setChildren(list)
      const savedId = typeof window !== 'undefined' ? localStorage.getItem('mn_active') : null
      const id = list.find(c => c.id === savedId)?.id ?? list[0]?.id ?? null
      setActiveChildId(id)
      if (id) {
        localStorage.setItem('mn_active', id)
        await loadChildData(id)
      }
    } finally {
      setIsLoading(false)
    }
  }, [loadChildData])

  useEffect(() => { refreshChildren() }, [refreshChildren])

  const switchChild = useCallback(async (id: string) => {
    setActiveChildId(id)
    localStorage.setItem('mn_active', id)
    await loadChildData(id)
  }, [loadChildData])

  const activeChild = children.find(c => c.id === activeChildId) ?? null
  const activeTreatments = getActiveTreatments(activeChild)

  const addChild = async (data: q.AddChildInput) => {
    const child = await q.addChild(data)
    setChildren(prev => [...prev, child])
    await switchChild(child.id)
  }

  const updateChild = async (data: q.UpdateChildInput) => {
    await q.updateChild(data)
    setChildren(prev => prev.map(c => c.id === data.id ? { ...c, ...data } : c))
  }

  const deleteChild = async (id: string) => {
    await q.deleteChild(id)
    const next = children.filter(c => c.id !== id)
    setChildren(next)
    if (activeChildId === id) {
      const nextId = next[0]?.id ?? null
      setActiveChildId(nextId)
      if (nextId) {
        localStorage.setItem('mn_active', nextId)
        await loadChildData(nextId)
      } else {
        setLogs({}); setExams([]); setLifestyle({})
      }
    }
  }

  const saveTreatmentLog = async (dateStr: string, atropine: boolean, dreamlens: boolean) => {
    if (!activeChildId) return
    setLogs(prev => ({ ...prev, [dateStr]: { atropine, dreamlens } }))
    await q.saveTreatmentLog(activeChildId, dateStr, atropine, dreamlens)
  }

  const saveExam = async (exam: Omit<ExamRecord, 'id'>) => {
    if (!activeChildId) throw new Error('자녀를 선택해주세요')
    const saved = await q.saveExam(activeChildId, exam)
    setExams(prev => [saved, ...prev])
    return saved
  }

  const updateExam = async (id: string, exam: Omit<ExamRecord, 'id'>) => {
    const updated = await q.updateExam(id, exam)
    setExams(prev => prev.map(e => e.id === id ? updated : e))
  }

  const deleteExam = async (id: string) => {
    await q.deleteExam(id)
    setExams(prev => prev.filter(e => e.id !== id))
  }

  const saveLifestyle = async (dateStr: string, data: { outdoor: number; phone: number; sleep: number }) => {
    if (!activeChildId) return
    setLifestyle(prev => ({ ...prev, [dateStr]: data }))
    await q.saveLifestyle(activeChildId, dateStr, data)
  }

  const deleteLifestyle = async (dateStr: string) => {
    if (!activeChildId) return
    await q.deleteLifestyle(activeChildId, dateStr)
    setLifestyle(prev => { const next = { ...prev }; delete next[dateStr]; return next })
  }

  return (
    <ChildContext.Provider value={{
      children, activeChildId, activeChild, activeTreatments,
      logs, exams, lifestyle, isLoading,
      switchChild, refreshChildren,
      addChild, updateChild, deleteChild,
      saveTreatmentLog, saveExam, updateExam, deleteExam, saveLifestyle, deleteLifestyle,
    }}>
      {node}
    </ChildContext.Provider>
  )
}

export function useChild() {
  const ctx = useContext(ChildContext)
  if (!ctx) throw new Error('useChild must be used within ChildProvider')
  return ctx
}
