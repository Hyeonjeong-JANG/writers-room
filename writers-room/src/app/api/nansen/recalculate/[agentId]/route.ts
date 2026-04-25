import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateTrustScore } from '@/features/onchain/lib/trust-score'

// POST /api/nansen/recalculate/[agentId] - Trust Score 재산출 (인증 필요)
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  try {
    const { agentId } = await params
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

    // 에이전트 존재 확인
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '에이전트를 찾을 수 없습니다' } },
        { status: 404 },
      )
    }

    const data = await calculateTrustScore(agentId)

    if (!data) {
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Trust Score 산출에 실패했습니다' } },
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
