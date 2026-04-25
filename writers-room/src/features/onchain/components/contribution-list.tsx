'use client'

import { ExternalLink, MessageSquare, BookOpen, Bot } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CONTRIBUTION_TYPE_LABELS,
  type ContributionRow,
  type ContributionType,
} from '@/features/onchain/lib/schemas'

const TYPE_ICONS: Record<ContributionType, typeof MessageSquare> = {
  comment_adopted: MessageSquare,
  chapter_generated: BookOpen,
  agent_created: Bot,
}

const TYPE_BADGE_COLORS: Record<ContributionType, string> = {
  comment_adopted: 'bg-blue-100 text-blue-700',
  chapter_generated: 'bg-purple-100 text-purple-700',
  agent_created: 'bg-teal-100 text-teal-700',
}

interface ContributionListProps {
  contributions: ContributionRow[]
  isLoading?: boolean
  showExplorerLinks?: boolean
}

export function ContributionList({
  contributions,
  isLoading,
  showExplorerLinks = true,
}: ContributionListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">기여 히스토리</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">기여 히스토리</CardTitle>
      </CardHeader>
      <CardContent>
        {contributions.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            아직 기여 기록이 없습니다
          </p>
        ) : (
          <div className="divide-y">
            {contributions.map((c) => {
              const Icon = TYPE_ICONS[c.contribution_type]
              return (
                <div key={c.id} className="flex items-center gap-3 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
                    <Icon className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${TYPE_BADGE_COLORS[c.contribution_type]}`}
                      >
                        {CONTRIBUTION_TYPE_LABELS[c.contribution_type]}
                      </Badge>
                      {c.onchain_confirmed && (
                        <Badge variant="outline" className="text-xs text-green-600">
                          On-chain
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      {c.story && (
                        <span className="text-muted-foreground truncate text-xs">
                          {c.story.title}
                        </span>
                      )}
                      <span className="text-muted-foreground text-xs">
                        {new Date(c.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>
                  {showExplorerLinks && c.tx_hash && (
                    <a
                      href={`https://basescan.org/tx/${c.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
