import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GenerateChapterSchema } from '@/features/room/lib/schemas'
import { generateChapter } from '@/features/room/lib/orchestrator'

export const maxDuration = 60

// POST /api/room/generate - 챕터 초안 생성 (스토리 creator만)
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
    const parsed = GenerateChapterSchema.safeParse(body)

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

    const { discussionId } = parsed.data

    // 토론 존재 및 권한 확인 (RLS가 creator 체크)
    const { data: discussion, error: discError } = await supabase
      .from('discussions')
      .select('id, story_id, status')
      .eq('id', discussionId)
      .single()

    if (discError || !discussion) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '토론을 찾을 수 없습니다' } },
        { status: 404 },
      )
    }

    if (discussion.status !== 'completed') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: '완료된 토론만 챕터를 생성할 수 있습니다' } },
        { status: 400 },
      )
    }

    // 스토리 소유권 확인
    const { data: story } = await supabase
      .from('stories')
      .select('creator_id')
      .eq('id', discussion.story_id)
      .single()

    if (!story || story.creator_id !== user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '스토리 작성자만 챕터를 생성할 수 있습니다' } },
        { status: 403 },
      )
    }

    const result = await generateChapter(supabase, discussionId)

    return NextResponse.json({ data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 })
  }
}
