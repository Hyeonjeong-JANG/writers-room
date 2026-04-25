'use client'

import { Shield, RefreshCw, Users, TrendingUp, Activity, UserCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TRUST_TIER_LABELS,
  TRUST_TIER_COLORS,
  TRUST_TIER_BG,
  type AgentTrustScoreRow,
} from '@/features/onchain/lib/schemas'

interface TrustScoreDetailProps {
  trustScore: AgentTrustScoreRow | null
  isLoading?: boolean
  onRecalculate?: () => void
  isRecalculating?: boolean
}

function MetricBar({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: typeof Users
}) {
  const percentage = Math.min(value, 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <span className="font-medium">{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export function TrustScoreDetail({
  trustScore,
  isLoading,
  onRecalculate,
  isRecalculating,
}: TrustScoreDetailProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trust Score</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!trustScore) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trust Score</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-4 text-center text-sm">
            아직 Trust Score가 산출되지 않았습니다
          </p>
          {onRecalculate && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={onRecalculate}
                disabled={isRecalculating}
              >
                <RefreshCw
                  className={`mr-1.5 h-3.5 w-3.5 ${isRecalculating ? 'animate-spin' : ''}`}
                />
                {isRecalculating ? '산출 중...' : 'Trust Score 산출'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const tier = trustScore.trust_tier as keyof typeof TRUST_TIER_LABELS

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Trust Score</CardTitle>
        {onRecalculate && (
          <Button variant="ghost" size="sm" onClick={onRecalculate} disabled={isRecalculating}>
            <RefreshCw className={`h-3.5 w-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Overall */}
        <div className={`rounded-lg p-4 text-center ${TRUST_TIER_BG[tier]}`}>
          <div className="flex items-center justify-center gap-2">
            <Shield className={`h-6 w-6 ${TRUST_TIER_COLORS[tier]}`} />
            <span className={`text-3xl font-bold ${TRUST_TIER_COLORS[tier]}`}>
              {trustScore.overall_score.toFixed(1)}
            </span>
          </div>
          <p className={`mt-1 text-sm font-medium ${TRUST_TIER_COLORS[tier]}`}>
            {TRUST_TIER_LABELS[tier]}
          </p>
        </div>

        {/* Metrics */}
        <div className="space-y-3">
          <MetricBar label="재고용률" value={trustScore.rehire_rate} icon={UserCheck} />
          <MetricBar
            label="Smart Money 비율"
            value={trustScore.smart_money_ratio}
            icon={TrendingUp}
          />
          <MetricBar label="활용률" value={trustScore.utilization_rate} icon={Activity} />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              고유 고용자 수
            </span>
            <span className="font-medium">{trustScore.unique_hirers}명</span>
          </div>
        </div>

        {/* Updated at */}
        <p className="text-muted-foreground text-right text-xs">
          마지막 산출: {new Date(trustScore.calculated_at).toLocaleString('ko-KR')}
        </p>
      </CardContent>
    </Card>
  )
}
