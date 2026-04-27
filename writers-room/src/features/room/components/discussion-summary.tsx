'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'

interface DiscussionSummaryProps {
  summary: string
  totalRounds: number
  consensusReached?: boolean
}

export function DiscussionSummary({
  summary,
  totalRounds,
  consensusReached,
}: DiscussionSummaryProps) {
  return (
    <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-base">토론 요약</CardTitle>
          {consensusReached !== undefined && (
            <Badge
              variant="outline"
              className={`text-xs ${consensusReached ? 'border-green-500 text-green-700 dark:text-green-400' : 'border-orange-500 text-orange-700 dark:text-orange-400'}`}
            >
              {consensusReached ? '합의 종료' : 'PD 최종 결정'}
            </Badge>
          )}
          <Badge variant="outline" className="ml-auto text-xs">
            {totalRounds}라운드
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
      </CardContent>
    </Card>
  )
}
