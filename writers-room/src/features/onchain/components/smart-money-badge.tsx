'use client'

import { TrendingUp } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface SmartMoneyBadgeProps {
  labels?: string[]
}

export function SmartMoneyBadge({ labels = [] }: SmartMoneyBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
          <TrendingUp className="h-3.5 w-3.5" />
          Smart Money
        </TooltipTrigger>
        <TooltipContent>
          <p>Smart Money 인증 지갑</p>
          {labels.length > 0 && (
            <p className="text-muted-foreground text-xs">{labels.join(', ')}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
