'use client'

import { Shield } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  TRUST_TIER_LABELS,
  TRUST_TIER_COLORS,
  TRUST_TIER_BG,
  type TrustTier,
} from '@/features/onchain/lib/schemas'

interface TrustBadgeProps {
  tier: TrustTier
  score?: number
  size?: 'sm' | 'md'
}

export function TrustBadge({ tier, score, size = 'sm' }: TrustBadgeProps) {
  if (tier === 'none') return null

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${TRUST_TIER_BG[tier]} ${TRUST_TIER_COLORS[tier]} ${textSize} font-medium`}
        >
          <Shield className={`${iconSize} fill-current`} />
          {TRUST_TIER_LABELS[tier]}
        </TooltipTrigger>
        <TooltipContent>
          <p>Trust Score: {score?.toFixed(1) ?? '-'} / 100</p>
          <p className="text-muted-foreground text-xs">Nansen 기반 에이전트 신뢰도</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
