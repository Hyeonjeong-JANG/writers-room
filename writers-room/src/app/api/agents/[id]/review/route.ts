import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateReviewSchema } from '@/features/agent/lib/schemas'

// POST /api/agents/[id]/review - 리뷰 작성 (인증 필요)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: agentId } = await params
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
    const parsed = CreateReviewSchema.safeParse(body)

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

    // 에이전트 존재 확인
    const { data: agent } = await supabase.from('agents').select('id').eq('id', agentId).single()

    if (!agent) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '에이전트를 찾을 수 없습니다' } },
        { status: 404 },
      )
    }

    const { rating, reviewText, storyId } = parsed.data

    const { data, error } = await supabase
      .from('agent_reviews')
      .upsert(
        {
          agent_id: agentId,
          reviewer_id: user.id,
          rating,
          review_text: reviewText ?? null,
          story_id: storyId ?? null,
        },
        { onConflict: 'agent_id,reviewer_id' },
      )
      .select('*, reviewer:users!reviewer_id(id, display_name, avatar_url)')
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
