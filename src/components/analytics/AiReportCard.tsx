'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useChild } from '@/context/ChildContext'
import { buildReportContext } from '@/lib/aiReport'
import type { AiReport, ReportTopic } from '@/lib/aiReport'
import { fetchLatestReport, saveReport } from '@/lib/supabase/queries'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWandMagicSparkles, faArrowsRotate, faLightbulb, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons'

const TOPIC_LABEL: Record<ReportTopic, string> = {
  axial: '안축장',
  refraction: '굴절',
  lifestyle: '생활습관',
  compliance: '케어',
}

const DISCLAIMER =
  '이 요약은 기록을 쉽게 보기 위한 참고용이며, 진단·처방이 아닙니다. 정확한 판단은 안과 전문의와 상담하세요.'

export default function AiReportCard() {
  const { activeChild, activeChildId, exams, lifestyle, logs, treatmentsForDate, isLoading } = useChild()
  const [report, setReport] = useState<AiReport | null>(null)
  const [meta, setMeta] = useState<{ label: string; createdAt: string } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  // 자녀 전환 시 저장된 최신 리포트 로드 (저장된 건 기본 접힘)
  useEffect(() => {
    let cancelled = false
    if (!activeChildId) { setReport(null); setMeta(null); setLoadingSaved(false); return }
    setLoadingSaved(true)
    fetchLatestReport(activeChildId)
      .then(saved => {
        if (cancelled) return
        if (saved) {
          setReport(saved.payload)
          setMeta({ label: saved.periodLabel, createdAt: saved.createdAt })
          setCollapsed(true)
        } else {
          setReport(null); setMeta(null)
        }
      })
      .catch(() => { if (!cancelled) { setReport(null); setMeta(null) } })
      .finally(() => { if (!cancelled) setLoadingSaved(false) })
    return () => { cancelled = true }
  }, [activeChildId])

  const generate = useCallback(async () => {
    if (!activeChild || !activeChildId) return
    setGenerating(true)
    try {
      const ctx = buildReportContext({ child: activeChild, exams, lifestyle, logs, treatmentsForDate })
      const res = await fetch('/api/myopia-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '리포트 생성에 실패했습니다.')
      const newReport = data.report as AiReport
      setReport(newReport)
      setMeta({ label: ctx.period.label, createdAt: new Date().toISOString() })
      setCollapsed(false) // 방금 생성한 건 펼쳐서 보여줌
      // 저장 (실패해도 화면 표시는 유지)
      saveReport(activeChildId, ctx.period, newReport, data.model).catch(() => {})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '리포트 생성에 실패했습니다.')
    } finally {
      setGenerating(false)
    }
  }, [activeChild, activeChildId, exams, lifestyle, logs, treatmentsForDate])

  if (isLoading || loadingSaved) {
    return <div className="bg-white rounded-2xl p-5 shadow-sm animate-pulse h-28" />
  }

  const hasData = exams.length > 0 || Object.keys(lifestyle).length > 0
  const createdLabel = meta
    ? new Date(meta.createdAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    : ''

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => report && setCollapsed(c => !c)}
          className="flex items-center gap-2 min-w-0"
          aria-expanded={report ? !collapsed : undefined}
        >
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-teal-50 text-teal-600 shrink-0">
            <FontAwesomeIcon icon={faWandMagicSparkles} className="text-sm" />
          </span>
          <h3 className="font-semibold text-gray-800">AI 요약</h3>
          {report && (
            <FontAwesomeIcon
              icon={collapsed ? faChevronDown : faChevronUp}
              className="text-xs text-gray-400 ml-0.5"
            />
          )}
        </button>
        {report && (
          <button
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-1.5 text-xs text-teal-600 font-medium disabled:opacity-40 shrink-0"
          >
            <FontAwesomeIcon icon={faArrowsRotate} className={generating ? 'animate-spin' : ''} />
            다시 생성
          </button>
        )}
      </div>

      {!report && (
        <div className="text-center py-3">
          {hasData ? (
            <>
              <p className="text-sm text-gray-500 mb-3">
                기록을 바탕으로 최근 변화를 한눈에 정리해 드려요.
              </p>
              <button
                onClick={generate}
                disabled={generating}
                className="inline-flex items-center gap-2 bg-teal-500 text-white text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-50"
              >
                <FontAwesomeIcon icon={generating ? faArrowsRotate : faWandMagicSparkles}
                  className={generating ? 'animate-spin' : ''} />
                {generating ? '생성 중…' : '리포트 생성'}
              </button>
              <p className="text-[11px] text-gray-400 mt-3">생성 시 익명화된 측정값이 외부 AI(Upstage)로 전송됩니다.</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">
              검사 기록이나 생활습관을 먼저 기록하면 요약을 만들 수 있어요.
            </p>
          )}
        </div>
      )}

      {report && (
        <div className="space-y-3">
          {/* 접혀도 헤드라인은 보여줌 (간단 요약) */}
          <p
            onClick={() => collapsed && setCollapsed(false)}
            className={`text-[15px] leading-relaxed text-gray-800 font-medium ${collapsed ? 'line-clamp-2 cursor-pointer' : ''}`}
          >
            {report.headline}
          </p>

          {!collapsed && (
            <>
              <div className="space-y-2.5">
                {report.sections.map((s, i) => (
                  <div key={i} className="border-l-2 border-gray-100 pl-3">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[11px] font-medium text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                        {TOPIC_LABEL[s.topic] ?? s.topic}
                      </span>
                      <span className="text-sm font-medium text-gray-700">{s.title}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-600">{s.body}</p>
                  </div>
                ))}
              </div>

              {report.actionTip && (
                <div className="flex gap-2 bg-amber-50 rounded-xl p-3">
                  <FontAwesomeIcon icon={faLightbulb} className="text-amber-500 mt-0.5" />
                  <p className="text-sm leading-relaxed text-amber-900">{report.actionTip}</p>
                </div>
              )}

              <p className="text-[11px] text-gray-400 pt-1">{DISCLAIMER}</p>
              {meta && (
                <p className="text-[11px] text-gray-300">{meta.label} 기준 · {createdLabel} 생성</p>
              )}
            </>
          )}

          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="text-xs text-teal-600 font-medium"
            >
              자세히 보기
            </button>
          )}
        </div>
      )}
    </div>
  )
}
