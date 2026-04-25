'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>
  isSubmitting: boolean
}

export function CommentForm({ onSubmit, isSubmitting }: CommentFormProps) {
  const [content, setContent] = useState('')

  const handleSubmit = async () => {
    const trimmed = content.trim()
    if (!trimmed) return
    await onSubmit(trimmed)
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
      {/* 입력 영역 */}
      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="댓글을 입력하세요..."
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
