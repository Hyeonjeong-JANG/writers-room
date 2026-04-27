import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StartDiscussionSchema } from '@/features/room/lib/schemas'
import { runDiscussion } from '@/features/room/lib/orchestrator'

export const maxDuration = 60

// GET /api/room/discuss?storyId=xxx - 스토리의 최신 토론 조회
export async function GET(request: NextRequest) {
  try {
    const storyId = request.nextUrl.searchParams.get('storyId')
    if (!storyId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'storyId가 필요합니다' } },
        { status: 400 },
      )
    }

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

    const { data: discussion } = await supabase
      .from('discussions')
      .select('*')
      .eq('story_id', storyId)
      .in('status', ['completed', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({ data: discussion ?? null })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}

// POST /api/room/discuss - 토론 시작 (스토리 creator만)
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
    const parsed = StartDiscussionSchema.safeParse(body)

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

    const { storyId, adoptedCommentIds } = parsed.data

    // 스토리 소유권 확인
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('id, creator_id')
      .eq('id', storyId)
      .single()

    if (storyError || !story) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '스토리를 찾을 수 없습니다' } },
        { status: 404 },
      )
    }

    if (story.creator_id !== user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '스토리 작성자만 토론을 시작할 수 있습니다' } },
        { status: 403 },
      )
    }

    // 오케스트레이터 실행
    const result = await runDiscussion(supabase, storyId, user.id, adoptedCommentIds)

    return NextResponse.json({ data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 })
  }
}
