import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AnalyzeCommentsSchema } from '@/features/comment/lib/schemas'
import { createFlockClient, getDefaultModel } from '@/lib/flock/client'
import { recordContribution } from '@/features/onchain/lib/contribution-service'

// POST /api/comments/analyze - AI 댓글 분석 (스토리 creator만)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
        { status: 401 },
      )
    }

    const body = await request.json()
    const parsed = AnalyzeCommentsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: '입력값을 확인하세요',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      )
    }

    const { storyId, chapterId } = parsed.data

    // 스토리 소유권 확인
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('id, creator_id, title, synopsis')
      .eq('id', storyId)
      .single()

    if (storyError || !story) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '스토리를 찾을 수 없습니다' } },
        { status: 404 },
      )
    }

    if (story.creator_id !== user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '스토리 작성자만 댓글을 분석할 수 있습니다' } },
        { status: 403 },
      )
    }

    // 해당 챕터의 모든 댓글 조회 (아직 채택되지 않은 것만)
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('id, content, comment_type, like_count')
      .eq('chapter_id', chapterId)
      .eq('is_adopted', false)
      .order('like_count', { ascending: false })

    if (commentsError) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: commentsError.message } },
        { status: 500 },
      )
    }

    if (!comments || comments.length === 0) {
      return NextResponse.json({
        data: { analyzedCount: 0, adoptedComments: [] },
      })
    }

    // FLock API로 댓글 분석
    const flock = createFlockClient()
    const commentsText = comments.map((c, i) => `[${i + 1}] ${c.content}`).join('\n')

    const response = await flock.chat.completions.create({
      model: getDefaultModel(),
      messages: [
        {
          role: 'system',
          content: `당신은 웹소설 편집 AI입니다. 독자 댓글 중에서 스토리 발전에 유용한 아이디어를 선별합니다.

## 스토리 정보
- 제목: ${story.title}
- 시놉시스: ${story.synopsis}

## 분석 기준
1. 스토리 세계관과의 일관성
2. 캐릭터 발전 기여도
3. 독창성과 흥미로움
4. 구현 가능성

## 응답 형식
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.
{
  "adopted": [
    {
      "index": 1,
      "relevanceScore": 0.85,
      "reason": "채택 이유 (한 줄)"
    }
  ]
}

선별 기준: relevanceScore가 0.6 이상인 댓글만 포함하세요. 최대 5개까지 선별합니다.`,
        },
        {
          role: 'user',
          content: `다음 독자 댓글들을 분석하고 스토리에 유용한 아이디어를 선별해주세요:\n\n${commentsText}`,
        },
      ],
      temperature: 0.3,
    })

    const aiContent = response.choices[0]?.message?.content ?? '{}'

    let adopted: Array<{ index: number; relevanceScore: number; reason: string }> = []
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        adopted = parsed.adopted ?? []
      }
    } catch {
      // JSON 파싱 실패 시 빈 배열
    }

    // 채택된 댓글 매핑
    const adoptedComments = adopted
      .filter((a) => a.index >= 1 && a.index <= comments.length)
      .map((a) => ({
        commentId: comments[a.index - 1].id,
        content: comments[a.index - 1].content,
        relevanceScore: a.relevanceScore,
        reason: a.reason,
      }))

    // 채택된 댓글 DB 업데이트
    if (adoptedComments.length > 0) {
      const adoptedIds = adoptedComments.map((c) => c.commentId)
      await supabase.from('comments').update({ is_adopted: true }).in('id', adoptedIds)

      // 채택된 댓글 작성자별 기여 기록
      const { data: adoptedCommentRows } = await supabase
        .from('comments')
        .select('id, user_id, chapter_id')
        .in('id', adoptedIds)

      if (adoptedCommentRows) {
        // 챕터 번호 조회
        const chapterIds = [...new Set(adoptedCommentRows.map((c) => c.chapter_id))]
        const { data: chapters } = await supabase
          .from('chapters')
          .select('id, chapter_number')
          .in('id', chapterIds)

        const chapterMap = new Map(chapters?.map((ch) => [ch.id, ch.chapter_number]) ?? [])

        for (const comment of adoptedCommentRows) {
          recordContribution({
            userId: comment.user_id,
            storyId: storyId,
            contributionType: 'comment_adopted',
            context: {
              comment_id: comment.id,
              chapter_id: comment.chapter_id,
              chapter_number: chapterMap.get(comment.chapter_id) ?? null,
            },
          })
        }
      }
    }

    return NextResponse.json({
      data: {
        analyzedCount: comments.length,
        adoptedComments,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 })
  }
}
