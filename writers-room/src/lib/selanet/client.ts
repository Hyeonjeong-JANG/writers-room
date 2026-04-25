const SELANET_BASE_URL = process.env.SELANET_API_BASE_URL || 'https://api.selanet.io'
const SELANET_API_KEY = process.env.SELANET_API_KEY

export interface TrendKeyword {
  keyword: string
  score: number
  source: string
}

export interface SelanetTrendResponse {
  keywords: TrendKeyword[]
  popularPatterns: string[]
  sourcePlatforms: string[]
  fetchedAt: string
}

export function isSelanetConfigured(): boolean {
  return !!SELANET_API_KEY && !!process.env.SELANET_API_BASE_URL
}

/**
 * Selanet API에서 장르별 트렌드 키워드를 가져옵니다.
 * API가 설정되지 않으면 빈 결과를 반환합니다.
 */
export async function fetchTrendKeywords(genre: string): Promise<SelanetTrendResponse> {
  if (!isSelanetConfigured()) {
    return {
      keywords: [],
      popularPatterns: [],
      sourcePlatforms: [],
      fetchedAt: new Date().toISOString(),
    }
  }

  const res = await fetch(`${SELANET_BASE_URL}/v1/trends?genre=${encodeURIComponent(genre)}`, {
    headers: {
      Authorization: `Bearer ${SELANET_API_KEY}`,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 3600 }, // 1시간 캐시
  })

  if (!res.ok) {
    console.error(`[Selanet] Failed to fetch trends: ${res.status}`)
    return {
      keywords: [],
      popularPatterns: [],
      sourcePlatforms: [],
      fetchedAt: new Date().toISOString(),
    }
  }

  return res.json()
}
