'use client'

import { useCallback, useState } from 'react'
import useSWR from 'swr'
import type { CommentRow, CommentType, AnalyzeResult } from '@/features/comment/lib/schemas'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useComments(
  chapterId: string,
  type?: CommentType,
  sort: 'latest' | 'popular' = 'latest',
) {
  const params = new URLSearchParams({ chapterId })
  if (type) params.set('type', type)
  if (sort) params.set('sort', sort)

  const { data, error, isLoading, mutate } = useSWR<{ data: CommentRow[] }>(
    chapterId ? `/api/comments?${params.toString()}` : null,
    fetcher,
  )

  return {
    comments: data?.data ?? [],
    isLoading,
    error,
    mutate,
  }
}

export function useCreateComment() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createComment = useCallback(
    async (chapterId: string, content: string, commentType: CommentType = 'general') => {
      setIsSubmitting(true)
      setError(null)
      try {
        const res = await fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chapterId, content, commentType }),
        })

        if (!res.ok) {
          const { error } = await res.json()
          throw new Error(error?.message ?? '댓글 작성 실패')
        }

        const { data } = await res.json()
        return data as CommentRow
      } catch (err) {
        const message = err instanceof Error ? err.message : '댓글 작성 실패'
        setError(message)
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [],
  )

  return { createComment, isSubmitting, error }
}

export function useLikeComment() {
  const [likingIds, setLikingIds] = useState<Set<string>>(new Set())

  const likeComment = useCallback(async (commentId: string) => {
    setLikingIds((prev) => new Set(prev).add(commentId))
    try {
      const res = await fetch(`/api/comments/${commentId}/like`, { method: 'POST' })
      return res.ok
    } finally {
      setLikingIds((prev) => {
        const next = new Set(prev)
        next.delete(commentId)
        return next
      })
    }
  }, [])

  return { likeComment, isLiking: (id: string) => likingIds.has(id) }
}

export function useAnalyzeComments() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyzeComments = useCallback(async (storyId: string, chapterId: string) => {
    setIsAnalyzing(true)
    setError(null)
    try {
      const res = await fetch('/api/comments/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, chapterId }),
      })

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error?.message ?? '분석 실패')
      }

      const { data } = await res.json()
      return data as AnalyzeResult
    } catch (err) {
      const message = err instanceof Error ? err.message : '분석 실패'
      setError(message)
      return null
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  return { analyzeComments, isAnalyzing, error }
}
