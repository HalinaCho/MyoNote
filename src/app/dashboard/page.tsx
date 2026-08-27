'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useChild } from '@/context/ChildContext'
import ChildFormModal from '@/components/child/ChildFormModal'
import { today } from '@/lib/utils/date'
import { hasUnseenExam } from '@/lib/aiReport'
import { fetchLatestReport, fetchFeedForChild } from '@/lib/supabase/queries'
import { contrastText, contrastMuted, DEFAULT_BRAND_COLOR } from '@/lib/utils/color'
import HospitalFeedSheet from '@/components/hospital/HospitalFeedSheet'
import PostView from '@/components/hospital/PostView'
import type { HospitalPost } from '@/types'
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
  const [showFeed, setShowFeed] = useState(false)

  // 병원 정보는 ChildContext가 자녀 데이터와 함께 들고 있다(탭 이동 시 헤더가 늦게 뜨지 않게).
  // 여기서는 "새 검사 도착" 판정에 필요한 마지막 AI 리포트 시각만 조회한다.
  // childId를 함께 담아 파생값으로 읽어, 자녀 전환 직후 이전 자녀 기준으로 판정하는 걸 막는다.
  const [reportData, setReportData] =
    useState<{ childId: string; reportAt: string | null; posts: HospitalPost[] } | null>(null)
  const reportLoaded = !!activeChildId && reportData?.childId === activeChildId
  const lastReportAt = reportLoaded ? reportData!.reportAt : null
  const posts = reportLoaded ? reportData!.posts : []

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
    Promise.all([
      fetchLatestReport(childId).catch(() => null),
      fetchFeedForChild(childId).catch(() => []),   // 병원 미연결이면 빈 배열
    ]).then(([report, feed]) => {
      if (!cancelled) setReportData({ childId, reportAt: report?.createdAt ?? null, posts: feed })
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
  const brandColor = hospital?.brandColor || DEFAULT_BRAND_COLOR
  const latestPost = posts[0] ?? null

  return (
    <>
      {/* ── 병원 브랜딩 히어로 (연결된 병원이 있을 때만) ──
          main의 좌우·위 여백(px-4 py-3)을 음수 마진으로 뚫어 화면 폭을 꽉 채우고,
          아래를 넉넉히 비워(pb-16) 그 위로 카드들이 겹쳐 올라오게 한다.
          그림자를 빼는 것도 같은 이유 — 그림자가 있으면 다시 "떠 있는 카드"로 보인다. */}
      {hospital && (
        <section
          className="-mx-4 -mt-3 flex items-center gap-3 px-5 pt-6 pb-16"
          style={{ backgroundColor: brandColor }}
        >
          {hospital.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hospital.logoUrl}
              alt=""
              className="w-12 h-12 rounded-full bg-white object-contain flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-white/25 flex items-center justify-center flex-shrink-0">
              <FontAwesomeIcon icon={faHospital} className="text-lg" style={{ color: contrastText(brandColor) }} />
            </div>
          )}
          <div className="min-w-0">
            {/* 글자색은 배경 밝기에 맞춰 자동 — 원장이 밝은 색을 골라도 병원 이름이 묻히지 않게 */}
            <p className="text-xs" style={{ color: contrastMuted(brandColor) }}>연결된 병원</p>
            <p className="text-lg font-bold truncate" style={{ color: contrastText(brandColor) }}>{hospital.name}</p>
          </div>
        </section>
      )}

      {/* 히어로가 있을 때만 카드 묶음을 위로 끌어올려 겹친다.
          relative를 주는 이유: 겹치는 영역에서 카드가 히어로 위에 그려지도록 쌓임 순서를 확정. */}
      <div className={hospital ? 'relative -mt-10' : ''}>

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

      {/* ── 병원 소식 (최신 1개를 피드처럼 그대로, 나머지는 시트에서) ── */}
      {/* 카드 전체를 버튼으로 감싸지 않는 이유: 안에 영상 iframe과 "더보기"가 들어가
          클릭이 서로 잡아먹는다. 시트 열기는 헤더의 "전체 보기" 버튼이 담당한다. */}
      {latestPost && (
        <section className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
            <FontAwesomeIcon icon={faBullhorn} className="text-teal-500 text-sm" />
            병원 소식
            {posts.length > 1 && (
              <button onClick={() => setShowFeed(true)}
                className="ml-auto flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700">
                전체 {posts.length}개
                <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
              </button>
            )}
          </h2>
          <PostView post={latestPost} preview />
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
          <p className="text-xs text-gray-400 mt-0.5">케어 탭에서 오늘의 케어·생활습관을 체크할 수 있어요</p>
        </div>
        <FontAwesomeIcon icon={faChevronRight} className="text-xs text-gray-300 flex-shrink-0" />
      </button>

      </div>

      <HospitalFeedSheet
        open={showFeed}
        onClose={() => setShowFeed(false)}
        hospitalName={hospital?.name ?? '병원'}
        posts={posts}
      />

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
