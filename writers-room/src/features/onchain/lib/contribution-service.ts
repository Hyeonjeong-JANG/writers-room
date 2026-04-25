import { createClient } from '@/lib/supabase/server'
import type { ContributionType } from './schemas'

interface RecordContributionParams {
  userId: string
  storyId?: string | null
  contributionType: ContributionType
  context?: Record<string, unknown>
}

/**
 * Record a contribution to DB. Never throws — callers should not be interrupted.
 * Onchain recording is fire-and-forget (when enabled).
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

    return data.id
  } catch (err) {
    console.error('[contribution-service] unexpected error:', err)
    return null
  }
}
