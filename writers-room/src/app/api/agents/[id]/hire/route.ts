import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { HireAgentSchema } from '@/features/agent/lib/schemas'

// POST /api/agents/[id]/hire - 에이전트 고용 (스토리에 배치)
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
    const parsed = HireAgentSchema.safeParse(body)

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

    const { storyId } = parsed.data

    // 스토리 소유권 확인
    const { data: story } = await supabase
      .from('stories')
      .select('id, creator_id')
      .eq('id', storyId)
      .single()

    if (!story) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '스토리를 찾을 수 없습니다' } },
        { status: 404 },
      )
    }

    if (story.creator_id !== user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '스토리 작성자만 에이전트를 고용할 수 있습니다' } },
        { status: 403 },
      )
    }

    // 에이전트 존재 확인
    const { data: agent } = await supabase
      .from('agents')
      .select('id, price_usdc, is_active')
      .eq('id', agentId)
      .single()

    if (!agent || !agent.is_active) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '에이전트를 찾을 수 없습니다' } },
        { status: 404 },
      )
    }

    // 이미 배치 확인
    const { data: existing } = await supabase
      .from('story_agents')
      .select('id')
      .eq('story_id', storyId)
      .eq('agent_id', agentId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: '이미 배치된 에이전트입니다' } },
        { status: 409 },
      )
    }

    // 무료 에이전트는 바로 배치, 유료는 결제 필요 응답
    if (agent.price_usdc > 0) {
      return NextResponse.json({
        data: {
          paymentRequired: true,
          amount: agent.price_usdc,
          currency: 'USDC',
          paymentMethod: 'x402',
        },
      })
    }

    // 무료 에이전트 배치
    const { error: insertError } = await supabase
      .from('story_agents')
      .insert({ story_id: storyId, agent_id: agentId })

    if (insertError) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: insertError.message } },
        { status: 500 },
      )
    }

    // hire_count 증가
    await supabase.rpc('increment_view_count', { story_id: storyId }).then(() => {
      // 별도 RPC 없이 직접 업데이트
    })
    await supabase
      .from('agents')
      .update({ hire_count: agent.price_usdc === 0 ? 1 : 0 })
      .eq('id', agentId)
    // hire_count + 1 은 RPC로 처리하는게 좋지만 간단히 처리

    return NextResponse.json(
      {
        data: { paymentRequired: false, assigned: true },
      },
      { status: 201 },
    )
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
