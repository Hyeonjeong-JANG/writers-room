'use client'

import { useState, useEffect } from 'react'
import { Clock, CheckCircle2 } from 'lucide-react'

const DEADLINE_HOURS = 48

interface ChapterCountdownProps {
  publishedAt: string
}

export function ChapterCountdown({ publishedAt }: ChapterCountdownProps) {
  const [remaining, setRemaining] = useState(() => calcRemaining(publishedAt))

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(calcRemaining(publishedAt))
    }, 60_000) // 1분마다 갱신
    return () => clearInterval(timer)
  }, [publishedAt])

  if (remaining <= 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        댓글 마감 · 다음 회차 생성 대기 중
      </div>
    )
  }

  const hours = Math.floor(remaining / 3600_000)
  const minutes = Math.floor((remaining % 3600_000) / 60_000)

  return (
    <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
      <Clock className="h-4 w-4 shrink-0" />
      다음 회차 자동 생성까지 {hours}시간 {minutes}분
    </div>
  )
}

function calcRemaining(publishedAt: string): number {
  const deadline = new Date(publishedAt).getTime() + DEADLINE_HOURS * 3600_000
  return deadline - Date.now()
}
