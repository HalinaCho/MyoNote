// 검사지 사진 → 필드 추출 (Upstage Information Extract, 서버측 키)
//
// 검사지 종류별 스키마로 추출:
//   - axial:      안축장 R/L (mm), 검사일
//   - refraction: 구면(S)·원주(C) R/L (부호 포함, plus-cyl이면 +), 검사일
// 추출만 하고 저장은 안 한다. 부호 정규화·폼 매핑은 클라이언트에서.

const BASE_URL = process.env.SOLAR_BASE_URL || 'https://api.upstage.ai/v1'
const IE_URL = `${BASE_URL}/information-extraction`
const IE_MODEL = 'information-extract'

const AXIAL_SCHEMA = {
  name: 'axial_exam',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      examDate: { type: 'string', description: '검사를 시행·측정한 날짜(검사일/측정일). 반드시 YYYY-MM-DD 형식. 검사지에 여러 날짜(생년월일·출력일/인쇄일·다음예약일)가 있어도 그것들이 아닌 실제 측정 시점을 고른다. 날짜가 없으면 null' },
      axialRight: { type: 'number', description: "오른쪽 눈(R/OD)의 안축장(Axial Length, AL) 값, mm 단위(예: 23.84). 없으면 null" },
      axialLeft: { type: 'number', description: "왼쪽 눈(L/OS)의 안축장(Axial Length, AL) 값, mm 단위. 없으면 null" },
    },
    required: ['examDate', 'axialRight', 'axialLeft'],
  },
}

const REFRACTION_SCHEMA = {
  name: 'refraction_exam',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      examDate: { type: 'string', description: '검사를 시행·측정한 날짜(검사일/측정일). 반드시 YYYY-MM-DD 형식. 검사지에 여러 날짜(생년월일·출력일/인쇄일·다음예약일)가 있어도 그것들이 아닌 실제 측정 시점을 고른다. 날짜가 없으면 null' },
      sphRight: { type: 'number', description: '오른쪽 눈(R/OD)의 구면(Sphere, S) 도수. 부호 그대로(예: -3.00, +1.25). 없으면 null' },
      sphLeft: { type: 'number', description: '왼쪽 눈(L/OS)의 구면(Sphere, S) 도수. 부호 그대로. 없으면 null' },
      cylRight: { type: 'number', description: '오른쪽 눈(R/OD)의 원주(Cylinder, C) 도수. 결과지에 표기된 부호 그대로(plus-cyl이면 +, minus-cyl이면 -). 없으면 null' },
      cylLeft: { type: 'number', description: '왼쪽 눈(L/OS)의 원주(Cylinder, C) 도수. 표기된 부호 그대로. 없으면 null' },
    },
    required: ['examDate', 'sphRight', 'sphLeft', 'cylRight', 'cylLeft'],
  },
}

export async function POST(req: Request) {
  const apiKey = process.env.UPSTAGE_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'UPSTAGE_API_KEY가 설정되지 않았습니다.' }, { status: 500 })
  }

  let body: { type?: string; image?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const type = body.type
  if (type !== 'axial' && type !== 'refraction') {
    return Response.json({ error: '검사지 종류가 올바르지 않습니다.' }, { status: 400 })
  }
  if (!body.image || !body.image.startsWith('data:')) {
    return Response.json({ error: '이미지가 없습니다.' }, { status: 400 })
  }

  const schema = type === 'axial' ? AXIAL_SCHEMA : REFRACTION_SCHEMA

  try {
    const res = await fetch(IE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: IE_MODEL,
        // IE는 content에 문서(이미지) 1개만 허용. 추출 지침은 스키마 필드 description에.
        messages: [
          {
            role: 'user',
            content: [{ type: 'image_url', image_url: { url: body.image } }],
          },
        ],
        response_format: { type: 'json_schema', json_schema: schema },
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      return Response.json(
        { error: `추출 API 오류 (${res.status}): ${detail.slice(0, 300)}` },
        { status: 502 }
      )
    }

    const data = await res.json()
    const content: string | undefined = data?.choices?.[0]?.message?.content
    if (!content) {
      return Response.json({ error: '추출 결과가 비어 있습니다.' }, { status: 502 })
    }

    let fields: Record<string, unknown>
    try {
      fields = JSON.parse(content)
    } catch {
      return Response.json({ error: '추출 결과를 해석하지 못했습니다.' }, { status: 502 })
    }
    return Response.json({ type, fields })
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    return Response.json({ error: `추출 실패: ${message}` }, { status: 502 })
  }
}
