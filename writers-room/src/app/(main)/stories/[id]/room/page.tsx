'use client'

import { use, useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, MessageSquare, PanelLeftClose, PanelLeftOpen, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { useStory } from '@/features/story/hooks/use-stories'
import { useAuth } from '@/hooks/use-auth'
import { useStoryAgents, useLatestDiscussion, useRoomActions } from '@/features/room/hooks/use-room'
import { AgentSidebar } from '@/features/room/components/agent-sidebar'
import { DiscussionLog } from '@/features/room/components/discussion-log'
import { DiscussionSummary } from '@/features/room/components/discussion-summary'
import { ChapterPreview } from '@/features/room/components/chapter-preview'
import type {
  DiscussionLogEntry,
  DiscussionResult,
  GeneratedChapter,
} from '@/features/room/lib/schemas'

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storyId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { story, isLoading: storyLoading } = useStory(storyId)
  const { storyAgents, isLoading: agentsLoading } = useStoryAgents(storyId)
  const { discussion: latestDiscussion } = useLatestDiscussion(storyId)

  const {
    startDiscussion,
    generateChapter,
    isDiscussing,
    isGenerating,
    discussionError,
    generateError,
  } = useRoomActions()

  const [discussionResult, setDiscussionResult] = useState<DiscussionResult | null>(null)
  const [generatedChapter, setGeneratedChapter] = useState<GeneratedChapter | null>(null)
  const [discussionLog, setDiscussionLog] = useState<DiscussionLogEntry[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isPublishing, setIsPublishing] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | undefined>()
  const [autoStartStatus, setAutoStartStatus] = useState<string | null>(null)
  const autoStartTriggered = useRef(false)

  const isCreator = user && story && user.id === story.creator_id

  // DB에서 복원한 토론 또는 방금 시작한 토론
  const restoredResult = latestDiscussion
    ? {
        discussionId: latestDiscussion.id,
        summary: latestDiscussion.summary ?? '',
        totalRounds: latestDiscussion.total_rounds,
        log: latestDiscussion.discussion_log ?? [],
      }
    : null
  const effectiveResult = discussionResult ?? restoredResult
  const effectiveLog = discussionLog.length > 0 ? discussionLog : (restoredResult?.log ?? [])

  // autostart=true 파라미터로 진입 시 자동 토론 + 챕터 생성
  useEffect(() => {
    if (autoStartTriggered.current) return
    if (searchParams.get('autostart') !== 'true') return
    if (!isCreator || agentsLoading || storyLoading) return

    autoStartTriggered.current = true

    // URL에서 autostart 제거 (재방문 시 재트리거 방지)
    router.replace(`/stories/${storyId}/room`, { scroll: false })

    const run = async () => {
      setAutoStartStatus('AI 에이전트들이 토론 중...')
      const result = await startDiscussion(storyId)
      if (result) {
        setDiscussionResult(result)
        setDiscussionLog(result.log)

        setAutoStartStatus('첫 챕터 생성 중...')
        const chapter = await generateChapter(result.discussionId)
        if (chapter) {
          setGeneratedChapter(chapter)

          // 자동 발행
          setAutoStartStatus('첫 챕터 발행 중...')
          try {
            const res = await fetch(`/api/stories/${storyId}/chapters`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: chapter.title,
                content: chapter.content,
                discussionId: result.discussionId,
              }),
            })
            if (res.ok) {
              router.push(`/stories/${storyId}`)
              return
            }
          } catch {
            // 발행 실패 시 미리보기로 폴백
          }
        }
      }
      setAutoStartStatus(null)
    }

    run()
  }, [
    searchParams,
    isCreator,
    agentsLoading,
    storyLoading,
    storyId,
    router,
    startDiscussion,
    generateChapter,
  ])

  const handleStartDiscussion = useCallback(async () => {
    const result = await startDiscussion(storyId)
    if (result) {
      setDiscussionResult(result)
      setDiscussionLog(result.log)
      setGeneratedChapter(null)
    }
  }, [storyId, startDiscussion])

  const handleGenerateChapter = useCallback(async () => {
    if (!effectiveResult) return
    const chapter = await generateChapter(effectiveResult.discussionId)
    if (chapter) {
      setGeneratedChapter(chapter)
    }
  }, [effectiveResult, generateChapter])

  const handlePublish = useCallback(
    async (title: string, content: string) => {
      if (!effectiveResult) return
      setIsPublishing(true)
      try {
        const res = await fetch(`/api/stories/${storyId}/chapters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            content,
            discussionId: effectiveResult.discussionId,
          }),
        })
        if (res.ok) {
          router.push(`/stories/${storyId}`)
        }
      } finally {
        setIsPublishing(false)
      }
    },
    [storyId, effectiveResult, router],
  )

  // 로딩 상태
  if (storyLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    )
  }

  // 스토리 없음
  if (!story) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground text-lg">스토리를 찾을 수 없습니다</p>
        <Link href="/stories" className="mt-4">
          <Button variant="outline">스토리 목록으로</Button>
        </Link>
      </div>
    )
  }

  // 권한 없음
  if (!isCreator) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground text-lg">스토리 작성자만 작가방에 입장할 수 있습니다</p>
        <Link href={`/stories/${storyId}`} className="mt-4">
          <Button variant="outline">스토리로 돌아가기</Button>
        </Link>
      </div>
    )
  }

  const sidebarContent = (
    <AgentSidebar
      storyAgents={storyAgents}
      isLoading={agentsLoading}
      activeAgentId={isDiscussing ? activeAgentId : undefined}
    />
  )

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b pb-3">
        <Link href={`/stories/${storyId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{story.title}</h1>
          <p className="text-muted-foreground text-sm">작가방</p>
        </div>

        {/* 데스크탑 사이드바 토글 */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:flex"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <PanelLeftOpen className="h-5 w-5" />
          )}
        </Button>

        {/* 모바일 사이드바 시트 */}
        <Sheet>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" />}>
            <PanelLeftOpen className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-4">
            <SheetTitle className="sr-only">에이전트 목록</SheetTitle>
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 gap-4 pt-4">
        {/* 데스크탑 사이드바 */}
        {sidebarOpen && (
          <aside className="hidden w-64 shrink-0 overflow-y-auto lg:block">{sidebarContent}</aside>
        )}

        {/* 메인 채팅 영역 */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* 토론 로그 */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
            <DiscussionLog log={effectiveLog} isLoading={isDiscussing} />
          </div>

          {/* 에러 표시 */}
          {(discussionError || generateError) && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              {discussionError || generateError}
            </div>
          )}

          {/* 토론 요약 */}
          {effectiveResult?.summary && (
            <div className="mt-3">
              <DiscussionSummary
                summary={effectiveResult.summary}
                totalRounds={effectiveResult.totalRounds}
              />
            </div>
          )}

          {/* 챕터 미리보기 */}
          {generatedChapter && effectiveResult && (
            <div className="mt-3">
              <ChapterPreview
                chapter={generatedChapter}
                storyId={storyId}
                discussionId={effectiveResult.discussionId}
                onPublish={handlePublish}
                isPublishing={isPublishing}
              />
            </div>
          )}

          {/* 자동 시작 상태 표시 */}
          {autoStartStatus && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {autoStartStatus}
            </div>
          )}

          {/* 하단 액션 바 */}
          <div className="mt-3 flex items-center gap-2 border-t pt-3">
            <Button
              onClick={handleStartDiscussion}
              disabled={isDiscussing || agentsLoading}
              className="gap-1.5"
            >
              <MessageSquare className="h-4 w-4" />
              {isDiscussing ? '토론 진행 중...' : '토론 시작'}
            </Button>

            {effectiveResult && !generatedChapter && (
              <Button
                onClick={handleGenerateChapter}
                disabled={isGenerating}
                variant="secondary"
                className="gap-1.5"
              >
                <Wand2 className="h-4 w-4" />
                {isGenerating ? '생성 중...' : '챕터 초안 생성'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
