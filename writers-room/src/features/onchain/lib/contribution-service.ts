import { createClient } from '@/lib/supabase/server'
import type { ContributionType } from './schemas'
import { recordOnchain } from './onchain-client'

interface RecordContributionParams {
  userId: string
  storyId?: string | null
  contributionType: ContributionType
  context?: Record<string, unknown>
}

/**
 * Record a contribution to DB, then fire-and-forget onchain recording.
 * Never throws — callers should not be interrupted.
 */
export async function recordContribution({
  userId,
  storyId,
  contributionType,
  context = {},
}: RecordContributionParams): Promise<string | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('contributions')
      .insert({
        user_id: userId,
        story_id: storyId ?? null,
        contribution_type: contributionType,
        context,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[contribution-service] DB insert failed:', error.message)
      return null
    }

    // 온체인 기록 (fire-and-forget)
    writeOnchain(supabase, data.id, userId, storyId ?? null, contributionType)

    return data.id
  } catch (err) {
    console.error('[contribution-service] unexpected error:', err)
    return null
  }
}

/** 온체인 기록을 비동기로 수행하고 DB 업데이트 */
async function writeOnchain(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contributionId: string,
  userId: string,
  storyId: string | null,
  contributionType: ContributionType,
): Promise<void> {
  try {
    // 유저의 지갑 주소 조회
    const { data: user } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', userId)
      .single()

    if (!user?.wallet_address) return

    const result = await recordOnchain({
      contributionId,
      contributorWallet: user.wallet_address,
      contributionType,
      storyId,
    })

    if (result) {
      await supabase
        .from('contributions')
        .update({
          tx_hash: result.txHash,
          onchain_confirmed: true,
        })
        .eq('id', contributionId)
    }
  } catch (err) {
    console.error('[contribution-service] onchain recording failed:', err)
  }
}
