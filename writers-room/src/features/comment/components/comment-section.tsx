'use client'

import { useState, useCallback } from 'react'
import { MessageCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import {
  useComments,
  useCreateComment,
  useLikeComment,
} from '@/features/comment/hooks/use-comments'
import { CommentCard } from './comment-card'
import { CommentForm } from './comment-form'

interface CommentSectionProps {
  chapterId: string
  storyId: string
  isCreator: boolean
}

export function CommentSection({ chapterId }: CommentSectionProps) {
  const { isAuthenticated } = useAuth()
  const [sort, setSort] = useState<'latest' | 'popular'>('latest')

  const { comments, isLoading, mutate } = useComments(chapterId, undefined, sort)

  const { createComment, isSubmitting } = useCreateComment()
  const { likeComment, isLiking } = useLikeComment()

  const handleSubmit = useCallback(
    async (content: string) => {
      const result = await createComment(chapterId, content, 'general')
      if (result) {
        mutate()
      }
    },
    [chapterId, createComment, mutate],
  )

  const handleLike = useCallback(
    async (commentId: string) => {
      const success = await likeComment(commentId)
      if (success) {
        mutate()
      }
    },
    [likeComment, mutate],
  )

  return (
    <div className="mt-12 border-t pt-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-medium">
          <MessageCircle className="h-4 w-4" />
          댓글
          {!isLoading && (
            <span className="text-muted-foreground ml-1 text-xs">{comments.length}</span>
          )}
        </div>

        {/* 정렬 */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as 'latest' | 'popular')}
          className="border-input bg-background text-foreground rounded-md border px-2 py-1 text-xs"
        >
          <option value="latest">최신순</option>
          <option value="popular">인기순</option>
        </select>
      </div>

      {isAuthenticated && (
        <div className="mt-4 mb-4">
          <CommentForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </div>
      )}

      <CommentList
        comments={comments}
        isLoading={isLoading}
        onLike={handleLike}
        isLiking={isLiking}
      />
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
