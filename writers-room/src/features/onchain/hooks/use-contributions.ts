'use client'

import useSWR from 'swr'
import type { ContributionRow, ContributionsQuery } from '@/features/onchain/lib/schemas'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useContributions(
  userId: string | undefined,
  query: Partial<ContributionsQuery> = {},
) {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.type) params.set('type', query.type)

  const qs = params.toString()
  const { data, error, isLoading, mutate } = useSWR<{
    data: ContributionRow[]
    meta: { page: number; limit: number; total: number }
  }>(userId ? `/api/onchain/contributions/${userId}${qs ? `?${qs}` : ''}` : null, fetcher)

  return {
    contributions: data?.data ?? [],
    meta: data?.meta ?? { page: 1, limit: 20, total: 0 },
    isLoading,
    error,
    mutate,
  }
}
