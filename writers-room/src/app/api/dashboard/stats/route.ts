import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/dashboard/stats - 대시보드 통합 통계
export async function GET() {
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

    // 병렬로 모든 통계 쿼리 실행
    const [storiesRes, agentsRes, earningsRes, contributionsRes] = await Promise.all([
      // 1. 내 스토리 통계
      supabase.from('stories').select('id, status', { count: 'exact' }).eq('creator_id', user.id),

      // 2. 내 에이전트 통계
      supabase
        .from('agents')
        .select('id, hire_count, avg_rating, is_active', { count: 'exact' })
        .eq('creator_id', user.id)
        .eq('is_default', false),

      // 3. 수익 통계 (받은 결제)
      supabase
        .from('transactions')
        .select('amount_usdc, platform_fee, created_at')
        .eq('payee_id', user.id)
        .eq('status', 'confirmed'),

      // 4. 기여 통계
      supabase
        .from('contributions')
        .select('id, contribution_type', { count: 'exact' })
        .eq('user_id', user.id),
    ])

    // 스토리 통계 계산
    const stories = storiesRes.data ?? []
    const storyStats = {
      total: storiesRes.count ?? 0,
      ongoing: stories.filter((s) => s.status === 'ongoing').length,
      completed: stories.filter((s) => s.status === 'completed').length,
      hiatus: stories.filter((s) => s.status === 'hiatus').length,
    }

    // 에이전트 통계 계산
    const agents = agentsRes.data ?? []
    const totalHires = agents.reduce((sum, a) => sum + (a.hire_count ?? 0), 0)
    const activeAgents = agents.filter((a) => a.is_active)
    const avgRating =
      activeAgents.length > 0
        ? activeAgents.reduce((sum, a) => sum + (a.avg_rating ?? 0), 0) / activeAgents.length
        : 0
    const agentStats = {
      total: agentsRes.count ?? 0,
      active: activeAgents.length,
      totalHires,
      avgRating: Math.round(avgRating * 100) / 100,
    }

    // 수익 통계 계산
    const earnings = earningsRes.data ?? []
    const totalUsdc = earnings.reduce(
      (sum, t) => sum + Number(t.amount_usdc) - Number(t.platform_fee),
      0,
    )
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const thisMonthEarnings = earnings
      .filter((t) => t.created_at >= thisMonthStart)
      .reduce((sum, t) => sum + Number(t.amount_usdc) - Number(t.platform_fee), 0)
    const earningStats = {
      totalUsdc: Math.round(totalUsdc * 100) / 100,
      thisMonth: Math.round(thisMonthEarnings * 100) / 100,
      transactionCount: earnings.length,
    }

    // 기여 통계 계산
    const contributions = contributionsRes.data ?? []
    const contributionStats = {
      total: contributionsRes.count ?? 0,
      commentsAdopted: contributions.filter((c) => c.contribution_type === 'comment_adopted')
        .length,
      chaptersGenerated: contributions.filter((c) => c.contribution_type === 'chapter_generated')
        .length,
      agentsCreated: contributions.filter((c) => c.contribution_type === 'agent_created').length,
    }

    return NextResponse.json({
      data: {
        stories: storyStats,
        agents: agentStats,
        earnings: earningStats,
        contributions: contributionStats,
      },
    })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
