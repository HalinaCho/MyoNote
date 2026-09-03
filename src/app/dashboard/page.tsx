'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useChild } from '@/context/ChildContext'
import ChildFormModal from '@/components/child/ChildFormModal'
import { today } from '@/lib/utils/date'
import { safeBrandColor, onWhite, tint } from '@/lib/utils/color'
import { hasUnseenExam } from '@/lib/aiReport'
import { fetchLatestReport, fetchFeedForChild } from '@/lib/supabase/queries'
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

  // 예약일 카드는 "임박했을 때만" 색으로 반응한다. 항상 빨간 카드면 금세 무뎌져서
  // 정작 급할 때 안 보인다 — 평소엔 다른 카드와 같은 흰 카드로 둔다.
  const apptUrgency = dDays == null ? 'far' : dDays <= 3 ? 'near' : dDays <= 7 ? 'soon' : 'far'
  const APPT_STYLE = {
    near: { card: 'bg-rose-50 border-2 border-rose-200', dday: 'text-rose-500',   label: 'text-rose-400',  sub: 'text-rose-500/80' },
    soon: { card: 'bg-amber-50 border-2 border-amber-200', dday: 'text-amber-600', label: 'text-amber-500', sub: 'text-amber-600/80' },
    far:  { card: 'bg-white shadow-sm', dday: 'text-teal-600', label: 'text-gray-400', sub: 'text-gray-500' },
  }[apptUrgency]

  // "9월 15일 (월)" — 부모가 달력을 떠올리기 쉬운 형태로
  const apptLabel = nextAppt
    ? new Date(nextAppt.nextAppointment).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
    : ''
  // 병원 브랜드 컬러 — 값이 없거나 깨졌으면 기본 teal로 돌아온다(예전 bg-teal-50과 같은 모습).
  const brand = safeBrandColor(hospital?.brandColor)

  // D-day 칩 — 팔레트의 "틴트 배경 + 틴트 위 텍스트" 짝을 그대로 쓴다.
  // 평소에는 병원 색: 부모가 홈에서 제일 자주 보는 숫자라 "병원이 잡아준 날"로 읽힌다.
  // 7일 이내 amber, 3일 이내 rose — 임박 신호가 병원 색보다 우선한다(병원 색이 이걸 덮으면 안 된다).
  const apptChipCls = apptUrgency === 'near' ? 'bg-[#ffe4e6] text-[#be123c]'
    : apptUrgency === 'soon' ? 'bg-[#fef3c7] text-[#b45309]'
    : ''
  const apptChipStyle = apptUrgency === 'far'
    ? { background: tint(brand, 0.12), color: onWhite(brand, 0.12) }
    : undefined
  const HOME_POSTS = 3                 // 홈에 펼쳐 보여줄 최신 글 수 — 나머지는 시트에서
  const shownPosts = posts.slice(0, HOME_POSTS)

  return (
    <>
      {/* ── 병원 카드 (연결된 병원이 있을 때만) ──
          다른 카드와 같은 흰 카드. 색 면으로 구분하려 여러 번 시도했지만 이 앱의 밝은 톤에서는
          어떤 색이든 덩어리로 튀었다. 구분은 색이 아니라 위치(맨 위)와 내용으로 충분하다.
          (카드 상단 선도 시도했으나 둥근 모서리에 사각형 선이 잘려 보여서 접었다.)
          병원 고유색은 원래 teal이 칠해져 있던 두 자리 — 로고 뒤 원과 D-day 배지 — 에만 들어간다.
          새 색면을 더하는 게 아니라 이미 있던 색을 갈아끼우는 것이라 덩어리로 튀지 않는다. */}
      {hospital && (
        <section className="bg-white rounded-2xl mb-3 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            {/* 로고 자리 — 하드한 2px 테두리 대신 브랜드색 옅은 원 위에 로고를 얹는다.
                흰 바탕에 채도 높은 선이 그어지면 스티커처럼 겉돌지만, 면으로 깔면 로고 뒤 후광이 된다.
                로고가 없는 병원은 이 원이 곧 아이콘 배경이라 분기 없이 그대로 성립한다. */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: tint(brand, 0.10) }}
            >
              {hospital.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={hospital.logoUrl}
                  alt=""
                  className="w-11 h-11 rounded-full bg-white object-contain"
                />
              ) : (
                <FontAwesomeIcon icon={faHospital} style={{ color: onWhite(brand, 0.10) }} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-400">연결된 병원</p>
              <p className="font-bold text-gray-800 truncate">{hospital.name}</p>
            </div>
          </div>

          {/* 방문 예정일 — D-day만 두면 무슨 기념일처럼 읽힌다. 라벨과 날짜를 먼저 읽히게 두고
              남은 날짜는 오른쪽 칩으로. 줄 전체가 수정 버튼이다. */}
          {nextAppt && !editingAppt && (
            <button
              onClick={() => { setApptDate(nextAppt.nextAppointment); setEditingAppt(true) }}
              aria-label={`방문 예정일 ${apptLabel}, 눌러서 수정`}
              className="mt-3 pt-3 w-full flex items-center justify-between gap-3 border-t border-gray-100 text-left transition-colors hover:bg-gray-50/60"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                  <FontAwesomeIcon icon={faCalendarDays} className="text-[10px]" />
                  방문 예정일
                </span>
                <span className="block mt-0.5 text-[15px] font-semibold text-gray-800 truncate">
                  {apptLabel}
                </span>
              </span>
              <span className={`flex-shrink-0 rounded-xl px-3 py-1.5 text-base font-bold tabular-nums ${apptChipCls}`}
                style={apptChipStyle}>
                {dDays === 0 ? 'D-Day' : `D-${dDays}`}
              </span>
            </button>
          )}
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

      {/* ── 다음 예약일 카드 ──
          병원이 연결돼 있으면 히어로 우측 배지가 이 역할을 하므로 카드는 숨긴다.
          날짜를 고치는 중이거나(배지를 눌렀을 때) 병원 미연결이라 히어로 자체가 없을 때만 띄운다. */}
      {nextAppt && (editingAppt || !hospital) && (
        <section className={`rounded-2xl p-4 mb-3 transition-colors ${APPT_STYLE.card}`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-xs font-semibold ${APPT_STYLE.label}`}>방문 예정일</h2>
            {!editingAppt && (
              <button onClick={() => { setApptDate(nextAppt.nextAppointment); setEditingAppt(true) }}
                aria-label="방문 예정일 수정"
                className={`${APPT_STYLE.label} hover:opacity-70 text-sm p-1 transition-opacity`}>
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
            <div>
              {/* 남은 날짜가 주인공 — 배지로 작게 두면 다른 카드 제목들에 묻힌다 */}
              <p className={`text-3xl font-bold leading-none mt-1 ${APPT_STYLE.dday}`}>
                {dDays === 0 ? 'D-Day' : `D-${dDays}`}
              </p>
              <p className={`mt-1.5 text-sm font-medium flex items-center gap-1.5 ${APPT_STYLE.sub}`}>
                <FontAwesomeIcon icon={faCalendarDays} className="text-xs opacity-70" />
                {apptLabel}
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── 병원 소식 (최신 1개를 피드처럼 그대로, 나머지는 시트에서) ── */}
      {/* 카드 전체를 버튼으로 감싸지 않는 이유: 안에 영상 iframe과 "더보기"가 들어가
          클릭이 서로 잡아먹는다. 시트 열기는 헤더의 "전체 보기" 버튼이 담당한다. */}
      {shownPosts.length > 0 && (
        <section className="mb-3">
          <h2 className="font-bold text-gray-800 mb-2 px-1 flex items-center gap-2">
            <FontAwesomeIcon icon={faBullhorn} className="text-teal-500 text-sm" />
            병원 소식
            {posts.length > shownPosts.length && (
              <button onClick={() => setShowFeed(true)}
                className="ml-auto flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700">
                전체 {posts.length}개
                <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
              </button>
            )}
          </h2>
          {/* 글마다 카드 하나 — 한 카드에 몰아넣으면 어디까지가 한 글인지 구분이 안 된다 */}
          <div className="space-y-2">
            {shownPosts.map(post => (
              <div key={post.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <PostView post={post} preview />
              </div>
            ))}
          </div>
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
