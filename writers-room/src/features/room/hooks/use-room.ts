'use client'

import useSWR from 'swr'
import { useState, useCallback } from 'react'
import type {
  AgentRow,
  DiscussionRow,
  DiscussionResult,
  GeneratedChapter,
  StoryAgentRow,
} from '@/features/room/lib/schemas'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// 스토리에 배치된 에이전트 목록
export function useStoryAgents(storyId: string) {
  const { data, error, isLoading, mutate } = useSWR<{ data: StoryAgentRow[] }>(
    storyId ? `/api/stories/${storyId}/agents` : null,
    fetcher,
  )

  return {
    storyAgents: data?.data ?? [],
    isLoading,
    error,
    mutate,
  }
}

// 토론 상세 조회
export function useDiscussion(discussionId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{ data: DiscussionRow }>(
    discussionId ? `/api/room/discuss/${discussionId}` : null,
    fetcher,
  )

  return {
    discussion: data?.data ?? null,
    isLoading,
    error,
    mutate,
  }
}

// 토론 시작 + 챕터 생성 액션
export function useRoomActions() {
  const [isDiscussing, setIsDiscussing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [discussionError, setDiscussionError] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const startDiscussion = useCallback(
    async (storyId: string, adoptedCommentIds: string[] = []): Promise<DiscussionResult | null> => {
      setIsDiscussing(true)
      setDiscussionError(null)

      try {
        const res = await fetch('/api/room/discuss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storyId, adoptedCommentIds }),
        })

        const json = await res.json()

        if (!res.ok) {
          setDiscussionError(json.error?.message ?? '토론 시작에 실패했습니다')
          return null
        }

        return json.data as DiscussionResult
      } catch {
        setDiscussionError('네트워크 오류가 발생했습니다')
        return null
      } finally {
        setIsDiscussing(false)
      }
    },
    [],
  )

  const generateChapter = useCallback(
    async (discussionId: string): Promise<GeneratedChapter | null> => {
      setIsGenerating(true)
      setGenerateError(null)

      try {
        const res = await fetch('/api/room/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ discussionId }),
        })

        const json = await res.json()

        if (!res.ok) {
          setGenerateError(json.error?.message ?? '챕터 생성에 실패했습니다')
          return null
        }

        return json.data as GeneratedChapter
      } catch {
        setGenerateError('네트워크 오류가 발생했습니다')
        return null
      } finally {
        setIsGenerating(false)
      }
    },
    [],
  )

  return {
    startDiscussion,
    generateChapter,
    isDiscussing,
    isGenerating,
    discussionError,
    generateError,
  }
}
