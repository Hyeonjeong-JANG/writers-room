import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchTrendKeywords, type SelanetTrendResponse } from '@/lib/selanet/client'

const CACHE_TTL_MS = 60 * 60 * 1000 // 1시간

export async function GET(request: NextRequest) {
  const genre = request.nextUrl.searchParams.get('genre')
  if (!genre) {
    return NextResponse.json({ error: 'genre 파라미터가 필요합니다' }, { status: 400 })
  }

  const supabase = await createClient()

  // 1. 캐시 확인
  const { data: cached } = await supabase
    .from('selanet_trend_cache')
    .select('*')
    .eq('genre', genre)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single()

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime()
    if (age < CACHE_TTL_MS) {
      return NextResponse.json({
        data: {
          keywords: cached.trend_data?.keywords ?? [],
          popularPatterns: cached.trend_data?.popularPatterns ?? [],
          sourcePlatforms: cached.source_platforms ?? [],
          fetchedAt: cached.fetched_at,
          cached: true,
        },
      })
    }
  }

  // 2. Selanet API 호출
  const trends: SelanetTrendResponse = await fetchTrendKeywords(genre)

  // 3. 캐시 저장 (키워드가 있을 때만)
  if (trends.keywords.length > 0) {
    await supabase.from('selanet_trend_cache').upsert(
      {
        genre,
        trend_data: { keywords: trends.keywords, popularPatterns: trends.popularPatterns },
        source_platforms: trends.sourcePlatforms,
        fetched_at: trends.fetchedAt,
      },
      { onConflict: 'genre' },
    )
  }

  return NextResponse.json({
    data: { ...trends, cached: false },
  })
}
