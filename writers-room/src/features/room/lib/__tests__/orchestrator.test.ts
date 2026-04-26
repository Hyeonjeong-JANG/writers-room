import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildContext, runDiscussion, generateChapter } from '../orchestrator'

// AI client 모킹
const mockChatCreate = vi.fn()
vi.mock('@/lib/ai/client', () => ({
  createAIClient: () => ({
    chat: { completions: { create: mockChatCreate } },
  }),
  getDefaultModel: () => 'gpt-4o-mini',
  withRetry: <T>(fn: () => Promise<T>) => fn(),
}))

// 트렌드 모킹
vi.mock('@/lib/trends/client', () => ({
  fetchTrendKeywords: vi.fn().mockResolvedValue({
    keywords: [{ keyword: '회귀', score: 0.9 }],
    popularPatterns: ['시스템물'],
    sourcePlatforms: ['ai-analysis'],
    fetchedAt: new Date().toISOString(),
  }),
}))

// ============================================
// Supabase mock 헬퍼
// ============================================

type MockData = Record<string, unknown>

/**
 * Supabase 체이닝 목을 생성한다.
 * 핵심: self 참조를 통한 체이닝 (재귀 호출 없이)
 */
function createMockSupabase(overrides: MockData = {}) {
  const data: MockData = {
    stories: {
      title: '테스트 스토리',
      synopsis: '테스트 시놉시스',
      genre: ['판타지'],
      world_setting: null,
      characters: [{ name: '주인공', role: '히어로' }],
    },
    chapters: [{ chapter_number: 1, title: '시작', content: '첫 번째 챕터 내용입니다.' }],
    comments: [{ content: '좋은 전개네요', comment_type: 'plot' }],
    story_agents: [
      { agent_id: 'pd-1', agent: makeAgent('pd-1', 'PD봇', 'pd') },
      { agent_id: 'w-1', agent: makeAgent('w-1', '작가봇', 'writer') },
      { agent_id: 'e-1', agent: makeAgent('e-1', '편집봇', 'editor') },
    ],
    discussions: { id: 'disc-1' },
    last_chapter: { chapter_number: 1 },
    ...overrides,
  }

  const mockFrom = vi.fn((table: string) => {
    // 각 테이블별로 .single() 결과와 목록 결과를 결정
    const getSingleResult = () => {
      if (table === 'stories') return { data: data.stories, error: null }
      if (table === 'discussions') return { data: data.discussions, error: null }
      if (table === 'chapters') return { data: data.last_chapter, error: null }
      return { data: null, error: null }
    }

    const getListResult = () => {
      if (table === 'chapters') return { data: data.chapters, error: null }
      if (table === 'comments') return { data: data.comments, error: null }
      if (table === 'story_agents') return { data: data.story_agents, error: null }
      return { data: null, error: null }
    }

    // 모든 chain 메서드는 self를 반환 (재귀 없음)
    const self: Record<string, unknown> = {}
    const returnSelf = () => self

    self.select = vi.fn(returnSelf)
    self.insert = vi.fn(returnSelf)
    self.update = vi.fn(returnSelf)
    self.eq = vi.fn(returnSelf)
    self.in = vi.fn(returnSelf)
    self.order = vi.fn(returnSelf)
    self.limit = vi.fn(returnSelf)
    self.single = vi.fn(getSingleResult)

    // await 지원: thenable
    self.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
      try {
        resolve(getListResult())
      } catch (e) {
        if (reject) reject(e)
      }
    }

    return self
  })

  return { from: mockFrom }
}

function makeAgent(id: string, name: string, role: 'pd' | 'writer' | 'editor') {
  return {
    id,
    name,
    role,
    model: '',
    system_prompt: `${name}의 시스템 프롬프트`,
    genre_tags: ['판타지'],
    creator_id: 'user-1',
    few_shot_examples: null,
    avatar_url: null,
    description: null,
    price_usdc: 0,
    is_default: true,
    is_active: true,
    hire_count: 0,
    avg_rating: 0,
    created_at: '',
    updated_at: '',
  }
}

// ============================================
// buildContext 테스트
// ============================================

describe('buildContext', () => {
  beforeEach(() => {
    mockChatCreate.mockReset()
  })

  it('스토리 정보, 챕터, 댓글, 트렌드를 하나의 컨텍스트로 구성한다', async () => {
    const supabase = createMockSupabase()

    const ctx = await buildContext(supabase as never, 'story-1', ['comment-1'])

    expect(ctx.title).toBe('테스트 스토리')
    expect(ctx.genre).toEqual(['판타지'])
    expect(ctx.previousChapters).toHaveLength(1)
    expect(ctx.adoptedComments).toHaveLength(1)
    expect(ctx.trendKeywords).toContain('회귀')
  })

  it('스토리를 찾을 수 없으면 에러를 던진다', async () => {
    const supabase = createMockSupabase({ stories: null })

    await expect(buildContext(supabase as never, 'bad-id', [])).rejects.toThrow(
      '스토리를 찾을 수 없습니다',
    )
  })

  it('adoptedCommentIds가 빈 배열이면 댓글 쿼리를 건너뛴다', async () => {
    const supabase = createMockSupabase()

    const ctx = await buildContext(supabase as never, 'story-1', [])

    expect(ctx.adoptedComments).toEqual([])
  })

  it('긴 챕터 내용은 500자 + "..."로 잘린다', async () => {
    const longContent = 'A'.repeat(600)
    const supabase = createMockSupabase({
      chapters: [{ chapter_number: 1, title: '시작', content: longContent }],
    })

    const ctx = await buildContext(supabase as never, 'story-1', [])

    expect(ctx.previousChapters[0].summary.length).toBe(503) // 500 + '...'
    expect(ctx.previousChapters[0].summary.endsWith('...')).toBe(true)
  })
})

// ============================================
// runDiscussion 테스트
// ============================================

describe('runDiscussion', () => {
  beforeEach(() => {
    mockChatCreate.mockReset()
    mockChatCreate.mockResolvedValue({
      choices: [{ message: { content: '에이전트 응답입니다.' } }],
    })
  })

  it('2라운드 토론을 실행하고 결과를 반환한다', async () => {
    const supabase = createMockSupabase()

    const result = await runDiscussion(supabase as never, 'story-1', 'user-1', [])

    expect(result.discussionId).toBe('disc-1')
    expect(result.totalRounds).toBe(2)
    // PD + 작가 + 편집자 = 3명 × 2라운드 = 6 + 1(요약) = 7 AI 호출
    expect(mockChatCreate).toHaveBeenCalledTimes(7)
    expect(result.log).toHaveLength(6)
    expect(result.summary).toBe('에이전트 응답입니다.')
  })

  it('에이전트가 없으면 에러를 던진다', async () => {
    const supabase = createMockSupabase({ story_agents: [] })

    await expect(runDiscussion(supabase as never, 'story-1', 'user-1', [])).rejects.toThrow(
      '에이전트가 없습니다',
    )
  })

  it('PD/작가/편집자 중 하나가 없으면 에러를 던진다', async () => {
    const supabase = createMockSupabase({
      story_agents: [
        { agent_id: 'pd-1', agent: makeAgent('pd-1', 'PD봇', 'pd') },
        { agent_id: 'w-1', agent: makeAgent('w-1', '작가봇', 'writer') },
        // editor 없음
      ],
    })

    await expect(runDiscussion(supabase as never, 'story-1', 'user-1', [])).rejects.toThrow(
      'PD, 작가, 편집자 역할의 에이전트가 모두 필요합니다',
    )
  })

  it('AI 호출 실패 시 토론 상태를 failed로 업데이트한다', async () => {
    mockChatCreate.mockRejectedValue(new Error('AI 서버 에러'))
    const supabase = createMockSupabase()

    await expect(runDiscussion(supabase as never, 'story-1', 'user-1', [])).rejects.toThrow(
      'AI 서버 에러',
    )

    // failed 상태로 업데이트 호출 확인
    const updateCalls = supabase.from.mock.calls.filter(([t]: string[]) => t === 'discussions')
    expect(updateCalls.length).toBeGreaterThan(0)
  })

  it('토론 로그는 라운드별로 PD→작가→편집자 순서이다', async () => {
    const supabase = createMockSupabase()

    const result = await runDiscussion(supabase as never, 'story-1', 'user-1', [])

    // 라운드 1
    expect(result.log[0].agent_role).toBe('pd')
    expect(result.log[0].round).toBe(1)
    expect(result.log[1].agent_role).toBe('writer')
    expect(result.log[1].round).toBe(1)
    expect(result.log[2].agent_role).toBe('editor')
    expect(result.log[2].round).toBe(1)
    // 라운드 2
    expect(result.log[3].agent_role).toBe('pd')
    expect(result.log[3].round).toBe(2)
  })
})

// ============================================
// generateChapter 테스트
// ============================================

describe('generateChapter', () => {
  beforeEach(() => {
    mockChatCreate.mockReset()
    mockChatCreate.mockResolvedValue({
      choices: [{ message: { content: '생성된 챕터 본문입니다. 이야기가 시작됩니다.' } }],
    })
  })

  it('완료된 토론으로 챕터를 생성한다', async () => {
    const supabase = createMockSupabase({
      discussions: {
        id: 'disc-1',
        story_id: 'story-1',
        status: 'completed',
        summary: '토론 요약 내용',
      },
    })

    const result = await generateChapter(supabase as never, 'disc-1')

    expect(result.title).toBe('2화') // last_chapter_number(1) + 1
    expect(result.content).toBe('생성된 챕터 본문입니다. 이야기가 시작됩니다.')
    expect(result.wordCount).toBe(result.content.length)
  })

  it('토론을 찾을 수 없으면 에러를 던진다', async () => {
    const supabase = createMockSupabase({ discussions: null })

    await expect(generateChapter(supabase as never, 'bad-id')).rejects.toThrow(
      '토론을 찾을 수 없습니다',
    )
  })

  it('미완료 토론이면 에러를 던진다', async () => {
    const supabase = createMockSupabase({
      discussions: {
        id: 'disc-1',
        story_id: 'story-1',
        status: 'in_progress',
        summary: null,
      },
    })

    await expect(generateChapter(supabase as never, 'disc-1')).rejects.toThrow(
      '완료된 토론만 챕터를 생성할 수 있습니다',
    )
  })

  it('토론 요약이 없으면 에러를 던진다', async () => {
    const supabase = createMockSupabase({
      discussions: {
        id: 'disc-1',
        story_id: 'story-1',
        status: 'completed',
        summary: null,
      },
    })

    await expect(generateChapter(supabase as never, 'disc-1')).rejects.toThrow(
      '토론 요약이 없습니다',
    )
  })

  it('작가 에이전트가 없으면 에러를 던진다', async () => {
    const supabase = createMockSupabase({
      discussions: {
        id: 'disc-1',
        story_id: 'story-1',
        status: 'completed',
        summary: '요약',
      },
      story_agents: [
        { agent_id: 'pd-1', agent: makeAgent('pd-1', 'PD봇', 'pd') },
        // writer 없음
      ],
    })

    await expect(generateChapter(supabase as never, 'disc-1')).rejects.toThrow(
      '작가 에이전트를 찾을 수 없습니다',
    )
  })

  it('이전 챕터가 없으면 1화를 생성한다', async () => {
    const supabase = createMockSupabase({
      discussions: {
        id: 'disc-1',
        story_id: 'story-1',
        status: 'completed',
        summary: '요약',
      },
      last_chapter: null,
    })

    const result = await generateChapter(supabase as never, 'disc-1')

    expect(result.title).toBe('1화')
  })
})
