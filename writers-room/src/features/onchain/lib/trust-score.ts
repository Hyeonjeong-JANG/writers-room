import { createClient } from '@/lib/supabase/server'
import type { AgentTrustScoreRow, TrustTier } from './schemas'

/**
 * Determine trust tier from overall score.
 */
function getTier(score: number): TrustTier {
  if (score >= 75) return 'gold'
  if (score >= 50) return 'silver'
  if (score >= 25) return 'bronze'
  return 'none'
}

/**
 * Calculate and upsert trust score for an agent.
 *
 * Formula:
 *   (rehire_rate * 0.3) + (smart_money_ratio * 0.25) +
 *   (utilization_rate * 0.25) + (min(unique_hirers, 100) * 0.2)
 */
export async function calculateTrustScore(agentId: string): Promise<AgentTrustScoreRow | null> {
  try {
    const supabase = await createClient()

    // 1. Get all transactions for this agent (confirmed only)
    const { data: transactions } = await supabase
      .from('transactions')
      .select('payer_id, story_id, confirmed_at')
      .eq('agent_id', agentId)
      .eq('status', 'confirmed')

    // 2. Get story_agents assignments
    const { data: assignments } = await supabase
      .from('story_agents')
      .select('story_id')
      .eq('agent_id', agentId)

    // 3. Get agent info
    const { data: agent } = await supabase
      .from('agents')
      .select('hire_count, creator_id')
      .eq('id', agentId)
      .single()

    if (!agent) {
      console.error('[trust-score] Agent not found:', agentId)
      return null
    }

    const txList = transactions ?? []
    const assignmentList = assignments ?? []

    // Unique hirers (payer_id from transactions)
    const uniqueHirers = new Set(txList.map((t) => t.payer_id)).size

    // Rehire rate: hirers who hired more than once / total unique hirers
    const hirerCounts = new Map<string, number>()
    for (const tx of txList) {
      hirerCounts.set(tx.payer_id, (hirerCounts.get(tx.payer_id) ?? 0) + 1)
    }
    const rehirers = [...hirerCounts.values()].filter((c) => c > 1).length
    const rehireRate = uniqueHirers > 0 ? (rehirers / uniqueHirers) * 100 : 0

    // Smart money ratio: check nansen_wallet_cache for hirers with is_smart_money
    let smartMoneyRatio = 0
    if (uniqueHirers > 0) {
      const hirerIds = [...new Set(txList.map((t) => t.payer_id))]

      // Get wallet addresses for hirers
      const { data: hirerUsers } = await supabase
        .from('users')
        .select('wallet_address')
        .in('id', hirerIds)
        .not('wallet_address', 'is', null)

      if (hirerUsers && hirerUsers.length > 0) {
        const wallets = hirerUsers.map((u) => u.wallet_address!.toLowerCase())
        const { data: smartWallets } = await supabase
          .from('nansen_wallet_cache')
          .select('wallet_address')
          .in('wallet_address', wallets)
          .eq('is_smart_money', true)

        const smartCount = smartWallets?.length ?? 0
        smartMoneyRatio = (smartCount / uniqueHirers) * 100
      }
    }

    // Utilization rate: stories with active assignment / total hire count
    const totalAssignments = assignmentList.length
    const hireCount = agent.hire_count || 1
    const utilizationRate = Math.min((totalAssignments / hireCount) * 100, 100)

    // Overall score
    const overallScore =
      rehireRate * 0.3 +
      smartMoneyRatio * 0.25 +
      utilizationRate * 0.25 +
      Math.min(uniqueHirers, 100) * 0.2

    const clampedScore = Math.min(Math.round(overallScore * 100) / 100, 100)
    const trustTier = getTier(clampedScore)

    // Upsert trust score
    const { data, error } = await supabase
      .from('agent_trust_scores')
      .upsert(
        {
          agent_id: agentId,
          overall_score: clampedScore,
          trust_tier: trustTier,
          rehire_rate: Math.round(rehireRate * 100) / 100,
          smart_money_ratio: Math.round(smartMoneyRatio * 100) / 100,
          utilization_rate: Math.round(utilizationRate * 100) / 100,
          unique_hirers: uniqueHirers,
          calculated_at: new Date().toISOString(),
        },
        { onConflict: 'agent_id' },
      )
      .select('*')
      .single()

    if (error) {
      console.error('[trust-score] upsert failed:', error.message)
      return null
    }

    return data as AgentTrustScoreRow
  } catch (err) {
    console.error('[trust-score] calculation error:', err)
    return null
  }
}
