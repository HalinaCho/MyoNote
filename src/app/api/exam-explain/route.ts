// 검사 결과 즉시 해설 엔드포인트 (서버측 — UPSTAGE_API_KEY 보관)
//
// 검사 1건의 숫자(클라가 계산한 백분위·직전 대비 증감)를 받아
// 핵심 내용별 불렛(소제목+쉬운 설명)으로 풀어준다. 산술/진단은 하지 않는다.

import type { ExamExplainContext, ExamExplanation } from '@/lib/aiReport'

const BASE_URL = process.env.SOLAR_BASE_URL || 'https://api.upstage.ai/v1'
const MODEL = process.env.SOLAR_MODEL || 'solar-pro2'

const SYSTEM_PROMPT = `당신은 자녀의 근시 관리를 돕는 따뜻한 한국어 도우미입니다. 부모가 방금 입력한 "검사 결과 한 건"을, 검사 용어를 전혀 모르는 사람도 이해하도록 쉽게 풀어줍니다.

[설명 방식]
- 줄글 한 문단이 아니라 **핵심 내용별 항목(불렛)으로 나눕니다.** 보통 2~4개.
- 각 항목 = 짧은 label(소제목, 2~6자) + 한두 문장의 쉬운 설명(text).
- 전문용어는 반드시 풀어서: "안축장(눈의 앞뒤 길이)", "굴절도수(근시 정도)" 등.
- 친근하고 다정한 말투. 또래 비교는 "또래 100명 중 ○번째"처럼.
- **이모지는 쓰지 않습니다.** 깔끔한 텍스트로.

[반드시 지킬 규칙]
- 진단·처방·치료 권고 금지. 숫자를 쉽게 풀어주는 역할.
- **제공된 숫자(안축장 mm, 굴절도수 D, 백분위, 증감)만 사용.** 정상범위·평균치·기준치 같은 수치를 절대 지어내지 마세요(예: "보통 22~24mm", "평균 0.1mm 증가" 같은 표현 금지).
- **또래 비교(백분위)는 안축장에만 해당합니다.** 굴절도수(근시 정도)는 또래·연령대 비교 표현("연령대보다 높다" 등)을 쓰지 말고 측정값과 변화만 설명하세요.
- 디오프터(D) 정의나 계산법 같은 헷갈리는 기술 설명은 넣지 마세요. "근시 정도" 정도로 쉽게.
- 검사 간격이 짧으면(수개월 미만) 변화량을 연간으로 환산(예: ×12)하지 마세요. 제공된 기간의 변화만 그대로 설명합니다.
- 의학적으로 단정하지 않기("~로 보여요" 같은 신중한 표현).
- 안축장은 성장하며 자연스럽게 길어집니다. 길어진 것 자체를 무조건 나쁘게 말하지 마세요. 변화가 빠르면 마지막 항목에서 "안과 전문의와 상담"을 부드럽게 권합니다.
- 직전 검사 데이터가 없으면 비교 없이 현재 값만 설명.
- 과한 안심도, 불안을 키우는 표현도 피합니다.

[출력 — JSON만, 다른 텍스트 없이]
{ "points": [ { "label": "짧은 소제목", "text": "쉬운 설명 한두 문장" } ] }`

// 코드펜스로 감싸 오는 경우 대비
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) return fenced[1].trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) return text.slice(start, end + 1)
  return text.trim()
}

export async function POST(req: Request) {
  const apiKey = process.env.UPSTAGE_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: 'UPSTAGE_API_KEY가 설정되지 않았습니다.' },
      { status: 500 }
    )
  }

  let ctx: ExamExplainContext
  try {
    ctx = (await req.json()) as ExamExplainContext
  } catch {
    return Response.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `다음은 자녀의 검사 결과 한 건입니다. 이 숫자만 사용해 핵심 내용별 불렛으로 부모에게 설명하는 JSON을 작성하세요.\n\n${JSON.stringify(ctx, null, 2)}`,
          },
        ],
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      return Response.json(
        { error: `Solar API 오류 (${res.status}): ${detail.slice(0, 300)}` },
        { status: 502 }
      )
    }

    const data = await res.json()
    const content: string | undefined = data?.choices?.[0]?.message?.content
    if (!content || !content.trim()) {
      return Response.json({ error: 'AI 응답이 비어 있습니다.' }, { status: 502 })
    }

    let explanation: ExamExplanation
    try {
      explanation = JSON.parse(extractJson(content)) as ExamExplanation
    } catch {
      return Response.json({ error: 'AI 응답을 JSON으로 해석하지 못했습니다.' }, { status: 502 })
    }
    if (!explanation?.points?.length) {
      return Response.json({ error: 'AI 응답 형식이 올바르지 않습니다.' }, { status: 502 })
    }
    return Response.json({ explanation, model: MODEL })
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    return Response.json({ error: `해설 생성 실패: ${message}` }, { status: 502 })
  }
}
