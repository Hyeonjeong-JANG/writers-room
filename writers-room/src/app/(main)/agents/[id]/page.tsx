'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Star, Users, Zap, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/use-auth'
import { useAgent, useHireAgent, useReviewAgent } from '@/features/agent/hooks/use-agents'
import { ROLE_LABELS, ROLE_COLORS } from '@/features/agent/lib/schemas'
import { PaymentModal } from '@/features/payment/components/payment-modal'
import { TrustBadge } from '@/features/onchain/components/trust-badge'
import { TrustScoreDetail } from '@/features/onchain/components/trust-score-detail'
import { useTrustScore } from '@/features/onchain/hooks/use-trust-score'
import type { TrustTier } from '@/features/onchain/lib/schemas'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const { agent, isLoading, mutate } = useAgent(id)
  const { submitReview, isSubmitting: isReviewing } = useReviewAgent()
  const { hireAgent, isHiring } = useHireAgent()

  const { trustScore, isLoading: isTrustLoading, mutate: mutateTrust } = useTrustScore(id)
  const [isRecalculating, setIsRecalculating] = useState(false)

  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState('')

  // 고용 플로우 상태
  const [showStorySelect, setShowStorySelect] = useState(false)
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // 유저의 스토리 목록 (고용 시 선택)
  const { data: myStoriesData } = useSWR<{
    data: { id: string; title: string }[]
  }>(user && showStorySelect ? '/api/stories?mine=true&limit=50' : null, fetcher)
  const myStories = myStoriesData?.data ?? []

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground text-lg">에이전트를 찾을 수 없습니다</p>
        <Link href="/agents" className="mt-4">
          <Button variant="outline">마켓플레이스로</Button>
        </Link>
      </div>
    )
  }

  const handleHireClick = () => {
    if (!user) {
      toast.error('로그인이 필요합니다')
      return
    }
    setShowStorySelect(true)
  }

  const handleStorySelect = async (storyId: string) => {
    setSelectedStoryId(storyId)

    if (agent.price_usdc > 0) {
      // 유료 에이전트 → 결제 모달
      setShowStorySelect(false)
      setShowPaymentModal(true)
    } else {
      // 무료 에이전트 → 바로 고용
      const result = await hireAgent(id, storyId)
      if (result) {
        toast.success(`${agent.name}이(가) 스토리에 배치되었습니다`)
        setShowStorySelect(false)
        mutate()
      }
    }
  }

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false)
    setSelectedStoryId(null)
    mutate()
  }

  const handleRecalculate = async () => {
    setIsRecalculating(true)
    try {
      await fetch(`/api/nansen/recalculate/${id}`, { method: 'POST' })
      mutateTrust()
    } finally {
      setIsRecalculating(false)
    }
  }

  const handleReview = async () => {
    const result = await submitReview(id, rating, reviewText || undefined)
    if (result) {
      setReviewText('')
      mutate()
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back */}
      <Link
        href="/agents"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        마켓플레이스
      </Link>

      {/* Profile */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className={`${ROLE_COLORS[agent.role]} text-2xl text-white`}>
                {agent.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{agent.name}</h1>
                {agent.is_default && (
                  <Badge variant="secondary" className="text-xs">
                    기본
                  </Badge>
                )}
                {trustScore && trustScore.trust_tier !== 'none' && (
                  <TrustBadge
                    tier={trustScore.trust_tier as TrustTier}
                    score={trustScore.overall_score}
                    size="md"
                  />
                )}
              </div>
              <div className="mt-1 flex items-center gap-3">
                <Badge>{ROLE_LABELS[agent.role]}</Badge>
                <span className="flex items-center gap-0.5 text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  {agent.avg_rating.toFixed(1)}
                  <span className="text-muted-foreground ml-1 text-sm">
                    ({agent.reviews?.length ?? 0} 리뷰)
                  </span>
                </span>
                <span className="text-muted-foreground flex items-center gap-1 text-sm">
                  <Users className="h-4 w-4" />
                  {agent.hire_count}회 고용
                </span>
              </div>
              {agent.description && (
                <p className="text-muted-foreground mt-3">{agent.description}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {agent.genre_tags.map((g) => (
                  <Badge key={g} variant="outline">
                    {g}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">
                {agent.price_usdc > 0 ? `$${agent.price_usdc}` : '무료'}
              </p>
              {agent.price_usdc > 0 && <p className="text-muted-foreground text-xs">USDC / 고용</p>}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-2">
              <Zap className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground text-sm">모델: {agent.flock_model}</span>
            </div>
            {user && (
              <Button onClick={handleHireClick} disabled={isHiring}>
                {isHiring ? '처리 중...' : '고용하기'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reviews */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">리뷰</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Write review */}
          {user && (
            <div className="space-y-3 border-b pb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">별점:</span>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setRating(s)} className="focus:outline-none">
                    <Star
                      className={`h-5 w-5 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                    />
                  </button>
                ))}
              </div>
              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="리뷰를 작성하세요 (선택)"
                className="min-h-[60px] resize-none"
                maxLength={1000}
              />
              <Button size="sm" onClick={handleReview} disabled={isReviewing}>
                {isReviewing ? '작성 중...' : '리뷰 작성'}
              </Button>
            </div>
          )}

          {/* Review list */}
          {agent.reviews?.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">아직 리뷰가 없습니다</p>
          ) : (
            <div className="divide-y">
              {agent.reviews?.map((review) => (
                <div key={review.id} className="flex gap-3 py-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {review.reviewer?.display_name?.charAt(0) ?? '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {review.reviewer?.display_name ?? '익명'}
                      </span>
                      <span className="flex items-center text-amber-400">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-current" />
                        ))}
                      </span>
                    </div>
                    {review.review_text && <p className="mt-1 text-sm">{review.review_text}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trust Score Detail */}
      <TrustScoreDetail
        trustScore={trustScore}
        isLoading={isTrustLoading}
        onRecalculate={user ? handleRecalculate : undefined}
        isRecalculating={isRecalculating}
      />

      {/* 스토리 선택 다이얼로그 */}
      <Dialog open={showStorySelect} onOpenChange={setShowStorySelect}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>스토리 선택</DialogTitle>
            <DialogDescription>{agent.name}을(를) 배치할 스토리를 선택하세요</DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] space-y-2 overflow-y-auto">
            {myStories.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                작성한 스토리가 없습니다.{' '}
                <Link href="/stories/create" className="text-indigo-600 hover:underline">
                  스토리 만들기
                </Link>
              </p>
            ) : (
              myStories.map((story) => (
                <button
                  key={story.id}
                  onClick={() => handleStorySelect(story.id)}
                  className="hover:bg-accent flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors"
                >
                  <BookOpen className="h-5 w-5 shrink-0 text-indigo-500" />
                  <span className="text-sm font-medium">{story.title}</span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 결제 모달 */}
      {selectedStoryId && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedStoryId(null)
          }}
          onSuccess={handlePaymentSuccess}
          agentId={id}
          agentName={agent.name}
          storyId={selectedStoryId}
          amount={agent.price_usdc}
        />
      )}
    </div>
  )
}
