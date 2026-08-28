import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 서버 단 로그인 검사. 지금까지는 화면이 뜬 뒤 브라우저가 튕겨내는 방식이라
// 로그인하지 않은 사람에게도 페이지 껍데기가 일단 내려갔다(데이터는 RLS가 막지만).
// 세션이 쿠키에 담기게 되면서 서버가 요청 단계에서 판단할 수 있게 됐다.
//
// Next 16에서 middleware는 proxy로 이름이 바뀌었고 기본 런타임이 Node.js다
// (node_modules/next/dist/docs/.../proxy.md). runtime 지정은 오히려 에러가 난다.

export async function proxy(request: NextRequest) {
  // @supabase/ssr 규약: 세션이 갱신되면 새 쿠키를 요청·응답 양쪽에 반영해야 한다
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 세션 갱신으로 새로 발급된 쿠키를 리다이렉트 응답에도 실어 보낸다 —
  // 안 그러면 갱신된 세션이 버려져 멀쩡히 로그인한 사용자가 튕겨나갈 수 있다
  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone()
    url.pathname = pathname
    url.search = ''
    const res = NextResponse.redirect(url)
    response.cookies.getAll().forEach(cookie => res.cookies.set(cookie))
    return res
  }

  const path = request.nextUrl.pathname

  // ── 원장 포털 전용 서브도메인(clinic.myonote.app) ──
  // 이 호스트에서는 원장 포털 외에는 아무것도 노출하지 않는다. 부모 앱과 접점을 만들지 않는 게
  // 목적이고, 도메인이 다르면 로그인 쿠키도 따로 저장돼 한 브라우저에서 부모·병원 계정을
  // 동시에 쓸 수 있다(같은 도메인이면 세션이 하나뿐이라 번갈아 로그인해야 한다).
  const isClinicHost = (request.headers.get('host') ?? '').startsWith('clinic.')
  if (isClinicHost && !path.startsWith('/clinic')) return redirectTo('/clinic')

  // 아래는 보호가 필요한 경로만. 로그인·개인정보처리방침 같은 공개 경로와 메인 도메인의
  // 루트는 그대로 통과시킨다(루트는 기존대로 클라이언트가 판단 — 여기서 손대지 않는다).
  // 인증 조회도 필요할 때만 해서 공개 페이지에 불필요한 왕복을 만들지 않는다.
  if (!path.startsWith('/clinic') && !path.startsWith('/dashboard')) return response

  const { data: { user } } = await supabase.auth.getUser()

  if (path.startsWith('/clinic')) {
    if (path === '/clinic/login') return response          // 로그인 화면 자체는 열려 있어야 한다
    if (!user) return redirectTo('/clinic/login')
    // 로그인했더라도 병원 소속이 아니면(예: 부모 계정) 원장 포털은 볼 수 없다
    const { data: hospitalId } = await supabase.rpc('my_hospital_id')
    if (!hospitalId) return redirectTo('/clinic/login')
    return response
  }

  // /dashboard/*
  if (!user) return redirectTo('/login')
  return response
}

export const config = {
  // 서브도메인에서 부모용 화면이 새어나오지 않게 공개 경로까지 포함시킨다
  // (매칭이 안 되면 proxy가 아예 실행되지 않아 그 경로는 그대로 노출된다).
  // 정적 파일(_next, 아이콘 등)은 매칭하지 않는다.
  matcher: [
    '/',
    '/login',
    '/privacy',
    '/auth/:path*',
    '/connect/:path*',
    '/dashboard/:path*',
    '/clinic/:path*',
  ],
}
