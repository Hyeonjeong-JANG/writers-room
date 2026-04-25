'use client'

import useSWR from 'swr'
import type { NansenWalletData } from '@/features/onchain/lib/schemas'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useWalletAnalysis(address: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<{
    data: NansenWalletData
  }>(address ? `/api/nansen/wallet/${address}` : null, fetcher)

  return {
    walletData: data?.data ?? null,
    isLoading,
    error,
    mutate,
  }
}
