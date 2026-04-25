'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Clock, Eye, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useStory, useChapters } from '@/features/story/hooks/use-stories'
import { useAuth } from '@/hooks/use-auth'

export default function StoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { story, isLoading: storyLoading } = useStory(id)
  const { chapters, isLoading: chaptersLoading } = useChapters(id)
  const { user } = useAuth()

  const isCreator = user && story && user.id === story.creator_id
  const publishedChapters = chapters.filter((c) => c.status === 'published')

  const statusLabel: Record<string, string> = {
    ongoing: '연재중',
    hiatus: '휴재',
    completed: '완결',
  }

  if (storyLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="aspect-video w-full rounded-lg" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  if (!story) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground text-lg">스토리를 찾을 수 없습니다</p>
        <Link href="/stories" className="mt-4">
          <Button variant="outline">스토리 목록으로</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/stories">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{story.title}</h1>
          <div className="text-muted-foreground mt-1 flex items-center gap-3 text-sm">
            <span>{story.creator?.display_name}</span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {story.view_count}
            </span>
            <Badge variant="secondary" className="text-xs">
              {statusLabel[story.status]}
            </Badge>
          </div>
        </div>
        {isCreator && (
          <Link href={`/stories/${id}/room`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Settings className="h-4 w-4" />
              작가방
            </Button>
          </Link>
        )}
      </div>

      {/* Genre tags */}
      <div className="flex flex-wrap gap-2">
        {story.genre.map((g) => (
          <Badge key={g} variant="secondary">
            {g}
          </Badge>
        ))}
      </div>

      {/* Synopsis */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">시놉시스</h2>
        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {story.synopsis}
        </p>
      </div>

      {/* Characters */}
      {story.characters && Array.isArray(story.characters) && story.characters.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">등장인물</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(story.characters as Array<{ name: string; role?: string; personality?: string }>).map(
              (char, i) => (
                <Card key={i}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{char.name}</span>
                      {char.role && (
                        <Badge variant="outline" className="text-xs">
                          {char.role}
                        </Badge>
                      )}
                    </div>
                    {char.personality && (
                      <p className="text-muted-foreground mt-1 text-sm">{char.personality}</p>
                    )}
                  </CardContent>
                </Card>
              ),
            )}
          </div>
        </div>
      )}

      <Separator />

      {/* Chapters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">챕터 목록 ({publishedChapters.length}화)</h2>
        </div>

        {chaptersLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : publishedChapters.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            아직 발행된 챕터가 없습니다
          </p>
        ) : (
          <div className="space-y-2">
            {publishedChapters.map((chapter) => (
              <Link key={chapter.id} href={`/stories/${id}/chapter/${chapter.chapter_number}`}>
                <Card className="hover:bg-accent transition-colors">
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold">
                      {chapter.chapter_number}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{chapter.title}</p>
                      {chapter.published_at && (
                        <p className="text-muted-foreground flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          {new Date(chapter.published_at).toLocaleDateString('ko-KR')}
                        </p>
                      )}
                    </div>
                    <BookOpen className="text-muted-foreground h-4 w-4 shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
