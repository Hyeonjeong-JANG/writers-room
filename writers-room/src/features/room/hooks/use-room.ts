'use client'

import useSWR from 'swr'
import { useState, useCallback } from 'react'
import type {
  AgentRow,
  DiscussionLogEntry,
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

// 스토리의 최신 토론 조회
export function useLatestDiscussion(storyId: string) {
  const { data, error, isLoading } = useSWR<{ data: DiscussionRow | null }>(
    storyId ? `/api/room/discuss?storyId=${storyId}` : null,
    fetcher,
  )

  return {
    discussion: data?.data ?? null,
    isLoading,
    error,
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

// SSE 스트림 콜백 타입
export interface DiscussionCallbacks {
  onAgentSpeaking?: (agentId: string, agentName: string, agentRole: string, round: number) => void
  onAgentMessage?: (entry: DiscussionLogEntry) => void
  onSummaryGenerating?: () => void
}

// 토론 시작 + 챕터 생성 액션
export function useRoomActions() {
  const [isDiscussing, setIsDiscussing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [discussionError, setDiscussionError] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const startDiscussion = useCallback(
    async (
      storyId: string,
      adoptedCommentIds: string[] = [],
      callbacks?: DiscussionCallbacks,
    ): Promise<DiscussionResult | null> => {
      setIsDiscussing(true)
      setDiscussionError(null)

      try {
        const res = await fetch('/api/room/discuss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storyId, adoptedCommentIds }),
        })

        // pre-stream 에러 (4xx/5xx JSON 응답)
        if (!res.ok) {
          const json = await res.json()
          setDiscussionError(json.error?.message ?? '토론 시작에 실패했습니다')
          return null
        }

        // SSE 스트림 소비
        const reader = res.body?.getReader()
        if (!reader) {
          setDiscussionError('스트림을 열 수 없습니다')
          return null
        }

        const decoder = new TextDecoder()
        let buffer = ''
        let finalResult: DiscussionResult | null = null

        const processSSELine = (line: string) => {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) return

          try {
            const event = JSON.parse(trimmed.slice(6))

            switch (event.type) {
              case 'agent_speaking':
                callbacks?.onAgentSpeaking?.(
                  event.agent.id,
                  event.agent.name,
                  event.agent.role,
                  event.round,
                )
                break
              case 'agent_message':
                callbacks?.onAgentMessage?.(event.entry)
                break
              case 'summary_generating':
                callbacks?.onSummaryGenerating?.()
                break
              case 'completed':
                finalResult = event.result
                break
              case 'error':
                setDiscussionError(event.error ?? '토론 중 오류가 발생했습니다')
                break
            }
          } catch {
            // JSON 파싱 실패 — 무시
          }
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() ?? ''

          for (const part of parts) {
            processSSELine(part)
          }
        }

        // 스트림 종료 후 버퍼에 남은 마지막 이벤트 처리
        if (buffer.trim()) {
          processSSELine(buffer)
        }

        return finalResult
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
