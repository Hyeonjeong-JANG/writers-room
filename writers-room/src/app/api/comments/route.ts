import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CommentsQuerySchema, CreateCommentSchema } from '@/features/comment/lib/schemas'

// GET /api/comments?chapterId=uuid - 챕터 댓글 목록 (공개)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = CommentsQuerySchema.safeParse(Object.fromEntries(searchParams))

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: '잘못된 쿼리 파라미터',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      )
    }

    const { chapterId, type, sort } = parsed.data
    const supabase = await createClient()

    let query = supabase
      .from('comments')
      .select('*, user:users!user_id(id, display_name, avatar_url, wallet_address)')
      .eq('chapter_id', chapterId)

    if (type) {
      query = query.eq('comment_type', type)
    }

    if (sort === 'popular') {
      query = query.order('like_count', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}

// POST /api/comments - 댓글 작성 (인증 필요)
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const parsed = CreateCommentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: '입력값을 확인하세요',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      )
    }

    const { chapterId, content, commentType } = parsed.data

    // 챕터 존재 확인
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .select('id')
      .eq('id', chapterId)
      .eq('status', 'published')
      .single()

    if (chapterError || !chapter) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '챕터를 찾을 수 없습니다' } },
        { status: 404 },
      )
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        chapter_id: chapterId,
        user_id: user.id,
        content,
        comment_type: commentType,
      })
      .select('*, user:users!user_id(id, display_name, avatar_url, wallet_address)')
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
