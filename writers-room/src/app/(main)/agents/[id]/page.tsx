'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Star, Users, Zap } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/use-auth'
import { useAgent, useReviewAgent } from '@/features/agent/hooks/use-agents'
import { ROLE_LABELS, ROLE_COLORS } from '@/features/agent/lib/schemas'

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const { agent, isLoading, mutate } = useAgent(id)
  const { submitReview, isSubmitting: isReviewing } = useReviewAgent()

  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState('')

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

          <div className="mt-4 flex items-center gap-2 border-t pt-4">
            <Zap className="text-muted-foreground h-4 w-4" />
            <span className="text-muted-foreground text-sm">모델: {agent.flock_model}</span>
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
    </div>
  )
}
