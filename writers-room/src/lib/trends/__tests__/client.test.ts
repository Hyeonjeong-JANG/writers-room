import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchTrendKeywords } from '../client'

// AI client 모킹
const mockCreate = vi.fn()
vi.mock('@/lib/ai/client', () => ({
  createAIClient: () => ({
    chat: { completions: { create: mockCreate } },
  }),
  getDefaultModel: () => 'gpt-4o-mini',
}))

describe('fetchTrendKeywords', () => {
  beforeEach(() => {
    mockCreate.mockReset()
  })

  it('유효한 JSON 응답을 파싱한다', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              keywords: [
                { keyword: '회귀', score: 0.9 },
                { keyword: '헌터', score: 0.8 },
              ],
              popularPatterns: ['시스템물', '레벨업'],
            }),
          },
        },
      ],
    })

    const result = await fetchTrendKeywords('판타지')

    expect(result.keywords).toHaveLength(2)
    expect(result.keywords[0]).toEqual({ keyword: '회귀', score: 0.9, source: 'ai-analysis' })
    expect(result.popularPatterns).toEqual(['시스템물', '레벨업'])
    expect(result.sourcePlatforms).toEqual(['ai-analysis'])
    expect(result.fetchedAt).toBeDefined()
  })

  it('score가 없으면 기본값 0.5를 사용한다', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              keywords: [{ keyword: '이세계' }],
              popularPatterns: [],
            }),
          },
        },
      ],
    })

    const result = await fetchTrendKeywords('판타지')
    expect(result.keywords[0].score).toBe(0.5)
  })

  it('JSON 앞뒤에 텍스트가 있어도 파싱한다', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content:
              '다음은 분석 결과입니다:\n{"keywords":[{"keyword":"로맨스","score":0.7}],"popularPatterns":["궁중물"]}\n감사합니다.',
          },
        },
      ],
    })

    const result = await fetchTrendKeywords('로맨스')
    expect(result.keywords).toHaveLength(1)
    expect(result.keywords[0].keyword).toBe('로맨스')
  })

  it('JSON이 없는 응답이면 빈 결과를 반환한다', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '분석할 수 없습니다.' } }],
    })

    const result = await fetchTrendKeywords('SF')
    expect(result.keywords).toEqual([])
    expect(result.popularPatterns).toEqual([])
  })

  it('빈 choices면 빈 결과를 반환한다', async () => {
    mockCreate.mockResolvedValue({ choices: [] })

    const result = await fetchTrendKeywords('SF')
    expect(result.keywords).toEqual([])
  })

  it('API 에러 시 빈 결과를 반환한다 (graceful degradation)', async () => {
    mockCreate.mockRejectedValue(new Error('API error'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await fetchTrendKeywords('공포')

    expect(result.keywords).toEqual([])
    expect(result.popularPatterns).toEqual([])
    expect(result.sourcePlatforms).toEqual([])
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('keywords 필드가 없으면 빈 배열을 반환한다', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ popularPatterns: ['패턴1'] }),
          },
        },
      ],
    })

    const result = await fetchTrendKeywords('판타지')
    expect(result.keywords).toEqual([])
    expect(result.popularPatterns).toEqual(['패턴1'])
  })
})
