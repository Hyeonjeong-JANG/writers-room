import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/onchain/reputation/[agentId] - 에이전트 평판 (공개)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  try {
    const { agentId } = await params
    const supabase = await createClient()

    // 에이전트 기본 정보 + trust score
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, role, hire_count, avg_rating')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '에이전트를 찾을 수 없습니다' } },
        { status: 404 },
      )
    }

    const { data: trustScore } = await supabase
      .from('agent_trust_scores')
      .select('*')
      .eq('agent_id', agentId)
      .single()

    // 기여 기록 (에이전트 생성자 기준)
    const { data: contributions, error: contribError } = await supabase
      .from('contributions')
      .select('id, contribution_type, context, created_at')
      .eq('context->>agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (contribError) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: contribError.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({
      data: {
        agent,
        trustScore: trustScore ?? null,
        recentContributions: contributions ?? [],
      },
    })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
