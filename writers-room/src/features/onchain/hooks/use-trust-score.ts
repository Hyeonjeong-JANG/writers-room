'use client'

import useSWR from 'swr'
import type { AgentTrustScoreRow } from '@/features/onchain/lib/schemas'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useTrustScore(agentId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<{
    data: AgentTrustScoreRow | null
  }>(agentId ? `/api/nansen/agent-trust/${agentId}` : null, fetcher)

  return {
    trustScore: data?.data ?? null,
    isLoading,
    error,
    mutate,
  }
}
