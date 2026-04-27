'use client'

import useSWR from 'swr'

interface CreditsData {
  freeCredits: number
  paidCredits: number
  totalCredits: number
  resetAt: string
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch credits')
    return res.json()
  })

export function useCredits() {
  const { data, error, isLoading, mutate } = useSWR<{ data: CreditsData }>(
    '/api/credits',
    fetcher,
    { refreshInterval: 30_000 },
  )

  return {
    credits: data?.data ?? null,
    isLoading,
    error,
    refreshCredits: mutate,
  }
}
