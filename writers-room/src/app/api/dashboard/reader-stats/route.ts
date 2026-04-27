import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/dashboard/reader-stats - 독자 활동 통계
export async function GET() {
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

    // 병렬 쿼리: 전체 댓글, 채택된 댓글, 스토리별 통계
    const [allCommentsRes, adoptedCommentsRes, storyBreakdownRes] = await Promise.all([
      // 전체 내 댓글 수
      supabase.from('comments').select('id', { count: 'exact', head: true }).eq('user_id', user.id),

      // 채택된 댓글
      supabase
        .from('comments')
        .select('id, chapter_id, content, comment_type, adopted_in_chapter, created_at')
        .eq('user_id', user.id)
        .eq('is_adopted', true)
        .order('created_at', { ascending: false }),

      // 스토리별 댓글 분포 (댓글 → 챕터 → 스토리)
      supabase
        .from('comments')
        .select('id, is_adopted, chapter:chapters!inner(story_id, stories:stories!inner(title))')
        .eq('user_id', user.id),
    ])

    const totalComments = allCommentsRes.count ?? 0
    const adoptedComments = adoptedCommentsRes.data ?? []
    const adoptedCount = adoptedComments.length
    const adoptionRate = totalComments > 0 ? Math.round((adoptedCount / totalComments) * 100) : 0

    // 스토리별 기여 집계
    const storyMap = new Map<string, { title: string; total: number; adopted: number }>()
    for (const c of storyBreakdownRes.data ?? []) {
      const chapter = c.chapter as unknown as { story_id: string; stories: { title: string } }
      if (!chapter) continue
      const key = chapter.story_id
      const existing = storyMap.get(key) ?? { title: chapter.stories.title, total: 0, adopted: 0 }
      existing.total += 1
      if (c.is_adopted) existing.adopted += 1
      storyMap.set(key, existing)
    }

    const byStory = Array.from(storyMap.entries())
      .map(([storyId, data]) => ({
        storyId,
        title: data.title,
        totalComments: data.total,
        adoptedComments: data.adopted,
        adoptionRate: data.total > 0 ? Math.round((data.adopted / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.adoptedComments - a.adoptedComments)

    // 최근 채택 댓글 (최대 10개)
    const recentAdopted = adoptedComments.slice(0, 10).map((c) => ({
      id: c.id,
      content: c.content.length > 80 ? c.content.slice(0, 80) + '...' : c.content,
      commentType: c.comment_type,
      adoptedInChapter: c.adopted_in_chapter,
      createdAt: c.created_at,
    }))

    return NextResponse.json({
      data: {
        totalComments,
        adoptedCount,
        adoptionRate,
        byStory,
        recentAdopted,
      },
    })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
