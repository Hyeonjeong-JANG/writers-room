'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'

interface DiscussionSummaryProps {
  summary: string
  totalRounds: number
}

export function DiscussionSummary({ summary, totalRounds }: DiscussionSummaryProps) {
  return (
    <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-base">토론 요약</CardTitle>
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
