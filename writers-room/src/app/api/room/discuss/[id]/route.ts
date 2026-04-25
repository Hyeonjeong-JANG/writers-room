import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/room/discuss/[id] - 토론 상세 (스토리 creator만)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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

    // RLS가 스토리 creator 체크를 처리하므로, 조회 결과 없으면 404/403
    const { data: discussion, error } = await supabase
      .from('discussions')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !discussion) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '토론을 찾을 수 없습니다' } },
        { status: 404 },
      )
    }

    return NextResponse.json({ data: discussion })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
