'use client'

import { Heart, CheckCircle2 } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { COMMENT_TYPE_LABELS, type CommentRow } from '@/features/comment/lib/schemas'

interface CommentCardProps {
  comment: CommentRow
  onLike: (id: string) => void
  isLiking: boolean
}

export function CommentCard({ comment, onLike, isLiking }: CommentCardProps) {
  const displayName = comment.user?.display_name ?? '익명'
  const initial = displayName.charAt(0).toUpperCase()
  const isIdea = comment.comment_type !== 'general'
  const timeAgo = getTimeAgo(comment.created_at)

  return (
    <div className="flex gap-3 py-3">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-xs">{initial}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{displayName}</span>
          <span className="text-muted-foreground text-xs">{timeAgo}</span>
          {isIdea && (
            <Badge variant="secondary" className="text-xs">
              {COMMENT_TYPE_LABELS[comment.comment_type]}
            </Badge>
          )}
          {comment.is_adopted && (
            <Badge className="gap-1 bg-emerald-500 text-xs text-white hover:bg-emerald-600">
              <CheckCircle2 className="h-3 w-3" />
              AI 선별됨
            </Badge>
          )}
        </div>

        <p className="mt-1 text-sm leading-relaxed">{comment.content}</p>

        {comment.adopted_in_chapter && (
          <p className="mt-1 text-xs text-emerald-600">
            이 아이디어가 {comment.adopted_in_chapter}화에 반영되었습니다
          </p>
        )}

        <div className="mt-1.5 flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground -ml-2 h-7 gap-1 px-2 text-xs"
            onClick={() => onLike(comment.id)}
            disabled={isLiking}
          >
            <Heart className="h-3.5 w-3.5" />
            {comment.like_count > 0 && comment.like_count}
          </Button>
        </div>
      </div>
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}일 전`
  return new Date(dateStr).toLocaleDateString('ko-KR')
}
