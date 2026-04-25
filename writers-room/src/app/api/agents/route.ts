import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AgentsQuerySchema, CreateAgentSchema } from '@/features/agent/lib/schemas'
import { recordContribution } from '@/features/onchain/lib/contribution-service'

// GET /api/agents - 에이전트 마켓 목록 (공개)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = AgentsQuerySchema.safeParse(Object.fromEntries(searchParams))

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

    const { role, genre, sort, minRating, page, limit } = parsed.data
    const offset = (page - 1) * limit
    const supabase = await createClient()

    let query = supabase
      .from('agents')
      .select(
        '*, creator:users!creator_id(id, display_name, avatar_url, wallet_address), trust_score:agent_trust_scores(overall_score, trust_tier)',
        { count: 'exact' },
      )
      .eq('is_active', true)

    if (role) query = query.eq('role', role)
    if (genre) query = query.contains('genre_tags', [genre])
    if (minRating) query = query.gte('avg_rating', minRating)

    if (sort === 'popular') {
      query = query.order('hire_count', { ascending: false })
    } else if (sort === 'latest') {
      query = query.order('created_at', { ascending: false })
    } else {
      query = query.order('avg_rating', { ascending: false })
    }

    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({ data, meta: { page, limit, total: count ?? 0 } })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}

// POST /api/agents - 에이전트 생성 (인증 필요)
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
    const parsed = CreateAgentSchema.safeParse(body)

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

    const {
      name,
      role,
      genreTags,
      systemPrompt,
      fewShotExamples,
      priceUsdc,
      flockModel,
      description,
    } = parsed.data

    const { data, error } = await supabase
      .from('agents')
      .insert({
        creator_id: user.id,
        name,
        role,
        genre_tags: genreTags,
        system_prompt: systemPrompt,
        few_shot_examples: fewShotExamples ?? null,
        price_usdc: priceUsdc,
        flock_model: flockModel,
        description: description ?? null,
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    // 에이전트 생성 기여 기록
    recordContribution({
      userId: user.id,
      contributionType: 'agent_created',
      context: {
        agent_id: data.id,
        agent_name: data.name,
        agent_role: data.role,
      },
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
