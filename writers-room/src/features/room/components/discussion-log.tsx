'use client'

import { useEffect, useRef } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { AGENT_ROLE_CONFIG } from '@/types'
import type { AgentRole } from '@/types'
import type { DiscussionLogEntry } from '@/features/room/lib/schemas'

interface DiscussionLogProps {
  log: DiscussionLogEntry[]
  isLoading: boolean
}

export function DiscussionLog({ log, isLoading }: DiscussionLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [log.length])

  if (log.length === 0 && !isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-20">
        <div className="text-muted-foreground text-center">
          <p className="text-lg font-medium">아직 토론이 시작되지 않았습니다</p>
          <p className="mt-1 text-sm">
            &ldquo;토론 시작&rdquo; 버튼을 눌러 AI 에이전트들의 토론을 시작하세요
          </p>
        </div>
      </div>
    )
  }

  // 라운드별 그룹핑
  const rounds = log.reduce<Record<number, DiscussionLogEntry[]>>((acc, entry) => {
    if (!acc[entry.round]) acc[entry.round] = []
    acc[entry.round].push(entry)
    return acc
  }, {})

  return (
    <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto p-4">
      {Object.entries(rounds).map(([round, entries]) => (
        <div key={round} className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="bg-border h-px flex-1" />
            <span className="text-muted-foreground shrink-0 text-xs font-medium">
              라운드 {round}
            </span>
            <div className="bg-border h-px flex-1" />
          </div>
          {entries.map((entry, i) => {
            const config = AGENT_ROLE_CONFIG[entry.agent_role as AgentRole]
            return (
              <div key={`${round}-${i}`} className="flex gap-3">
                <Avatar className="mt-0.5 h-8 w-8 shrink-0">
                  <AvatarFallback
                    style={{ backgroundColor: config.color + '20', color: config.color }}
                    className="text-xs font-bold"
                  >
                    {entry.agent_name.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: config.color }}>
                      {entry.agent_name}
                    </span>
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: config.color + '15',
                        color: config.color,
                      }}
                    >
                      {config.label}
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      {new Date(entry.timestamp).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div
                    className="mt-1 rounded-lg rounded-tl-none border p-3 text-sm leading-relaxed"
                    style={{ borderColor: config.color + '30' }}
                  >
                    {entry.message}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {isLoading && (
        <div className="flex items-center gap-3 py-4">
          <div className="flex gap-1">
            <span className="bg-primary h-2 w-2 animate-bounce rounded-full [animation-delay:-0.3s]" />
            <span className="bg-primary h-2 w-2 animate-bounce rounded-full [animation-delay:-0.15s]" />
            <span className="bg-primary h-2 w-2 animate-bounce rounded-full" />
          </div>
          <span className="text-muted-foreground text-sm">에이전트들이 토론 중입니다...</span>
        </div>
      )}
    </div>
  )
}
