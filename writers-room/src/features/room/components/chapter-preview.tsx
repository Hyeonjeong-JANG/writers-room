'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Edit3, Save, Send } from 'lucide-react'
import type { GeneratedChapter } from '@/features/room/lib/schemas'

interface ChapterPreviewProps {
  chapter: GeneratedChapter
  storyId: string
  discussionId: string
  onPublish: (title: string, content: string) => Promise<void>
  isPublishing: boolean
}

export function ChapterPreview({
  chapter,
  storyId,
  discussionId,
  onPublish,
  isPublishing,
}: ChapterPreviewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(chapter.title)
  const [content, setContent] = useState(chapter.content)

  const wordCount = content.length

  const handlePublish = async () => {
    await onPublish(title, content)
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="text-primary h-5 w-5" />
            <CardTitle className="text-lg">챕터 초안</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{wordCount.toLocaleString()}자</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="gap-1"
            >
              {isEditing ? (
                <>
                  <Save className="h-3.5 w-3.5" />
                  완료
                </>
              ) : (
                <>
                  <Edit3 className="h-3.5 w-3.5" />
                  편집
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="챕터 제목"
              className="text-lg font-semibold"
            />
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[400px] resize-y leading-relaxed"
            />
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold">{title}</h3>
            <div className="prose prose-sm max-w-none leading-relaxed whitespace-pre-wrap">
              {content}
            </div>
          </>
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={handlePublish} disabled={isPublishing} className="gap-1.5">
            <Send className="h-4 w-4" />
            {isPublishing ? '발행 중...' : '발행하기'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
