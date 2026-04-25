import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateStorySchema, StoriesQuerySchema } from '@/features/story/lib/schemas'

// GET /api/stories - 스토리 목록 조회 (공개)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = StoriesQuerySchema.safeParse(Object.fromEntries(searchParams))

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

    const { genre, status, sort, mine, page, limit } = parsed.data
    const offset = (page - 1) * limit

    const supabase = await createClient()

    // mine=true 일 때 인증된 유저의 스토리만 필터
    if (mine === 'true') {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
          { status: 401 },
        )
      }

      const { data, count, error } = await supabase
        .from('stories')
        .select('id, title, status, genre, view_count, created_at, updated_at', { count: 'exact' })
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        return NextResponse.json(
          { error: { code: 'DB_ERROR', message: error.message } },
          { status: 500 },
        )
      }

      return NextResponse.json({
        data,
        meta: { page, limit, total: count ?? 0 },
      })
    }

    let query = supabase
      .from('stories')
      .select('*, creator:users!creator_id(id, display_name, avatar_url, wallet_address)', {
        count: 'exact',
      })

    if (genre) {
      query = query.contains('genre', [genre])
    }
    if (status) {
      query = query.eq('status', status)
    }

    if (sort === 'popular') {
      query = query.order('view_count', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({
      data,
      meta: { page, limit, total: count ?? 0 },
    })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}

// POST /api/stories - 스토리 생성 (인증 필요)
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
    const parsed = CreateStorySchema.safeParse(body)

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

    const { title, synopsis, genre, worldSetting, characters } = parsed.data

    const { data, error } = await supabase
      .from('stories')
      .insert({
        creator_id: user.id,
        title,
        synopsis,
        genre,
        world_setting: worldSetting ?? null,
        characters: characters ?? null,
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    // 기본 에이전트 3명 자동 배치
    const { data: defaultAgents } = await supabase
      .from('agents')
      .select('id')
      .eq('is_default', true)
      .eq('is_active', true)

    if (defaultAgents && defaultAgents.length > 0) {
      await supabase.from('story_agents').insert(
        defaultAgents.map((agent) => ({
          story_id: data.id,
          agent_id: agent.id,
        })),
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
