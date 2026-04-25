import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { autoGenerateNextChapter } from '@/features/room/lib/orchestrator'

export const maxDuration = 300

// GET /api/cron/auto-chapter — Vercel Cron (hourly)
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const results: Array<{ storyId: string; chapterNumber?: number; error?: string }> = []

  try {
    // 1. 모든 스토리의 최신 published 챕터 조회
    //    published_at + 48h < now() 인 것만
    const cutoff = new Date(Date.now() - 48 * 3600_000).toISOString()

    const { data: candidates, error: queryError } = await supabase
      .from('chapters')
      .select(
        `
        id,
        story_id,
        chapter_number,
        published_at,
        stories!inner(id, creator_id, status)
      `,
      )
      .eq('status', 'published')
      .lt('published_at', cutoff)
      .order('chapter_number', { ascending: false })

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ message: 'No chapters ready for auto-generation', results: [] })
    }

    // 2. 스토리별 최신 챕터만 남기기
    const latestByStory = new Map<string, (typeof candidates)[0]>()
    for (const ch of candidates) {
      const existing = latestByStory.get(ch.story_id)
      if (!existing || ch.chapter_number > existing.chapter_number) {
        latestByStory.set(ch.story_id, ch)
      }
    }

    // 3. 해당 챕터 이후 discussion이 없는 것만 (중복 방지)
    for (const [storyId, chapter] of latestByStory) {
      try {
        const { data: existingDiscussion } = await supabase
          .from('discussions')
          .select('id')
          .eq('story_id', storyId)
          .gt('created_at', chapter.published_at!)
          .limit(1)
          .single()

        if (existingDiscussion) {
          // 이미 토론이 시작됨 — 스킵
          continue
        }

        const story = chapter.stories as unknown as {
          id: string
          creator_id: string
          status: string
        }

        // 비활성 스토리 스킵
        if (story.status !== 'ongoing' && story.status !== 'published') {
          continue
        }

        const result = await autoGenerateNextChapter(
          supabase,
          storyId,
          chapter.id,
          story.creator_id,
        )

        results.push({ storyId, chapterNumber: result.chapterNumber })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[auto-chapter] Failed for story ${storyId}:`, message)
        results.push({ storyId, error: message })
      }
    }

    return NextResponse.json({
      message: `Processed ${results.length} stories`,
      results,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('[auto-chapter] Cron error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
