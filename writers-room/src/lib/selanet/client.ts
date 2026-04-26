import { createAIClient, getDefaultModel } from '@/lib/ai/client'

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

/**
 * AI 기반 장르별 트렌드 키워드 생성.
 * 기존 Selanet API를 대체하여 GPT-4o-mini로 트렌드를 생성합니다.
 * 실패 시 빈 결과를 반환합니다 (graceful degradation).
 */
export async function fetchTrendKeywords(genre: string): Promise<SelanetTrendResponse> {
  try {
    const client = createAIClient()

    const response = await client.chat.completions.create({
      model: getDefaultModel(),
      messages: [
        {
          role: 'system',
          content: `당신은 웹소설 트렌드 분석가입니다. 반드시 JSON으로만 응답하세요. 다른 텍스트는 포함하지 마세요.

응답 형식:
{
  "keywords": [
    { "keyword": "키워드", "score": 0.85, "source": "ai-analysis" }
  ],
  "popularPatterns": ["패턴1", "패턴2", "패턴3"]
}`,
        },
        {
          role: 'user',
          content: `"${genre}" 장르의 최신 인기 키워드 5-8개와 인기 패턴 3개를 분석해주세요.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 512,
    })

    const content = response.choices[0]?.message?.content ?? '{}'
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return emptyResponse()
    }

    const parsed = JSON.parse(jsonMatch[0])

    return {
      keywords: (parsed.keywords ?? []).map((k: { keyword: string; score: number }) => ({
        keyword: k.keyword,
        score: k.score ?? 0.5,
        source: 'ai-analysis',
      })),
      popularPatterns: parsed.popularPatterns ?? [],
      sourcePlatforms: ['ai-analysis'],
      fetchedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[trend-client] AI trend generation failed:', error)
    return emptyResponse()
  }
}

function emptyResponse(): SelanetTrendResponse {
  return {
    keywords: [],
    popularPatterns: [],
    sourcePlatforms: [],
    fetchedAt: new Date().toISOString(),
  }
}
