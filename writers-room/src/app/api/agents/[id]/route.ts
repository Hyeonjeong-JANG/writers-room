import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateAgentSchema } from '@/features/agent/lib/schemas'

// GET /api/agents/[id] - 에이전트 상세 (공개)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('agents')
      .select('*, creator:users!creator_id(id, display_name, avatar_url, wallet_address)')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '에이전트를 찾을 수 없습니다' } },
        { status: 404 },
      )
    }

    // 리뷰도 함께 조회
    const { data: reviews } = await supabase
      .from('agent_reviews')
      .select('*, reviewer:users!reviewer_id(id, display_name, avatar_url)')
      .eq('agent_id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({ data: { ...data, reviews: reviews ?? [] } })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}

// PATCH /api/agents/[id] - 에이전트 수정 (creator만)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // 소유권 확인
    const { data: agent } = await supabase.from('agents').select('creator_id').eq('id', id).single()

    if (!agent) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '에이전트를 찾을 수 없습니다' } },
        { status: 404 },
      )
    }

    if (agent.creator_id !== user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '에이전트 생성자만 수정할 수 있습니다' } },
        { status: 403 },
      )
    }

    const body = await request.json()
    const parsed = UpdateAgentSchema.safeParse(body)

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

    const updates: Record<string, unknown> = {}
    const d = parsed.data
    if (d.name !== undefined) updates.name = d.name
    if (d.genreTags !== undefined) updates.genre_tags = d.genreTags
    if (d.systemPrompt !== undefined) updates.system_prompt = d.systemPrompt
    if (d.fewShotExamples !== undefined) updates.few_shot_examples = d.fewShotExamples
    if (d.priceUsdc !== undefined) updates.price_usdc = d.priceUsdc
    if (d.flockModel !== undefined) updates.flock_model = d.flockModel
    if (d.description !== undefined) updates.description = d.description
    if (d.isActive !== undefined) updates.is_active = d.isActive

    const { data, error } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

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
