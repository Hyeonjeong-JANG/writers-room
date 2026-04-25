import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/stories/[id]/chapters/[number] - 챕터 상세 (본문 포함)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; number: string }> },
) {
  try {
    const { id: storyId, number: chapterNum } = await params
    const num = parseInt(chapterNum, 10)

    if (isNaN(num) || num < 1) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: '유효하지 않은 챕터 번호입니다' } },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('story_id', storyId)
      .eq('chapter_number', num)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '챕터를 찾을 수 없습니다' } },
        { status: 404 },
      )
    }

    // 전후 챕터 존재 여부 확인
    const { data: neighbors } = await supabase
      .from('chapters')
      .select('chapter_number')
      .eq('story_id', storyId)
      .eq('status', 'published')
      .in('chapter_number', [num - 1, num + 1])

    const hasPrev = neighbors?.some((n) => n.chapter_number === num - 1) ?? false
    const hasNext = neighbors?.some((n) => n.chapter_number === num + 1) ?? false

    return NextResponse.json({
      data: { ...data, hasPrev, hasNext },
    })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
