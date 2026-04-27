import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StartDiscussionSchema } from '@/features/room/lib/schemas'
import { runDiscussion, type OnProgress } from '@/features/room/lib/orchestrator'

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

// POST /api/room/discuss - 토론 시작 (스토리 creator만, SSE 스트림)
export async function POST(request: NextRequest) {
  // 인증/유효성 검사는 스트림 시작 전에 처리 (실패 시 JSON 에러 반환)
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '잘못된 요청 본문입니다' } },
      { status: 400 },
    )
  }

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

  // SSE 스트림 생성
  const encoder = new TextEncoder()
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  // write Promise를 큐에 모아서 close 전에 모두 flush
  const writeQueue: Promise<void>[] = []

  const onProgress: OnProgress = (event) => {
    writeQueue.push(
      writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)).catch(() => {
        // 클라이언트 연결 끊김 — swallow
      }),
    )
  }

  // 오케스트레이터를 비동기 실행 (스트림 즉시 반환)
  ;(async () => {
    try {
      await runDiscussion(supabase, storyId, user.id, adoptedCommentIds, onProgress)
    } catch {
      // onProgress에서 이미 error 이벤트 전송됨
    } finally {
      // 모든 write가 완료될 때까지 대기 후 close
      await Promise.all(writeQueue).catch(() => {})
      try {
        await writer.close()
      } catch {
        // writer already closed
      }
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
