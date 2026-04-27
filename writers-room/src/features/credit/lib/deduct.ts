import { type SupabaseClient } from '@supabase/supabase-js'
import { CREDIT_COSTS, type CreditAction } from './constants'

export class InsufficientCreditsError extends Error {
  public readonly required: number
  public readonly available: number

  constructor(required: number, available: number) {
    super(`크레딧이 부족합니다: 필요 ${required}, 잔액 ${available}`)
    this.name = 'InsufficientCreditsError'
    this.required = required
    this.available = available
  }
}

export async function deductCredits(
  supabase: SupabaseClient,
  userId: string,
  action: CreditAction,
) {
  const amount = CREDIT_COSTS[action]

  const { error } = await supabase.rpc('deduct_credits', {
    p_user_id: userId,
    p_amount: amount,
  })

  if (error) {
    // PostgreSQL raises P0001 for insufficient credits
    if (error.message?.includes('Insufficient credits')) {
      const match = error.message.match(/required=(\d+), available=(\d+)/)
      const required = match ? parseInt(match[1]) : amount
      const available = match ? parseInt(match[2]) : 0
      throw new InsufficientCreditsError(required, available)
    }
    throw new Error(`Credit deduction failed: ${error.message}`)
  }
}
