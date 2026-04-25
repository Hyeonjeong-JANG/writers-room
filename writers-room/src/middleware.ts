import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// 인증이 필요한 경로
const protectedPaths = ['/stories/create', '/dashboard', '/profile', '/agents/create']

function isProtectedPath(pathname: string) {
  return protectedPaths.some((path) => pathname.startsWith(path))
}

// 스토리 작가방은 인증 필요
function isRoomPath(pathname: string) {
  return /^\/stories\/[^/]+\/room/.test(pathname)
}

export async function middleware(request: NextRequest) {
  const { user, supabaseResponse } = await updateSession(request)
  const { pathname } = request.nextUrl

  if ((isProtectedPath(pathname) || isRoomPath(pathname)) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 요청에 적용:
     * - _next/static, _next/image (정적 파일)
     * - favicon.ico, sitemap.xml 등
     * - api routes (별도 인증 처리)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/).*)',
  ],
}
