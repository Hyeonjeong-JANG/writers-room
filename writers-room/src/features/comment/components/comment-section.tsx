'use client'

import { useState, useCallback } from 'react'
import { Sparkles, MessageCircle, Lightbulb } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import {
  useComments,
  useCreateComment,
  useLikeComment,
  useAnalyzeComments,
} from '@/features/comment/hooks/use-comments'
import { CommentCard } from './comment-card'
import { CommentForm } from './comment-form'
import type { CommentType } from '@/features/comment/lib/schemas'

interface CommentSectionProps {
  chapterId: string
  storyId: string
  isCreator: boolean
}

export function CommentSection({ chapterId, storyId, isCreator }: CommentSectionProps) {
  const { isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<'general' | 'ideas'>('general')
  const [sort, setSort] = useState<'latest' | 'popular'>('latest')

  // 일반 댓글
  const {
    comments: generalComments,
    isLoading: generalLoading,
    mutate: mutateGeneral,
  } = useComments(chapterId, 'general', sort)

  // 아이디어 댓글 (모든 idea 타입)
  const {
    comments: ideaComments,
    isLoading: ideaLoading,
    mutate: mutateIdeas,
  } = useComments(chapterId, undefined, sort)

  const filteredIdeaComments = ideaComments.filter((c) => c.comment_type !== 'general')

  const { createComment, isSubmitting } = useCreateComment()
  const { likeComment, isLiking } = useLikeComment()
  const { analyzeComments, isAnalyzing, error: analyzeError } = useAnalyzeComments()

  const handleSubmit = useCallback(
    async (content: string, type: CommentType) => {
      const result = await createComment(chapterId, content, type)
      if (result) {
        if (type === 'general') {
          mutateGeneral()
        } else {
          mutateIdeas()
        }
      }
    },
    [chapterId, createComment, mutateGeneral, mutateIdeas],
  )

  const handleLike = useCallback(
    async (commentId: string) => {
      const success = await likeComment(commentId)
      if (success) {
        mutateGeneral()
        mutateIdeas()
      }
    },
    [likeComment, mutateGeneral, mutateIdeas],
  )

  const handleAnalyze = useCallback(async () => {
    const result = await analyzeComments(storyId, chapterId)
    if (result && result.adoptedComments.length > 0) {
      mutateIdeas()
    }
  }, [storyId, chapterId, analyzeComments, mutateIdeas])

  const comments = activeTab === 'general' ? generalComments : filteredIdeaComments
  const isLoading = activeTab === 'general' ? generalLoading : ideaLoading

  return (
    <div className="mt-12 border-t pt-8">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'general' | 'ideas')}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="general" className="gap-1.5">
              <MessageCircle className="h-4 w-4" />
              일반 댓글
              {!generalLoading && (
                <span className="text-muted-foreground ml-1 text-xs">{generalComments.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="ideas" className="gap-1.5">
              <Lightbulb className="h-4 w-4" />
              아이디어 제안
              {!ideaLoading && (
                <span className="text-muted-foreground ml-1 text-xs">
                  {filteredIdeaComments.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {/* 정렬 */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'latest' | 'popular')}
              className="border-input bg-background text-foreground rounded-md border px-2 py-1 text-xs"
            >
              <option value="latest">최신순</option>
              <option value="popular">인기순</option>
            </select>

            {/* AI 분석 버튼 (creator만) */}
            {isCreator && activeTab === 'ideas' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isAnalyzing ? 'AI 분석 중...' : 'AI 선별'}
              </Button>
            )}
          </div>
        </div>

        {analyzeError && <p className="mt-2 text-sm text-red-500">{analyzeError}</p>}

        <TabsContent value="general" className="mt-4">
          {isAuthenticated && (
            <div className="mb-4">
              <CommentForm
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                defaultType="general"
              />
            </div>
          )}
          <CommentList
            comments={comments}
            isLoading={isLoading}
            onLike={handleLike}
            isLiking={isLiking}
          />
        </TabsContent>

        <TabsContent value="ideas" className="mt-4">
          {isAuthenticated && (
            <div className="mb-4">
              <CommentForm
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                defaultType="idea_plot"
              />
            </div>
          )}
          <CommentList
            comments={comments}
            isLoading={isLoading}
            onLike={handleLike}
            isLiking={isLiking}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CommentList({
  comments,
  isLoading,
  onLike,
  isLiking,
}: {
  comments: import('@/features/comment/lib/schemas').CommentRow[]
  isLoading: boolean
  onLike: (id: string) => void
  isLiking: (id: string) => boolean
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        아직 댓글이 없습니다. 첫 댓글을 남겨보세요!
      </p>
    )
  }

  return (
    <div className="divide-y">
      {comments.map((comment) => (
        <CommentCard
          key={comment.id}
          comment={comment}
          onLike={onLike}
          isLiking={isLiking(comment.id)}
        />
      ))}
    </div>
  )
}
