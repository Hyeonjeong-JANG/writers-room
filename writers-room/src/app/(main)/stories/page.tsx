'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StoryCard } from '@/components/common/story-card'
import { useStories } from '@/features/story/hooks/use-stories'

const GENRES = [
  '로맨스',
  '판타지',
  '액션',
  'SF',
  '스릴러',
  '미스터리',
  '드라마',
  '공포',
  '코미디',
  '무협',
]

export default function StoriesPage() {
  const [selectedGenre, setSelectedGenre] = useState<string | undefined>()
  const [selectedStatus, setSelectedStatus] = useState<
    'ongoing' | 'hiatus' | 'completed' | undefined
  >()
  const [sort, setSort] = useState<'latest' | 'popular'>('latest')
  const [page, setPage] = useState(1)

  const { stories, meta, isLoading } = useStories({
    genre: selectedGenre,
    status: selectedStatus,
    sort,
    page,
    limit: 12,
  })

  const totalPages = Math.ceil(meta.total / meta.limit)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">스토리 탐색</h1>
          <p className="text-muted-foreground mt-1 text-sm">AI와 독자가 함께 만드는 이야기</p>
        </div>
        <Link href="/stories/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />새 스토리
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Genre filter */}
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedGenre === undefined ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => {
              setSelectedGenre(undefined)
              setPage(1)
            }}
          >
            전체
          </Badge>
          {GENRES.map((genre) => (
            <Badge
              key={genre}
              variant={selectedGenre === genre ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => {
                setSelectedGenre(selectedGenre === genre ? undefined : genre)
                setPage(1)
              }}
            >
              {genre}
            </Badge>
          ))}
        </div>

        {/* Sort & Status */}
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 rounded-lg border p-0.5">
            <button
              className={`rounded-md px-3 py-1 text-sm transition-colors ${sort === 'latest' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setSort('latest')}
            >
              최신순
            </button>
            <button
              className={`rounded-md px-3 py-1 text-sm transition-colors ${sort === 'popular' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setSort('popular')}
            >
              인기순
            </button>
          </div>
          <div className="flex gap-1 rounded-lg border p-0.5">
            {[
              { value: undefined, label: '전체' },
              { value: 'ongoing' as const, label: '연재중' },
              { value: 'completed' as const, label: '완결' },
            ].map((opt) => (
              <button
                key={opt.label}
                className={`rounded-md px-3 py-1 text-sm transition-colors ${selectedStatus === opt.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => {
                  setSelectedStatus(opt.value)
                  setPage(1)
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ) : stories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground text-lg">스토리가 없습니다</p>
          <p className="text-muted-foreground mt-1 text-sm">첫 번째 스토리를 만들어보세요!</p>
          <Link href="/stories/create" className="mt-4">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              스토리 만들기
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                이전
              </Button>
              <span className="text-muted-foreground text-sm">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                다음
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
