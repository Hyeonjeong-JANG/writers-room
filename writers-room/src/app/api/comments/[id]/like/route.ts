import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/comments/[id]/like - 좋아요 (인증 필요)
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // 댓글 존재 확인
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id')
      .eq('id', id)
      .single()

    if (commentError || !comment) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '댓글을 찾을 수 없습니다' } },
        { status: 404 },
      )
    }

    // RPC로 좋아요 증가
    const { error } = await supabase.rpc('increment_like_count', { comment_id: id })

    if (error) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
