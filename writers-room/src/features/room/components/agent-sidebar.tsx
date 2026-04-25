'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AGENT_ROLE_CONFIG } from '@/types'
import type { AgentRow, StoryAgentRow } from '@/features/room/lib/schemas'

interface AgentSidebarProps {
  storyAgents: StoryAgentRow[]
  isLoading: boolean
  activeAgentId?: string
}

export function AgentSidebar({ storyAgents, isLoading, activeAgentId }: AgentSidebarProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">에이전트</h3>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (storyAgents.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">에이전트</h3>
        <p className="text-muted-foreground text-sm">배치된 에이전트가 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">에이전트 ({storyAgents.length})</h3>
      {storyAgents.map((sa) => {
        const agent = sa.agent as unknown as AgentRow
        if (!agent) return null
        const config = AGENT_ROLE_CONFIG[agent.role]
        const isActive = activeAgentId === agent.id

        return (
          <Card
            key={sa.id}
            className={`transition-colors ${isActive ? 'border-primary ring-primary/20 ring-2' : ''}`}
          >
            <CardContent className="flex items-center gap-3 p-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback
                  style={{ backgroundColor: config.color + '20', color: config.color }}
                  className="text-xs font-bold"
                >
                  {agent.name.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{agent.name}</span>
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[10px]"
                    style={{ borderColor: config.color, color: config.color }}
                  >
                    {config.label}
                  </Badge>
                </div>
                {agent.description && (
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {agent.description}
                  </p>
                )}
              </div>
              {isActive && (
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                    style={{ backgroundColor: config.color }}
                  />
                  <span
                    className="relative inline-flex h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                </span>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
