'use client'

import useSWR from 'swr'
import type { TransactionRow } from '@/features/payment/lib/schemas'
import type { StoryRow } from '@/features/story/lib/schemas'
import type { AgentRow } from '@/features/agent/lib/schemas'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// ============================================
// Dashboard Stats Types
// ============================================

export interface DashboardStats {
  stories: {
    total: number
    ongoing: number
    completed: number
    hiatus: number
  }
  agents: {
    total: number
    active: number
    totalHires: number
    avgRating: number
  }
  earnings: {
    totalUsdc: number
    thisMonth: number
    transactionCount: number
  }
  contributions: {
    total: number
    commentsAdopted: number
    chaptersGenerated: number
    agentsCreated: number
  }
}

// ============================================
// Hooks
// ============================================

export function useDashboardStats(userId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<{ data: DashboardStats }>(
    userId ? '/api/dashboard/stats' : null,
    fetcher,
  )

  return {
    stats: data?.data ?? null,
    isLoading,
    error,
    mutate,
  }
}

export function useMyStories(userId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<{
    data: StoryRow[]
    meta: { page: number; limit: number; total: number }
  }>(userId ? '/api/stories?mine=true&limit=50' : null, fetcher)

  return {
    stories: data?.data ?? [],
    meta: data?.meta ?? { page: 1, limit: 50, total: 0 },
    isLoading,
    error,
    mutate,
  }
}

export function useMyAgents(userId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<{
    data: AgentRow[]
    meta: { page: number; limit: number; total: number }
  }>(userId ? '/api/agents?mine=true&limit=50' : null, fetcher)

  return {
    agents: data?.data ?? [],
    meta: data?.meta ?? { page: 1, limit: 50, total: 0 },
    isLoading,
    error,
    mutate,
  }
}

export interface ReaderStats {
  totalComments: number
  adoptedCount: number
  adoptionRate: number
  byStory: Array<{
    storyId: string
    title: string
    totalComments: number
    adoptedComments: number
    adoptionRate: number
  }>
  recentAdopted: Array<{
    id: string
    content: string
    commentType: string
    adoptedInChapter: number | null
    createdAt: string
  }>
}

export function useReaderStats(userId: string | undefined) {
  const { data, error, isLoading } = useSWR<{ data: ReaderStats }>(
    userId ? '/api/dashboard/reader-stats' : null,
    fetcher,
  )

  return {
    readerStats: data?.data ?? null,
    isLoading,
    error,
  }
}

export function useEarnings(userId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<{
    data: TransactionRow[]
    meta: { page: number; limit: number; total: number }
  }>(userId ? '/api/payments/history?type=received&limit=50' : null, fetcher)

  return {
    transactions: data?.data ?? [],
    meta: data?.meta ?? { page: 1, limit: 50, total: 0 },
    isLoading,
    error,
    mutate,
  }
}
