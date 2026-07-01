// AI 월간 리포트 생성 엔드포인트 (서버측 — UPSTAGE_API_KEY 보관)
//
// ⚠️ 정적 빌드(output:'export')에서는 라우트 핸들러가 빌드되지 않는다.
//    `next dev`에서는 정상 동작하므로 로컬 검증 가능. 프로덕션 게시는 Vercel 이전 후.
//
// 모델: Upstage Solar (OpenAI 호환 API). 모델·엔드포인트는 env로 오버라이드 가능.
// 역할: 클라이언트가 계산해 보낸 ReportContext(익명 숫자)를 받아
//       "자연어 요약"만 생성한다. 산술/진단은 하지 않는다.

import type { ReportContext, AiReport } from '@/lib/aiReport'

const BASE_URL = process.env.SOLAR_BASE_URL || 'https://api.upstage.ai/v1'
const MODEL = process.env.SOLAR_MODEL || 'solar-pro2'

const SYSTEM_PROMPT = `당신은 자녀의 근시 관리를 돕는 따뜻하고 차분한 한국어 도우미입니다. 부모가 읽을 기록 요약을 작성합니다. (자녀마다 검사 주기가 다르므로 "이번 달" 같은 월 단위 표현은 쓰지 말고 "최근 검사 기준"으로 표현하세요.)

[반드시 지킬 규칙]
- 진단·처방·치료 권고를 하지 않습니다. 당신은 "기록을 쉽게 풀어주는" 역할입니다.
- 제공된 숫자만 사용합니다. 새로운 수치를 계산·추정·창작하지 않습니다. 특히 검사 간격이 짧을 때 변화량을 연간으로 임의 환산(예: ×12)하지 마세요 — 연간 추정치는 데이터에 제공된 경우에만 사용합니다.
- 의학적으로 단정하지 않습니다("~로 보입니다", "기록상" 같은 신중한 표현).
- 과한 안심도, 불안을 키우는 표현도 피합니다. 사실 중심으로 담담하게.
- 데이터가 적으면(검사 1회 이하, 기록 일수 적음) 솔직히 그렇다고 말하고 단정을 피합니다.
- 백분위는 "또래 100명 중 ○번째" 식으로 부모가 이해하기 쉽게 풀어줍니다.
- 안축장은 정상적으로도 나이에 따라 길어집니다. "길어졌다"를 무조건 나쁘게 단정하지 마세요.
- 판단·진단은 담당 안과 의료진의 몫입니다. 환자는 이미 진료 중이므로 "상담을 받아보세요" 같은 권유나 불안을 유발하는 표현은 쓰지 말고, 기록을 쉽게 풀어주는 데만 집중합니다.
- 지표를 개별 나열만 하지 말고 관련 있는 것끼리 엮어 관찰을 만드세요(예: 케어 순응도 ↔ 생활습관). 특히 headline은 가장 중요한 관찰 하나를 지표를 엮어 표현합니다.

[출력 — 반드시 아래 JSON 형식만, 다른 텍스트 없이]
{
  "headline": "가장 중요한 관찰 하나를 지표를 엮어 한 문장으로 (담담·따뜻하게, 월 단위 표현 금지)",
  "sections": [
    { "topic": "axial | refraction | lifestyle | compliance 중 하나", "title": "짧은 제목", "body": "2~3문장 설명" }
  ],
  "actionTip": "데이터로 뒷받침되는 생활습관·행동 실천 한 가지(야외활동·스마트폰·수면·케어 습관). 의료·진단·상담성 조언은 금지, 부담 없이 한 가지만."
}
- sections에는 데이터가 있는 항목만 넣습니다 (axial=안축장, refraction=굴절, lifestyle=생활습관, compliance=케어 순응도).

[좋은 예시 — 형식·톤·관찰 방식 참고용. 숫자는 실제 제공 데이터로 대체하세요]
{
  "headline": "케어는 꾸준히 잘 지키고 있어요. 다만 야외활동이 목표보다 조금 적었어요.",
  "sections": [
    { "topic": "compliance", "title": "케어 순응도", "body": "최근 케어를 92% 지켰어요. 꾸준함이 잘 유지되고 있어요." },
    { "topic": "lifestyle", "title": "생활습관", "body": "야외활동은 하루 1.1시간으로 목표(2시간)에는 조금 못 미쳤고, 스마트폰은 하루 3.2시간이었어요." }
  ],
  "actionTip": "주말 낮에 30분 산책부터 시작해 야외활동을 조금씩 늘려보는 건 어떨까요?"
}`

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
      { error: 'UPSTAGE_API_KEY가 설정되지 않았습니다 (.env.local 확인).' },
      { status: 500 }
    )
  }

  let ctx: ReportContext
  try {
    ctx = (await req.json()) as ReportContext
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
            content: `다음은 한 자녀의 근시 관리 기록 요약 데이터입니다(생활습관·케어 통계는 ${ctx.period.label} 기준). 이 숫자만 사용해 부모용 요약을 JSON으로 작성하세요.\n\n${JSON.stringify(ctx, null, 2)}`,
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
    if (!content) {
      return Response.json({ error: 'AI 응답이 비어 있습니다.' }, { status: 502 })
    }

    let report: AiReport
    try {
      report = JSON.parse(extractJson(content)) as AiReport
    } catch {
      return Response.json(
        { error: 'AI 응답을 JSON으로 해석하지 못했습니다.' },
        { status: 502 }
      )
    }
    return Response.json({ report, model: MODEL })
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    return Response.json({ error: `리포트 생성 실패: ${message}` }, { status: 502 })
  }
}
