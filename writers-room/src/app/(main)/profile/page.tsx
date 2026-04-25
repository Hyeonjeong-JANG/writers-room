'use client'

import { useState } from 'react'
import { User, Award, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'
import { useContributions } from '@/features/onchain/hooks/use-contributions'
import { useWalletAnalysis } from '@/features/onchain/hooks/use-wallet-analysis'
import { ContributionList } from '@/features/onchain/components/contribution-list'
import { SmartMoneyBadge } from '@/features/onchain/components/smart-money-badge'
import { CONTRIBUTION_TYPE_LABELS, type ContributionType } from '@/features/onchain/lib/schemas'
import { useAccount } from 'wagmi'

export default function ProfilePage() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const { address } = useAccount()
  const [activeTab, setActiveTab] = useState('all')

  const typeFilter = activeTab === 'all' ? undefined : (activeTab as ContributionType)
  const {
    contributions,
    meta,
    isLoading: isContribLoading,
  } = useContributions(user?.id, { type: typeFilter, limit: 20 })
  const { walletData, isLoading: isWalletLoading } = useWalletAnalysis(address)

  if (isAuthLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <User className="text-muted-foreground mb-4 h-12 w-12" />
        <p className="text-muted-foreground text-lg">로그인이 필요합니다</p>
        <p className="text-muted-foreground mt-1 text-sm">지갑을 연결하여 프로필을 확인하세요</p>
      </div>
    )
  }

  // Contribution stats
  const totalContributions = meta.total
  const commentAdopted = contributions.filter(
    (c) => c.contribution_type === 'comment_adopted',
  ).length
  const chaptersGenerated = contributions.filter(
    (c) => c.contribution_type === 'chapter_generated',
  ).length
  const agentsCreated = contributions.filter((c) => c.contribution_type === 'agent_created').length

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">프��필</h1>

      {/* Wallet & Smart Money Status */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">지갑 주소</p>
              <p className="mt-0.5 font-mono text-sm">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '미연결'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isWalletLoading ? (
                <Skeleton className="h-6 w-24 rounded-full" />
              ) : (
                walletData?.is_smart_money && <SmartMoneyBadge labels={walletData.labels} />
              )}
            </div>
          </div>

          {/* Nansen Labels */}
          {walletData && walletData.labels.length > 0 && !walletData.is_smart_money && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {walletData.labels.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="mx-auto h-5 w-5 text-blue-500" />
            <p className="mt-1 text-2xl font-bold">{commentAdopted}</p>
            <p className="text-muted-foreground text-xs">댓글 채택</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="mx-auto h-5 w-5 text-purple-500" />
            <p className="mt-1 text-2xl font-bold">{chaptersGenerated}</p>
            <p className="text-muted-foreground text-xs">챕터 발행</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <User className="mx-auto h-5 w-5 text-teal-500" />
            <p className="mt-1 text-2xl font-bold">{agentsCreated}</p>
            <p className="text-muted-foreground text-xs">에이전트 생성</p>
          </CardContent>
        </Card>
      </div>

      {/* Contribution History with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            기여 히스토리
            <span className="text-muted-foreground text-sm font-normal">
              총 {totalContributions}건
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">전체</TabsTrigger>
              {(Object.entries(CONTRIBUTION_TYPE_LABELS) as [ContributionType, string][]).map(
                ([key, label]) => (
                  <TabsTrigger key={key} value={key}>
                    {label}
                  </TabsTrigger>
                ),
              )}
            </TabsList>
            <TabsContent value={activeTab}>
              {isContribLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : contributions.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  기여 기록이 없습니다
                </p>
              ) : (
                <div className="divide-y">
                  {contributions.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {CONTRIBUTION_TYPE_LABELS[c.contribution_type]}
                        </p>
                        <div className="flex items-center gap-2">
                          {c.story && (
                            <span className="text-muted-foreground truncate text-xs">
                              {c.story.title}
                            </span>
                          )}
                          <span className="text-muted-foreground text-xs">
                            {new Date(c.created_at).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      </div>
                      {c.onchain_confirmed && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                          On-chain
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
