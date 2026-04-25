'use client'

import Link from 'next/link'
import { Eye, MessageSquare, BookOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { StoryRow } from '@/features/story/lib/schemas'

interface StoryCardProps {
  story: StoryRow
}

export function StoryCard({ story }: StoryCardProps) {
  const statusLabel: Record<string, string> = {
    ongoing: '연재중',
    hiatus: '휴재',
    completed: '완결',
  }

  return (
    <Link href={`/stories/${story.id}`}>
      <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
        {story.cover_image_url ? (
          <div className="aspect-video w-full overflow-hidden rounded-t-lg">
            <img
              src={story.cover_image_url}
              alt={story.title}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="from-primary/20 to-primary/5 flex aspect-video w-full items-center justify-center rounded-t-lg bg-gradient-to-br">
            <BookOpen className="text-primary/40 h-10 w-10" />
          </div>
        )}
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-1.5">
            {story.genre.map((g) => (
              <Badge key={g} variant="secondary" className="text-xs">
                {g}
              </Badge>
            ))}
          </div>
          <h3 className="mt-2 line-clamp-1 text-lg font-semibold">{story.title}</h3>
          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{story.synopsis}</p>
          <div className="text-muted-foreground mt-3 flex items-center gap-3 text-xs">
            <span>{statusLabel[story.status] ?? story.status}</span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {story.view_count >= 1000
                ? `${(story.view_count / 1000).toFixed(1)}K`
                : story.view_count}
            </span>
            {story.creator && (
              <span className="ml-auto truncate">by {story.creator.display_name}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
