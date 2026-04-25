'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Bot,
  DollarSign,
  Award,
  Eye,
  PenTool,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  Star,
  ArrowUpRight,
  TrendingUp,
  User,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import {
  useDashboardStats,
  useMyStories,
  useMyAgents,
  useEarnings,
} from '@/features/dashboard/hooks/use-dashboard'
import { ROLE_LABELS, ROLE_COLORS } from '@/features/agent/lib/schemas'
import type { AgentRole } from '@/features/agent/lib/schemas'

const STATUS_LABELS: Record<string, string> = {
  ongoing: '연재중',
  hiatus: '휴재',
  completed: '완결',
}

const STATUS_COLORS: Record<string, string> = {
  ongoing: 'bg-green-100 text-green-700',
  hiatus: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
}

const TRUST_TIER_LABELS: Record<string, string> = {
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
  none: '-',
}

const TRUST_TIER_COLORS: Record<string, string> = {
  gold: 'bg-yellow-100 text-yellow-700',
  silver: 'bg-gray-100 text-gray-600',
  bronze: 'bg-orange-100 text-orange-700',
}

const BASE_EXPLORER_URL = 'https://basescan.org/tx/'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatUsdc(amount: number) {
  return amount.toFixed(2)
}

export default function DashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const { stats, isLoading: isStatsLoading } = useDashboardStats(user?.id)
  const [activeTab, setActiveTab] = useState('overview')

  if (isAuthLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <User className="text-muted-foreground mb-4 h-12 w-12" />
        <p className="text-muted-foreground text-lg">로그인이 필요합니다</p>
        <p className="text-muted-foreground mt-1 text-sm">지갑을 연결하여 대시보드를 확인하세요</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <Link href="/profile" className="text-muted-foreground hover:text-foreground text-sm">
          프로필 보기 &rarr;
        </Link>
      </div>

      {/* Stats Cards */}
      {isStatsLoading || !stats ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-500" />
                <span className="text-muted-foreground text-xs">내 스토리</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{stats.stories.total}</p>
              <p className="text-muted-foreground text-xs">
                연재 {stats.stories.ongoing} | 완결 {stats.stories.completed}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-violet-500" />
                <span className="text-muted-foreground text-xs">내 에이전트</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{stats.agents.total}</p>
              <p className="text-muted-foreground text-xs">
                고용 {stats.agents.totalHires}회 | ★ {stats.agents.avgRating}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span className="text-muted-foreground text-xs">총 수익</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{formatUsdc(stats.earnings.totalUsdc)}</p>
              <p className="text-muted-foreground text-xs">
                이번 달 +{formatUsdc(stats.earnings.thisMonth)} USDC
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                <span className="text-muted-foreground text-xs">기여</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{stats.contributions.total}</p>
              <p className="text-muted-foreground text-xs">
                채택 {stats.contributions.commentsAdopted} | 발행{' '}
                {stats.contributions.chaptersGenerated}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="stories">내 스토리</TabsTrigger>
          <TabsTrigger value="agents">내 에이전트</TabsTrigger>
          <TabsTrigger value="earnings">수익</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewSection userId={user.id} />
        </TabsContent>
        <TabsContent value="stories" className="mt-4">
          <MyStoriesSection userId={user.id} />
        </TabsContent>
        <TabsContent value="agents" className="mt-4">
          <MyAgentsSection userId={user.id} />
        </TabsContent>
        <TabsContent value="earnings" className="mt-4">
          <EarningsSection userId={user.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================
// Overview Section
// ============================================

function OverviewSection({ userId }: { userId: string }) {
  const { stories, isLoading: isStoriesLoading } = useMyStories(userId)
  const { transactions, isLoading: isEarningsLoading } = useEarnings(userId)

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Recent Stories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            최근 스토리
            <Link href="/stories/create">
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                + 새 스토리
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isStoriesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded" />
              ))}
            </div>
          ) : stories.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">아직 스토리가 없습니다</p>
          ) : (
            <div className="divide-y">
              {stories.slice(0, 5).map((story) => (
                <div key={story.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/stories/${story.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {story.title}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[story.status] ?? ''}`}
                      >
                        {STATUS_LABELS[story.status] ?? story.status}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-0.5 text-xs">
                        <Eye className="h-3 w-3" />
                        {story.view_count ?? 0}
                      </span>
                    </div>
                  </div>
                  <Link href={`/stories/${story.id}/room`}>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      <PenTool className="mr-1 h-3 w-3" />
                      작가방
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Earnings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">최근 수익</CardTitle>
        </CardHeader>
        <CardContent>
          {isEarningsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              아직 수익 내역이 없습니다
            </p>
          ) : (
            <div className="divide-y">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      +{formatUsdc(Number(tx.amount_usdc) - Number(tx.platform_fee))} USDC
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {tx.agent?.name ?? '에이전트'} &middot; {formatDate(tx.created_at)}
                    </p>
                  </div>
                  {tx.tx_hash && (
                    <a
                      href={`${BASE_EXPLORER_URL}${tx.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// My Stories Section
// ============================================

function MyStoriesSection({ userId }: { userId: string }) {
  const { stories, isLoading } = useMyStories(userId)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleStatusChange = async (storyId: string, newStatus: string) => {
    setUpdatingId(storyId)
    try {
      await fetch(`/api/stories/${storyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      window.location.reload()
    } finally {
      setUpdatingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    )
  }

  if (stories.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <BookOpen className="text-muted-foreground mb-3 h-10 w-10" />
          <p className="text-muted-foreground text-sm">아직 스토리가 없습니다</p>
          <Link href="/stories/create" className="mt-3">
            <Button size="sm">첫 스토리 만들기</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {stories.map((story) => (
        <Card key={story.id}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/stories/${story.id}`}
                  className="truncate text-sm font-semibold hover:underline"
                >
                  {story.title}
                </Link>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[story.status] ?? ''}`}
                >
                  {STATUS_LABELS[story.status] ?? story.status}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {story.genre?.map((g: string) => (
                  <Badge key={g} variant="secondary" className="text-[10px]">
                    {g}
                  </Badge>
                ))}
                <span className="text-muted-foreground flex items-center gap-0.5 text-xs">
                  <Eye className="h-3 w-3" /> {story.view_count ?? 0}
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatDate(story.created_at)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-1.5">
              {story.status === 'ongoing' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={updatingId === story.id}
                  onClick={() => handleStatusChange(story.id, 'hiatus')}
                >
                  휴재
                </Button>
              )}
              {story.status === 'hiatus' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={updatingId === story.id}
                  onClick={() => handleStatusChange(story.id, 'ongoing')}
                >
                  연재 재개
                </Button>
              )}
              {story.status !== 'completed' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-blue-600"
                  disabled={updatingId === story.id}
                  onClick={() => handleStatusChange(story.id, 'completed')}
                >
                  완결
                </Button>
              )}
              <Link href={`/stories/${story.id}/room`}>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <PenTool className="mr-1 h-3 w-3" />
                  작가방
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ============================================
// My Agents Section
// ============================================

function MyAgentsSection({ userId }: { userId: string }) {
  const { agents, isLoading, mutate } = useMyAgents(userId)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const handleToggleActive = async (agentId: string, currentActive: boolean) => {
    setTogglingId(agentId)
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      })
      if (res.ok) {
        mutate()
      }
    } finally {
      setTogglingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    )
  }

  if (agents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <Bot className="text-muted-foreground mb-3 h-10 w-10" />
          <p className="text-muted-foreground text-sm">아직 만든 에이전트가 없습니다</p>
          <Link href="/agents/create" className="mt-3">
            <Button size="sm">에이전트 만들기</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {agents.map((agent) => {
        const trustTier = agent.trust_score?.trust_tier ?? 'none'
        return (
          <Card key={agent.id} className={!agent.is_active ? 'opacity-60' : ''}>
            <CardContent className="flex items-center gap-4 p-4">
              {/* Agent Avatar */}
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${ROLE_COLORS[agent.role as AgentRole] ?? 'bg-gray-400'}`}
              >
                {agent.name.charAt(0)}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/agents/${agent.id}`}
                    className="truncate text-sm font-semibold hover:underline"
                  >
                    {agent.name}
                  </Link>
                  <Badge variant="secondary" className="text-[10px]">
                    {ROLE_LABELS[agent.role as AgentRole] ?? agent.role}
                  </Badge>
                  {trustTier !== 'none' && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${TRUST_TIER_COLORS[trustTier] ?? ''}`}
                    >
                      {TRUST_TIER_LABELS[trustTier]}
                    </span>
                  )}
                  {!agent.is_active && (
                    <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                      비활성
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground flex items-center gap-0.5">
                    <Star className="h-3 w-3 text-amber-400" /> {agent.avg_rating}
                  </span>
                  <span className="text-muted-foreground flex items-center gap-0.5">
                    <TrendingUp className="h-3 w-3" /> {agent.hire_count}회 고용
                  </span>
                  <span className="text-muted-foreground">
                    {agent.price_usdc > 0 ? `${formatUsdc(agent.price_usdc)} USDC` : '무료'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={togglingId === agent.id}
                  onClick={() => handleToggleActive(agent.id, agent.is_active)}
                  title={agent.is_active ? '비활성화' : '활성화'}
                >
                  {agent.is_active ? (
                    <ToggleRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ToggleLeft className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
                <Link href={`/agents/${agent.id}`}>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    상세
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ============================================
// Earnings Section
// ============================================

function EarningsSection({ userId }: { userId: string }) {
  const { stats } = useDashboardStats(userId)
  const { transactions, isLoading } = useEarnings(userId)

  return (
    <div className="space-y-6">
      {/* Earnings Summary */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-muted-foreground text-xs">총 수익</p>
              <p className="mt-1 text-xl font-bold text-emerald-600">
                {formatUsdc(stats.earnings.totalUsdc)} USDC
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-muted-foreground text-xs">이번 달</p>
              <p className="mt-1 text-xl font-bold">{formatUsdc(stats.earnings.thisMonth)} USDC</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-muted-foreground text-xs">총 거래</p>
              <p className="mt-1 text-xl font-bold">{stats.earnings.transactionCount}건</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">거래 내역</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              아직 거래 내역이 없습니다
            </p>
          ) : (
            <div className="divide-y">
              {transactions.map((tx) => {
                const net = Number(tx.amount_usdc) - Number(tx.platform_fee)
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">+{formatUsdc(net)} USDC</p>
                        <span className="text-muted-foreground text-xs">
                          (수수료 {formatUsdc(Number(tx.platform_fee))})
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">
                          {tx.agent?.name ?? '에이전트'} (
                          {ROLE_LABELS[(tx.agent?.role as AgentRole) ?? ''] ?? tx.agent?.role})
                        </span>
                        <span className="text-muted-foreground">
                          {tx.payer?.display_name ?? '유저'}
                        </span>
                        <span className="text-muted-foreground">{formatDate(tx.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          tx.status === 'confirmed'
                            ? 'bg-green-100 text-green-700'
                            : tx.status === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {tx.status === 'confirmed'
                          ? '완료'
                          : tx.status === 'failed'
                            ? '실패'
                            : '대기'}
                      </span>
                      {tx.tx_hash && (
                        <a
                          href={`${BASE_EXPLORER_URL}${tx.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                          title="Explorer에서 보기"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
