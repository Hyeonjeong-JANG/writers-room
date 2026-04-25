'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { COMMENT_TYPE_LABELS, IDEA_TYPES, type CommentType } from '@/features/comment/lib/schemas'

interface CommentFormProps {
  onSubmit: (content: string, type: CommentType) => Promise<void>
  isSubmitting: boolean
  defaultType?: CommentType
}

export function CommentForm({ onSubmit, isSubmitting, defaultType = 'general' }: CommentFormProps) {
  const [content, setContent] = useState('')
  const [commentType, setCommentType] = useState<CommentType>(defaultType)

  const handleSubmit = async () => {
    const trimmed = content.trim()
    if (!trimmed) return
    await onSubmit(trimmed, commentType)
    setContent('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="space-y-2">
      {/* 아이디어 태그 선택 */}
      <div className="flex flex-wrap gap-1.5">
        <Badge
          variant={commentType === 'general' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setCommentType('general')}
        >
          일반 댓글
        </Badge>
        {IDEA_TYPES.map((type) => (
          <Badge
            key={type}
            variant={commentType === type ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setCommentType(type)}
          >
            {COMMENT_TYPE_LABELS[type]}
          </Badge>
        ))}
      </div>

      {/* 입력 영역 */}
      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            commentType === 'general' ? '댓글을 입력하세요...' : '아이디어를 제안하세요...'
          }
          className="min-h-[60px] resize-none"
          maxLength={1000}
        />
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim()}
          className="shrink-0 self-end"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-muted-foreground text-xs">{content.length}/1000 · Ctrl+Enter로 전송</p>
    </div>
  )
}
