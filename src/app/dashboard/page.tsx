'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useChild } from '@/context/ChildContext'
import ChildFormModal from '@/components/child/ChildFormModal'
import { today } from '@/lib/utils/date'
import { hasUnseenExam } from '@/lib/aiReport'
import { fetchLatestReport } from '@/lib/supabase/queries'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faCalendarDays, faPen, faCommentDots, faHospital, faBullhorn, faFileWaveform, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import OnboardingFlow from '@/components/onboarding/OnboardingFlow'
import TabSkeleton from '@/components/ui/TabSkeleton'
import ChatSheet from '@/components/chat/ChatSheet'

export default function HomePage() {
  const router = useRouter()
  const { activeChild, activeChildId, exams, isLoading, updateExam, hospital } = useChild()
  const [showAddChild, setShowAddChild] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [editingAppt, setEditingAppt] = useState(false)
  const [apptDate, setApptDate] = useState('')

  // 병원 정보는 ChildContext가 자녀 데이터와 함께 들고 있다(탭 이동 시 헤더가 늦게 뜨지 않게).
  // 여기서는 "새 검사 도착" 판정에 필요한 마지막 AI 리포트 시각만 조회한다.
  // childId를 함께 담아 파생값으로 읽어, 자녀 전환 직후 이전 자녀 기준으로 판정하는 걸 막는다.
  const [reportData, setReportData] = useState<{ childId: string; reportAt: string | null } | null>(null)
  const reportLoaded = !!activeChildId && reportData?.childId === activeChildId
  const lastReportAt = reportLoaded ? reportData!.reportAt : null

  const todayStr = today()

  useEffect(() => {
    const handler = () => setShowAddChild(true)
    document.addEventListener('open-add-child', handler)
    return () => document.removeEventListener('open-add-child', handler)
  }, [])

  useEffect(() => {
    if (!activeChildId) return
    let cancelled = false
    const childId = activeChildId
    fetchLatestReport(childId)
      .catch(() => null)
      .then(report => {
        if (!cancelled) setReportData({ childId, reportAt: report?.createdAt ?? null })
      })
    return () => { cancelled = true }
  }, [activeChildId])

  if (isLoading) return <TabSkeleton />

  if (!activeChild) {
    return <OnboardingFlow />
  }

  const nextAppt = exams
    .filter(e => e.nextAppointment && e.nextAppointment >= todayStr)
    .sort((a, b) => a.nextAppointment.localeCompare(b.nextAppointment))[0]
  const dDays = nextAppt
    ? Math.round((new Date(nextAppt.nextAppointment).getTime() - new Date(todayStr).getTime()) / 86400000)
    : null

  // 마지막 리포트 이후 새 검사가 들어왔는지 — 조회가 끝난 뒤에만 판정(깜빡임 방지)
  const newExam = reportLoaded && hasUnseenExam(exams, lastReportAt)

  return (
    <>
      {/* ── 병원 브랜딩 헤더 (연결된 병원이 있을 때만) ── */}
      {hospital && (
        <section
          className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-3 shadow-sm"
          style={{ backgroundColor: hospital.brandColor || '#14b8a6' }}
        >
          {hospital.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hospital.logoUrl}
              alt=""
              className="w-10 h-10 rounded-full bg-white object-contain flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center flex-shrink-0">
              <FontAwesomeIcon icon={faHospital} className="text-white" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs text-white/75">연결된 병원</p>
            <p className="font-bold text-white truncate">{hospital.name}</p>
          </div>
        </section>
      )}

      {/* ── 새 검사 결과 도착 배너 ── */}
      {newExam && (
        <button
          onClick={() => router.push('/dashboard/analytics')}
          className="w-full flex items-center gap-3 bg-teal-50 rounded-2xl px-4 py-3 mb-3 text-left transition-colors hover:bg-teal-100/70"
        >
          <FontAwesomeIcon icon={faFileWaveform} className="text-base text-teal-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-teal-700">새 검사 결과가 도착했어요</p>
            <p className="text-xs text-teal-500 mt-0.5">분석 탭에서 AI 요약을 확인해보세요</p>
          </div>
          <FontAwesomeIcon icon={faChevronRight} className="text-xs text-teal-400 flex-shrink-0" />
        </button>
      )}

      {/* ── 다음 예약일 ── */}
      {nextAppt && (
        <section className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-gray-800">다음 병원 예약일</h2>
            {!editingAppt && (
              <button onClick={() => { setApptDate(nextAppt.nextAppointment); setEditingAppt(true) }}
                className="text-gray-300 hover:text-gray-500 text-sm p-1 transition-colors">
                <FontAwesomeIcon icon={faPen} />
              </button>
            )}
          </div>
          {editingAppt ? (
            <div className="mt-2 flex items-center gap-2">
              <input type="date" value={apptDate} onChange={e => setApptDate(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 accent-teal-500" />
              <button onClick={async () => {
                if (!apptDate) return
                try {
                  await updateExam(nextAppt.id, { ...nextAppt, nextAppointment: apptDate })
                  toast.success('예약일이 수정되었습니다')
                } catch { toast.error('수정에 실패했습니다') }
                setEditingAppt(false)
              }} className="bg-teal-500 hover:bg-teal-600 text-white text-sm px-3 py-2 rounded-lg font-medium transition-colors">
                저장
              </button>
              <button onClick={() => setEditingAppt(false)}
                className="text-gray-400 hover:text-gray-600 text-sm p-2">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between mt-2">
              <span className="flex items-center gap-1.5 text-gray-700 text-sm font-medium">
                <FontAwesomeIcon icon={faCalendarDays} className="text-gray-400 text-xs" />
                {nextAppt.nextAppointment}
              </span>
              <span className={`text-base font-bold px-3 py-1 rounded-full
                ${dDays! <= 3 ? 'bg-rose-50 text-rose-500'
                  : dDays! <= 7 ? 'bg-[#fde68a]/40 text-amber-600'
                  : 'bg-teal-50 text-teal-500'}`}>
                {dDays === 0 ? 'D-Day' : `D-${dDays}`}
              </span>
            </div>
          )}
          {nextAppt.clinic && !editingAppt &&
            <p className="text-xs text-gray-400 mt-1">{nextAppt.clinic}</p>}
        </section>
      )}

      {/* ── 병원 공지 ── */}
      {hospital?.notice && (
        <section className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
            <FontAwesomeIcon icon={faBullhorn} className="text-teal-500 text-sm" />
            병원 공지
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{hospital.notice}</p>
        </section>
      )}

      {/* ── 아무것도 없을 때 안내 ── */}
      {reportLoaded && !hospital && !nextAppt && !newExam && (
        <section className="bg-white rounded-2xl p-5 mb-3 shadow-sm text-center">
          <p className="text-sm text-gray-500">아직 연결된 병원이 없어요.</p>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            병원에서 검사 결과를 입력하면 예약일과 병원 공지가 여기에 표시됩니다.
          </p>
          <button
            onClick={() => router.push('/dashboard/records')}
            className="mt-3 inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            검사 기록 추가
          </button>
        </section>
      )}

      {/* ── 케어 기록 바로가기 ── */}
      <button
        onClick={() => router.push('/dashboard/calendar')}
        className="w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3 mb-3 shadow-sm text-left transition-colors hover:bg-gray-50"
      >
        <FontAwesomeIcon icon={faCalendarDays} className="text-base text-teal-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">오늘의 케어 기록하기</p>
          <p className="text-xs text-gray-400 mt-0.5">캘린더 탭에서 케어·생활습관을 체크할 수 있어요</p>
        </div>
        <FontAwesomeIcon icon={faChevronRight} className="text-xs text-gray-300 flex-shrink-0" />
      </button>

      <ChildFormModal open={showAddChild} onClose={() => setShowAddChild(false)} />

      {/* AI 상담 챗 버블 */}
      <button
        onClick={() => setShowChat(true)}
        className="fixed bottom-24 z-40 w-14 h-14 bg-teal-500 hover:bg-teal-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors active:scale-95"
        style={{ right: 'max(1rem, calc((100vw - 480px) / 2 + 1rem))' }}
        aria-label="AI 상담"
      >
        <FontAwesomeIcon icon={faCommentDots} className="text-xl" />
      </button>
      <ChatSheet open={showChat} onClose={() => setShowChat(false)} />
    </>
  )
}
