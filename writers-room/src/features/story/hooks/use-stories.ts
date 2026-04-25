'use client'

import useSWR from 'swr'
import type { StoryRow, ChapterRow, StoriesQuery } from '@/features/story/lib/schemas'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useStories(query: Partial<StoriesQuery> = {}) {
  const params = new URLSearchParams()
  if (query.genre) params.set('genre', query.genre)
  if (query.status) params.set('status', query.status)
  if (query.sort) params.set('sort', query.sort)
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))

  const qs = params.toString()
  const { data, error, isLoading, mutate } = useSWR<{
    data: StoryRow[]
    meta: { page: number; limit: number; total: number }
  }>(`/api/stories${qs ? `?${qs}` : ''}`, fetcher)

  return {
    stories: data?.data ?? [],
    meta: data?.meta ?? { page: 1, limit: 20, total: 0 },
    isLoading,
    error,
    mutate,
  }
}

export function useStory(id: string) {
  const { data, error, isLoading, mutate } = useSWR<{ data: StoryRow }>(
    id ? `/api/stories/${id}` : null,
    fetcher,
  )

  return {
    story: data?.data ?? null,
    isLoading,
    error,
    mutate,
  }
}

export function useChapters(storyId: string) {
  const { data, error, isLoading, mutate } = useSWR<{ data: ChapterRow[] }>(
    storyId ? `/api/stories/${storyId}/chapters` : null,
    fetcher,
  )

  return {
    chapters: data?.data ?? [],
    isLoading,
    error,
    mutate,
  }
}

export function useChapter(storyId: string, chapterNumber: number) {
  const { data, error, isLoading } = useSWR<{
    data: ChapterRow & { hasPrev: boolean; hasNext: boolean }
  }>(storyId && chapterNumber ? `/api/stories/${storyId}/chapters/${chapterNumber}` : null, fetcher)

  return {
    chapter: data?.data ?? null,
    isLoading,
    error,
  }
}
