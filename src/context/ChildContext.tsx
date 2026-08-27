'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { Child, ExamRecord, TreatmentLogs, LifestyleLogs, TreatmentDef, Hospital } from '@/types'
import { getActiveTreatments, mergeTreatments } from '@/lib/treatments'
import * as q from '@/lib/supabase/queries'
import { today } from '@/lib/utils/date'

interface ChildContextType {
  children: Child[]
  activeChildId: string | null
  activeChild: Child | null
  activeTreatments: TreatmentDef[]                       // 오늘 활성 케어
  treatmentsForDate: (dateStr: string) => TreatmentDef[] // 날짜별 활성 케어
  logs: TreatmentLogs
  exams: ExamRecord[]
  lifestyle: LifestyleLogs
  hospital: Hospital | null                              // 현재 담당 병원(자녀 데이터와 함께 로드)
  isLoading: boolean
  switchChild: (id: string) => Promise<void>
  refreshChildren: () => Promise<void>
  refreshHospital: () => Promise<Hospital | null>        // 위치 매칭으로 병원이 바뀐 직후 재조회
  addChild: (data: q.ChildFormInput) => Promise<void>
  updateChild: (data: q.ChildFormUpdateInput) => Promise<void>
  deleteChild: (id: string) => Promise<void>
  saveTreatmentLog: (dateStr: string, done: Record<string, boolean>) => Promise<void>
  saveExam: (exam: Omit<ExamRecord, 'id'>, enteredByHospitalId?: string | null) => Promise<ExamRecord>
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
  const [hospital, setHospital] = useState<Hospital | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 병원 정보를 자녀 데이터와 함께 여기서 로드하는 이유: 탭을 옮길 때마다 화면이 새로 마운트돼도
  // Provider는 대시보드 레이아웃에 살아있어서, 홈의 병원 헤더가 뒤늦게 나타나지 않는다.
  const loadChildData = useCallback(async (childId: string) => {
    const [data, connected] = await Promise.all([
      q.fetchChildData(childId),
      q.fetchMyConnectedHospital(childId).catch(() => null),  // 병원 조회 실패가 자녀 데이터를 막지 않게
    ])
    setLogs(data.logs)
    setExams(data.exams)
    setLifestyle(data.lifestyle)
    setHospital(connected)
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

  const refreshHospital = useCallback(async () => {
    if (!activeChildId) return null
    const connected = await q.fetchMyConnectedHospital(activeChildId).catch(() => null)
    setHospital(connected)
    return connected
  }, [activeChildId])

  const switchChild = useCallback(async (id: string) => {
    setActiveChildId(id)
    localStorage.setItem('mn_active', id)
    await loadChildData(id)
  }, [loadChildData])

  const activeChild = children.find(c => c.id === activeChildId) ?? null
  const activeTreatments = getActiveTreatments(activeChild, today())
  const treatmentsForDate = useCallback(
    (dateStr: string) => getActiveTreatments(activeChild, dateStr),
    [activeChild]
  )

  // 폼이 넘긴 활성 집합(data.treatments)을 기존 정의와 병합해 기간 갱신
  const addChild = async (data: q.ChildFormInput) => {
    const merged = mergeTreatments([], data.treatments, today())
    const child = await q.addChild({ ...data, treatments: merged })
    setChildren(prev => [...prev, child])
    await switchChild(child.id)
  }

  const updateChild = async (data: q.ChildFormUpdateInput) => {
    const old = children.find(c => c.id === data.id)
    const merged = mergeTreatments(old?.treatments ?? [], data.treatments, today())
    const payload = { ...data, treatments: merged }
    await q.updateChild(payload)
    setChildren(prev => prev.map(c => c.id === data.id ? { ...c, ...payload } : c))
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

  const saveTreatmentLog = async (dateStr: string, done: Record<string, boolean>) => {
    if (!activeChildId) return
    setLogs(prev => ({ ...prev, [dateStr]: done }))
    await q.saveTreatmentLog(activeChildId, dateStr, done)
  }

  const sortExams = (list: ExamRecord[]) =>
    [...list].sort((a, b) => b.date.localeCompare(a.date))

  const saveExam = async (exam: Omit<ExamRecord, 'id'>, enteredByHospitalId?: string | null) => {
    if (!activeChildId) throw new Error('자녀를 선택해주세요')
    const saved = await q.saveExam(activeChildId, exam, enteredByHospitalId)
    setExams(prev => sortExams([saved, ...prev]))
    return saved
  }

  const updateExam = async (id: string, exam: Omit<ExamRecord, 'id'>) => {
    const updated = await q.updateExam(id, exam)
    setExams(prev => sortExams(prev.map(e => e.id === id ? updated : e)))
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
      children, activeChildId, activeChild, activeTreatments, treatmentsForDate,
      logs, exams, lifestyle, hospital, isLoading,
      switchChild, refreshChildren, refreshHospital,
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
