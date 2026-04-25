import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateChapterSchema } from '@/features/story/lib/schemas'

// GET /api/stories/[id]/chapters - 챕터 목록 (published만 공개)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('chapters')
      .select('id, story_id, chapter_number, title, status, published_at, created_at')
      .eq('story_id', id)
      .order('chapter_number', { ascending: true })

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

// POST /api/stories/[id]/chapters - 챕터 발행 (creator만)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: storyId } = await params
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
        { error: { code: 'FORBIDDEN', message: '스토리 작성자만 챕터를 발행할 수 있습니다' } },
        { status: 403 },
      )
    }

    const body = await request.json()
    const parsed = CreateChapterSchema.safeParse(body)

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

    // 다음 챕터 번호 계산
    const { data: lastChapter } = await supabase
      .from('chapters')
      .select('chapter_number')
      .eq('story_id', storyId)
      .order('chapter_number', { ascending: false })
      .limit(1)
      .single()

    const nextNumber = (lastChapter?.chapter_number ?? 0) + 1

    const { title, content, discussionId } = parsed.data

    const { data, error } = await supabase
      .from('chapters')
      .insert({
        story_id: storyId,
        chapter_number: nextNumber,
        title,
        content,
        discussion_id: discussionId ?? null,
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .select('*')
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
