'use client'

import { useState, useRef, useEffect } from 'react'
import { useChild } from '@/context/ChildContext'
import { buildReportContext } from '@/lib/aiReport'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faPaperPlane, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons'

interface Msg { role: 'user' | 'assistant'; content: string }

const EXAMPLES = [
  '드림렌즈랑 아트로핀, 뭐가 다른가요?',
  '야외활동이 근시에 왜 중요해요?',
  '우리 아이 진행이 빠른 편인가요?',
]

export default function ChatSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activeChild, exams, lifestyle, logs, treatmentsForDate } = useChild()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  if (!open) return null

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || loading) return
    const next: Msg[] = [...messages, { role: 'user', content: q }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const child = activeChild
        ? buildReportContext({ child: activeChild, exams, lifestyle, logs, treatmentsForDate })
        : null
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, child }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '응답을 받지 못했어요.')
      setMessages(m => [...m, { role: 'assistant', content: data.reply }])
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: `⚠️ ${e instanceof Error ? e.message : '오류가 발생했어요.'}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/30">
      <div className="w-full max-w-[480px] bg-[#edf7f6] flex flex-col h-full">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 h-14 bg-teal-500 text-white shrink-0">
          <div className="flex items-center gap-2 font-bold">
            <FontAwesomeIcon icon={faWandMagicSparkles} />
            AI 상담
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xl" aria-label="닫기">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* 메시지 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                근시 관리에 대해 무엇이든 물어보세요. {activeChild ? `${activeChild.name}의 기록을 바탕으로 답해드려요.` : '자녀를 선택하면 그 아이 기록을 바탕으로 답해드려요.'}
              </p>
              <div className="space-y-2">
                {EXAMPLES.map(ex => (
                  <button key={ex} onClick={() => send(ex)}
                    className="block w-full text-left text-sm bg-white border border-teal-100 text-teal-700 rounded-xl px-3 py-2.5 hover:bg-teal-50 transition-colors">
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line
                  ${m.role === 'user' ? 'bg-teal-500 text-white' : 'bg-white text-gray-700 shadow-sm'}`}>
                  {m.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-400 text-sm rounded-2xl px-3.5 py-2.5 shadow-sm">입력 중…</div>
            </div>
          )}
        </div>

        {/* 면책 + 입력 */}
        <p className="px-4 pb-1 text-[11px] text-gray-400 shrink-0">
          AI 답변은 참고용이며 진단이 아닙니다. 정확한 판단은 안과 전문의와 상담하세요.
        </p>
        <div className="flex items-end gap-2 px-3 pb-4 pt-1 shrink-0 safe-pb">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
            placeholder="궁금한 점을 입력하세요"
            rows={1}
            className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 max-h-28"
          />
          <button onClick={() => send(input)} disabled={loading || !input.trim()}
            className="shrink-0 w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
            aria-label="보내기">
            <FontAwesomeIcon icon={faPaperPlane} />
          </button>
        </div>
      </div>
    </div>
  )
}
