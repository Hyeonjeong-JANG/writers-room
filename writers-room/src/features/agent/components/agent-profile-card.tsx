'use client'

import Link from 'next/link'
import { Star, Users } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ROLE_LABELS, ROLE_COLORS, type AgentRow } from '@/features/agent/lib/schemas'
import { TrustBadge } from '@/features/onchain/components/trust-badge'
import type { TrustTier } from '@/features/onchain/lib/schemas'

interface AgentProfileCardProps {
  agent: AgentRow
}

export function AgentProfileCard({ agent }: AgentProfileCardProps) {
  const initial = agent.name.charAt(0)

  return (
    <Link href={`/agents/${agent.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className={`${ROLE_COLORS[agent.role]} text-lg text-white`}>
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold">{agent.name}</h3>
              <div className="mt-0.5 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {ROLE_LABELS[agent.role]}
                </Badge>
                <span className="flex items-center gap-0.5 text-sm text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {agent.avg_rating.toFixed(1)}
                </span>
                {agent.trust_score && agent.trust_score.trust_tier !== 'none' && (
                  <TrustBadge
                    tier={agent.trust_score.trust_tier as TrustTier}
                    score={agent.trust_score.overall_score}
                  />
                )}
              </div>
            </div>
          </div>

          {agent.description && (
            <p className="text-muted-foreground mt-3 line-clamp-2 text-sm">{agent.description}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-1">
            {agent.genre_tags.slice(0, 3).map((genre) => (
              <Badge key={genre} variant="outline" className="text-xs">
                {genre}
              </Badge>
            ))}
          </div>

          <div className="text-muted-foreground mt-3 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {agent.hire_count}회 고용
            </span>
            <span className="font-medium text-indigo-600">
              {agent.price_usdc > 0 ? `$${agent.price_usdc} USDC` : '무료'}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
