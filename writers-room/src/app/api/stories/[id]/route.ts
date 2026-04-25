import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateStorySchema } from '@/features/story/lib/schemas'

// GET /api/stories/[id] - 스토리 상세 (공개)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('stories')
      .select('*, creator:users!creator_id(id, display_name, avatar_url, wallet_address)')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '스토리를 찾을 수 없습니다' } },
        { status: 404 },
      )
    }

    // 조회수 증가 (fire-and-forget)
    supabase.rpc('increment_view_count', { story_id: id }).then(() => {})

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}

// PATCH /api/stories/[id] - 스토리 수정 (creator만)
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

    const body = await request.json()
    const parsed = UpdateStorySchema.safeParse(body)

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
    const input = parsed.data

    if (input.title !== undefined) updates.title = input.title
    if (input.synopsis !== undefined) updates.synopsis = input.synopsis
    if (input.genre !== undefined) updates.genre = input.genre
    if (input.worldSetting !== undefined) updates.world_setting = input.worldSetting
    if (input.characters !== undefined) updates.characters = input.characters
    if (input.status !== undefined) updates.status = input.status
    if (input.coverImageUrl !== undefined) updates.cover_image_url = input.coverImageUrl

    const { data, error } = await supabase
      .from('stories')
      .update(updates)
      .eq('id', id)
      .eq('creator_id', user.id)
      .select('*')
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '스토리를 찾을 수 없거나 권한이 없습니다' } },
        { status: 404 },
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
