import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  if (token_hash && type) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value)
            })
          },
        },
      },
    )

    const { error } = await supabase.auth.verifyOtp({
      type: type as 'magiclink',
      token_hash,
    })

    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`)
      // 쿠키를 응답에 복사
      request.cookies.getAll().forEach((cookie) => {
        response.cookies.set(cookie.name, cookie.value)
      })
      return response
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`)
}
