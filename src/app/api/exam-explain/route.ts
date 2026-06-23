// 검사 결과 즉시 해설 엔드포인트 (서버측 — UPSTAGE_API_KEY 보관)
//
// 검사 1건의 숫자(클라가 계산한 백분위·직전 대비 증감)를 받아
// 부모용 짧은 해설 1문단만 생성한다. 산술/진단은 하지 않는다.

import type { ExamExplainContext } from '@/lib/aiReport'

const BASE_URL = process.env.SOLAR_BASE_URL || 'https://api.upstage.ai/v1'
const MODEL = process.env.SOLAR_MODEL || 'solar-pro2'

const SYSTEM_PROMPT = `당신은 자녀의 근시 관리를 돕는 따뜻하고 차분한 한국어 도우미입니다. 부모가 방금 입력한 "검사 결과 한 건"을 이해하기 쉽게 풀어줍니다.

[반드시 지킬 규칙]
- 진단·처방·치료 권고를 하지 않습니다. 숫자를 "쉽게 풀어주는" 역할입니다.
- 제공된 숫자만 사용합니다. 새로운 수치를 계산·추정·창작하지 않습니다.
- 의학적으로 단정하지 않습니다("~로 보입니다", "기록상" 같은 신중한 표현).
- 백분위는 "또래 100명 중 ○번째" 식으로 풀어줍니다.
- 안축장은 성장하며 자연스럽게 길어집니다. 직전보다 길어진 것을 무조건 나쁘게 단정하지 마세요. 변화 속도가 빠르면 "정확한 판단은 안과 전문의와 상담"으로 연결합니다.
- 직전 검사 데이터가 없으면 비교 없이 현재 값만 설명합니다.
- 과한 안심도, 불안을 키우는 표현도 피합니다.

[출력 형식]
- 2~3문장의 자연스러운 한국어 한 문단. 마크다운·목록·제목 없이 평문으로만.`

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
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `다음은 자녀의 검사 결과 한 건입니다. 이 숫자만 사용해 부모에게 한 문단으로 설명해 주세요.\n\n${JSON.stringify(ctx, null, 2)}`,
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
    return Response.json({ explanation: content.trim(), model: MODEL })
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    return Response.json({ error: `해설 생성 실패: ${message}` }, { status: 502 })
  }
}
