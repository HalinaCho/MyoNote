// 부모용 근시 Q&A 챗봇 (서버측 — UPSTAGE_API_KEY 보관)
//
// Solar 멀티턴 대화. 클라가 보낸 '자녀 기록 요약'(익명 숫자)으로 그라운딩해
// "우리 아이..." 질문에 실제 수치로 답한다. 진단/처방은 하지 않는다.

import type { ReportContext } from '@/lib/aiReport'

const BASE_URL = process.env.SOLAR_BASE_URL || 'https://api.upstage.ai/v1'
const MODEL = process.env.SOLAR_MODEL || 'solar-pro2'

interface ChatMessage { role: 'user' | 'assistant'; content: string }

const SYSTEM = `당신은 마이오노트 'AI 상담'입니다. 자녀 근시 관리에 대한 부모의 질문에 한국어로 답합니다. 아래 규칙을 반드시 지키세요.

1. 사용자가 물은 바로 그 질문에만 답합니다. "A와 B 차이"면 A와 B를 비교하고, "왜 중요?"면 이유를 답합니다. 묻지 않은 일반 근시관리 조언(야외활동·검진 목록 등)을 덧붙이지 마세요.
2. 근시·눈건강·이 앱과 무관한 주제(날씨·타 질환 등)는 답하지 말고 "근시 관리에 관한 것만 도와드릴 수 있어요"라고 정중히 안내하세요.
3. 진단·처방·약 용량 결정은 하지 않습니다. 개별 치료 결정·증상 판단은 "안과 전문의와 상담"으로 안내하세요. 시력 급저하·눈 통증·사시 등은 빠른 진료를 권하세요.
4. 제공된 '자녀 기록'의 숫자만 인용하고, 없는 수치(정상범위·평균 등)는 지어내지 마세요. 또래 비교는 안축장 백분위만 사용(굴절은 또래 비교 금지).
5. 별표(*)·해시(#) 등 마크다운 금지. 따뜻하고 쉬운 평문. 확신 없으면 솔직히.`

const STYLE_GUIDE: Record<string, string> = {
  short: '답변 길이: 아주 짧게. 1~2문장으로 핵심만. 목록(·)을 만들지 말고 문장으로.',
  normal: '답변 길이: 적당히. 2~4문장. 필요할 때만 짧은 목록.',
  detailed: '답변 길이: 필요하면 항목을 나눠 충분히 설명하되, 장황하지 않게.',
}

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

  let body: { messages?: ChatMessage[]; child?: ReportContext | null; style?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const styleGuide = STYLE_GUIDE[body.style ?? 'short'] ?? STYLE_GUIDE.short
  const history = Array.isArray(body.messages) ? body.messages.slice(-20) : []
  if (!history.length) {
    return Response.json({ error: '메시지가 비어 있습니다.' }, { status: 400 })
  }

  const childBlock = body.child
    ? `\n\n[현재 보고 있는 자녀 기록 요약 — 이름 등 식별정보 없음]\n${JSON.stringify(body.child)}`
    : '\n\n(자녀별 기록 데이터는 제공되지 않았습니다. 데이터 기반 답이 필요한 질문이면 "기록을 보려면 자녀를 선택해 달라"고 안내하고, 그 외에는 질문에 그대로 답하세요.)'

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: `${SYSTEM}\n\n[${styleGuide}]${childBlock}` },
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
