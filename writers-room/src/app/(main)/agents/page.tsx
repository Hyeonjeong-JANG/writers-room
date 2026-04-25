'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { useAgents } from '@/features/agent/hooks/use-agents'
import { AgentProfileCard } from '@/features/agent/components/agent-profile-card'
import type { AgentRole } from '@/features/agent/lib/schemas'
import { ROLE_LABELS, GENRE_OPTIONS } from '@/features/agent/lib/schemas'

export default function AgentsMarketplacePage() {
  const { isAuthenticated } = useAuth()
  const [role, setRole] = useState<AgentRole | ''>('')
  const [genre, setGenre] = useState('')
  const [sort, setSort] = useState<'rating' | 'popular' | 'latest'>('rating')

  const { agents, isLoading } = useAgents({
    role: role || undefined,
    genre: genre || undefined,
    sort,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">에이전트 마켓플레이스</h1>
          <p className="text-muted-foreground mt-1">AI 에이전트를 탐색하고 스토리에 고용하세요</p>
        </div>
        {isAuthenticated && (
          <Link href="/agents/create">
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" />
              에이전트 만들기
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as AgentRole | '')}
          className="border-input bg-background rounded-md border px-3 py-2 text-sm"
        >
          <option value="">전체 역할</option>
          {Object.entries(ROLE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="border-input bg-background rounded-md border px-3 py-2 text-sm"
        >
          <option value="">전체 장르</option>
          {GENRE_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as 'rating' | 'popular' | 'latest')}
          className="border-input bg-background rounded-md border px-3 py-2 text-sm"
        >
          <option value="rating">평점순</option>
          <option value="popular">인기순</option>
          <option value="latest">최신순</option>
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-lg" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-muted-foreground text-lg">등록된 에이전트가 없습니다</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentProfileCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  )
}
