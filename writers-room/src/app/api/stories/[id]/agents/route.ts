import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/stories/[id]/agents - 스토리에 배치된 에이전트 목록
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: storyId } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('story_agents')
      .select('id, story_id, agent_id, assigned_at, agent:agents(*)')
      .eq('story_id', storyId)
      .order('assigned_at', { ascending: true })

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
