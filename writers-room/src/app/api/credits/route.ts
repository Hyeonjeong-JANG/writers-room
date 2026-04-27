import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/credits - 현재 사용자 크레딧 잔액 조회
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
        { status: 401 },
      )
    }

    const { data, error } = await supabase.rpc('get_user_credits', {
      p_user_id: user.id,
    })

    if (error) {
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({
      data: {
        freeCredits: data.free_credits,
        paidCredits: data.paid_credits,
        totalCredits: data.total_credits,
        resetAt: data.reset_at,
      },
    })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
