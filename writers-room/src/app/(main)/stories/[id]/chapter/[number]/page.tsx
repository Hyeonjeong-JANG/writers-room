'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useChapter, useStory } from '@/features/story/hooks/use-stories'

export default function ChapterReaderPage({
  params,
}: {
  params: Promise<{ id: string; number: string }>
}) {
  const { id, number: chapterNum } = use(params)
  const num = parseInt(chapterNum, 10)
  const { story } = useStory(id)
  const { chapter, isLoading } = useChapter(id, num)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[680px] space-y-6 py-8">
        <Skeleton className="mx-auto h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  if (!chapter) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground text-lg">챕터를 찾을 수 없습니다</p>
        <Link href={`/stories/${id}`} className="mt-4">
          <Button variant="outline">스토리로 돌아가기</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[680px] pb-24">
      {/* Header */}
      <div className="mb-8 space-y-2 text-center">
        <Link
          href={`/stories/${id}`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {story?.title ?? '스토리'}
        </Link>
        <h1 className="text-xl font-bold">
          {chapter.chapter_number}화 - {chapter.title}
        </h1>
        {chapter.published_at && (
          <p className="text-muted-foreground text-sm">
            {new Date(chapter.published_at).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        )}
      </div>

      {/* Content */}
      <article
        className="text-lg leading-[1.8] whitespace-pre-wrap"
        style={{ fontFamily: "'Noto Serif KR', Georgia, serif" }}
      >
        {chapter.content}
      </article>

      {/* Navigation */}
      <nav className="border-border bg-background/80 fixed right-0 bottom-0 left-0 z-10 border-t backdrop-blur-sm lg:sticky lg:mt-12">
        <div className="mx-auto flex max-w-[680px] items-center justify-between px-4 py-3">
          {chapter.hasPrev ? (
            <Link href={`/stories/${id}/chapter/${num - 1}`}>
              <Button variant="ghost" className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                이전화
              </Button>
            </Link>
          ) : (
            <div />
          )}

          <span className="text-muted-foreground text-sm">{chapter.chapter_number}화</span>

          {chapter.hasNext ? (
            <Link href={`/stories/${id}/chapter/${num + 1}`}>
              <Button variant="ghost" className="gap-1">
                다음화
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </nav>
    </div>
  )
}
