'use client'

import { useCallback, useState } from 'react'
import useSWR from 'swr'
import type { AgentRow, AgentReviewRow, AgentsQuery } from '@/features/agent/lib/schemas'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useAgents(query: Partial<AgentsQuery> = {}) {
  const params = new URLSearchParams()
  if (query.role) params.set('role', query.role)
  if (query.genre) params.set('genre', query.genre)
  if (query.sort) params.set('sort', query.sort)
  if (query.minRating) params.set('minRating', String(query.minRating))
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))

  const qs = params.toString()
  const { data, error, isLoading, mutate } = useSWR<{
    data: AgentRow[]
    meta: { page: number; limit: number; total: number }
  }>(`/api/agents${qs ? `?${qs}` : ''}`, fetcher)

  return {
    agents: data?.data ?? [],
    meta: data?.meta ?? { page: 1, limit: 20, total: 0 },
    isLoading,
    error,
    mutate,
  }
}

export function useAgent(id: string) {
  const { data, error, isLoading, mutate } = useSWR<{
    data: AgentRow & { reviews: AgentReviewRow[] }
  }>(id ? `/api/agents/${id}` : null, fetcher)

  return {
    agent: data?.data ?? null,
    isLoading,
    error,
    mutate,
  }
}

export function useCreateAgent() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createAgent = useCallback(async (input: Record<string, unknown>) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error?.message ?? '에이전트 생성 실패')
      }
      const { data } = await res.json()
      return data as AgentRow
    } catch (err) {
      setError(err instanceof Error ? err.message : '에이전트 생성 실패')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { createAgent, isSubmitting, error }
}

export function useHireAgent() {
  const [isHiring, setIsHiring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hireAgent = useCallback(async (agentId: string, storyId: string) => {
    setIsHiring(true)
    setError(null)
    try {
      const res = await fetch(`/api/agents/${agentId}/hire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error?.message ?? '고용 실패')
      }
      const { data } = await res.json()
      return data as { paymentRequired: boolean; amount?: number; assigned?: boolean }
    } catch (err) {
      setError(err instanceof Error ? err.message : '고용 실패')
      return null
    } finally {
      setIsHiring(false)
    }
  }, [])

  return { hireAgent, isHiring, error }
}

export function useReviewAgent() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitReview = useCallback(
    async (agentId: string, rating: number, reviewText?: string, storyId?: string) => {
      setIsSubmitting(true)
      setError(null)
      try {
        const res = await fetch(`/api/agents/${agentId}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating, reviewText, storyId }),
        })
        if (!res.ok) {
          const { error } = await res.json()
          throw new Error(error?.message ?? '리뷰 작성 실패')
        }
        const { data } = await res.json()
        return data as AgentReviewRow
      } catch (err) {
        setError(err instanceof Error ? err.message : '리뷰 작성 실패')
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [],
  )

  return { submitReview, isSubmitting, error }
}
