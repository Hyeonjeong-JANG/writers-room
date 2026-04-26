import { createPublicClient, http, formatEther } from 'viem'
import { base } from 'viem/chains'
import { createClient } from '@/lib/supabase/server'
import type { NansenWalletData } from './schemas'

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

/**
 * Get wallet analysis using on-chain data (replaces Nansen API).
 * Queries transaction count and balance from Base chain via viem,
 * then computes labels and scores locally.
 * Results are cached in nansen_wallet_cache with 24h TTL.
 */
export async function getWalletAnalysis(address: string): Promise<NansenWalletData> {
  const normalizedAddress = address.toLowerCase() as `0x${string}`
  const supabase = await createClient()

  // 1. Check cache (not expired)
  const { data: cached } = await supabase
    .from('nansen_wallet_cache')
    .select('*')
    .eq('wallet_address', normalizedAddress)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (cached) {
    return cached as NansenWalletData
  }

  // 2. Fetch on-chain data via viem
  let walletData: Omit<NansenWalletData, 'fetched_at' | 'expires_at'>

  try {
    const [txCount, balance] = await Promise.all([
      publicClient.getTransactionCount({ address: normalizedAddress }),
      publicClient.getBalance({ address: normalizedAddress }),
    ])

    const balanceETH = parseFloat(formatEther(balance))

    // Compute labels
    const labels: string[] = []
    if (txCount >= 100) labels.push('Active Trader')
    else if (txCount >= 50) labels.push('Regular User')
    else if (txCount >= 10) labels.push('Casual User')

    if (balanceETH >= 1) labels.push('High Value')
    else if (balanceETH >= 0.1) labels.push('Mid Value')

    if (txCount >= 200) labels.push('Power User')

    // Smart money heuristic
    const isSmartMoney = txCount > 50 && balanceETH > 0.5

    // Portfolio quality score (0-100)
    const txScore = Math.min(txCount / 200, 1) * 60
    const balanceScore = Math.min(balanceETH / 5, 1) * 40
    const portfolioQualityScore = Math.round(txScore + balanceScore)

    walletData = {
      wallet_address: normalizedAddress,
      labels,
      is_smart_money: isSmartMoney,
      portfolio_quality_score: portfolioQualityScore,
      raw_response: { txCount, balanceETH, source: 'viem-base-chain' },
    }
  } catch (err) {
    console.error('[wallet-analysis] on-chain fetch error:', err)
    // Fallback: empty analysis
    walletData = {
      wallet_address: normalizedAddress,
      labels: [],
      is_smart_money: false,
      portfolio_quality_score: 0,
      raw_response: { error: 'fetch_failed', source: 'viem-base-chain' },
    }
  }

  // 3. Cache upsert (24h TTL)
  const now = new Date()
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const record = {
    ...walletData,
    fetched_at: now.toISOString(),
    expires_at: expires.toISOString(),
  }

  await supabase.from('nansen_wallet_cache').upsert(record, { onConflict: 'wallet_address' })

  return record as NansenWalletData
}
