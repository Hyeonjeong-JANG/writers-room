import { createClient } from '@/lib/supabase/server'
import type { NansenWalletData } from './schemas'

const NANSEN_API_BASE = 'https://api.nansen.ai/v1'

function isNansenEnabled(): boolean {
  return !!process.env.NANSEN_X402_WALLET_KEY
}

/**
 * Generate deterministic mock data for a wallet address (for dev/demo without API key).
 */
function generateMockData(address: string): Omit<NansenWalletData, 'fetched_at' | 'expires_at'> {
  // Use address chars to generate deterministic values
  const seed = parseInt(address.slice(2, 10), 16)
  const isSmartMoney = seed % 3 === 0
  const score = ((seed % 80) + 20) / 100 // 0.20 ~ 0.99

  const labelPool = ['DeFi Whale', 'NFT Collector', 'Early Adopter', 'DAO Voter', 'LP Provider']
  const labelCount = (seed % 3) + 1
  const labels = labelPool.slice(0, labelCount)

  return {
    wallet_address: address.toLowerCase(),
    labels,
    is_smart_money: isSmartMoney,
    portfolio_quality_score: Math.round(score * 100),
    raw_response: { mock: true, seed },
  }
}

/**
 * Get wallet analysis: cache check -> API call or mock -> cache upsert.
 */
export async function getWalletAnalysis(address: string): Promise<NansenWalletData> {
  const normalizedAddress = address.toLowerCase()
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

  // 2. Fetch from API or generate mock
  let walletData: Omit<NansenWalletData, 'fetched_at' | 'expires_at'>

  if (isNansenEnabled()) {
    try {
      const res = await fetch(`${NANSEN_API_BASE}/wallet/${normalizedAddress}`, {
        headers: {
          Authorization: `Bearer ${process.env.NANSEN_X402_WALLET_KEY}`,
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) {
        console.error('[nansen-client] API error:', res.status)
        walletData = generateMockData(normalizedAddress)
      } else {
        const json = await res.json()
        walletData = {
          wallet_address: normalizedAddress,
          labels: json.labels ?? [],
          is_smart_money: json.is_smart_money ?? false,
          portfolio_quality_score: json.portfolio_quality_score ?? 0,
          raw_response: json,
        }
      }
    } catch (err) {
      console.error('[nansen-client] fetch error:', err)
      walletData = generateMockData(normalizedAddress)
    }
  } else {
    walletData = generateMockData(normalizedAddress)
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
