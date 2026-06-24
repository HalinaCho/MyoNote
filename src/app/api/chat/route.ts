// 부모용 근시 Q&A 챗봇 (서버측 — UPSTAGE_API_KEY 보관)
//
// Solar 멀티턴 대화. 클라가 보낸 '자녀 기록 요약'(익명 숫자)으로 그라운딩해
// "우리 아이..." 질문에 실제 수치로 답한다. 진단/처방은 하지 않는다.

import type { ReportContext } from '@/lib/aiReport'

const BASE_URL = process.env.SOLAR_BASE_URL || 'https://api.upstage.ai/v1'
const MODEL = process.env.SOLAR_MODEL || 'solar-pro2'

interface ChatMessage { role: 'user' | 'assistant'; content: string }

const SYSTEM = `당신은 마이오노트의 'AI 상담' 도우미입니다. 자녀의 근시 관리를 돕는 부모와 한국어로 대화합니다.

[역할·범위]
- 근시·눈 건강·근시 관리(아트로핀/드림렌즈/안경, 야외활동·스마트폰 등 생활습관, 검사 수치의 의미)와 이 앱 사용에 관한 질문에 답합니다.
- 범위를 벗어난 질문(앱·근시와 무관한 주제, 다른 질환 상담 등)은 정중히 안내하고 근시 관련 주제로 부드럽게 유도합니다.

[안전 — 반드시]
- 진단·처방·약물 용량 결정을 하지 않습니다. 일반적인 정보는 제공하되, 개별 치료 결정이나 증상 판단은 "안과 전문의와 상담"으로 안내합니다.
- 갑작스러운 시력저하·눈 통증·사시 등 우려되는 증상은 빠른 안과 진료를 권합니다.
- 아래 제공되는 '자녀 기록 요약'의 숫자만 인용합니다. 없는 수치(정상범위·평균치 등)를 지어내지 않습니다. 데이터가 없거나 질문과 무관하면 일반 정보로 답합니다.
- 또래 비교는 제공된 안축장 백분위만 사용합니다(굴절도수는 또래 비교 표현 금지).

[말투·형식]
- 사용자의 질문에 먼저 직접 답합니다(질문 범위를 벗어나 설명을 늘어놓지 않기).
- 따뜻하고 쉬운 한국어. 너무 길지 않게(보통 2~5문장), 필요하면 짧은 항목으로 정리.
- **별표(*), 해시(#) 등 마크다운 문법은 쓰지 마세요.** 강조는 평범한 문장으로, 목록이 필요하면 '· '로 시작하는 줄로 표현합니다.
- 확신이 없으면 솔직히 말합니다.`

// 잔여 마크다운 정리 (채팅 버블은 평문 렌더)
function cleanReply(s: string): string {
  return s
    .replace(/\*\*/g, '')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .trim()
}

export async function POST(req: Request) {
  const apiKey = process.env.UPSTAGE_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'UPSTAGE_API_KEY가 설정되지 않았습니다.' }, { status: 500 })
  }

  let body: { messages?: ChatMessage[]; child?: ReportContext | null }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const history = Array.isArray(body.messages) ? body.messages.slice(-20) : []
  if (!history.length) {
    return Response.json({ error: '메시지가 비어 있습니다.' }, { status: 400 })
  }

  const childBlock = body.child
    ? `\n\n[현재 보고 있는 자녀 기록 요약 — 이름 등 식별정보 없음]\n${JSON.stringify(body.child)}`
    : '\n\n(현재 선택된 자녀의 기록 데이터가 제공되지 않았습니다. 일반 정보로 답하세요.)'

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM + childBlock },
          ...history.map(m => ({ role: m.role, content: m.content })),
        ],
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      return Response.json({ error: `Solar API 오류 (${res.status}): ${detail.slice(0, 300)}` }, { status: 502 })
    }

    const data = await res.json()
    const reply: string | undefined = data?.choices?.[0]?.message?.content
    if (!reply || !reply.trim()) {
      return Response.json({ error: 'AI 응답이 비어 있습니다.' }, { status: 502 })
    }
    return Response.json({ reply: cleanReply(reply), model: MODEL })
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    return Response.json({ error: `응답 생성 실패: ${message}` }, { status: 502 })
  }
}
