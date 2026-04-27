import { createAIClient, getDefaultModel, withRetry } from '@/lib/ai/client'
import { fetchTrendKeywords } from '@/lib/trends/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AgentRow, DiscussionLogEntry, DiscussionResult, GeneratedChapter } from './schemas'
import type { ContributionType } from '@/features/onchain/lib/schemas'
import {
  type StoryContext,
  buildAgentSystemPrompt,
  buildPdPrompt,
  buildWriterPrompt,
  buildEditorPrompt,
  buildSummaryPrompt,
  buildChapterGenerationPrompt,
  buildFeedbackPdPrompt,
  buildFeedbackWriterPrompt,
  buildFeedbackEditorPrompt,
} from './prompts'

const MAX_ROUNDS = 3
const MAX_CHAPTER_SUMMARY_LENGTH = 500

// ============================================
// 진행 상황 콜백 타입
// ============================================

export type OnProgress = (event: {
  type:
    | 'started'
    | 'agent_speaking'
    | 'agent_message'
    | 'summary_generating'
    | 'completed'
    | 'error'
  discussionId?: string
  round?: number
  agent?: { id: string; name: string; role: string }
  entry?: DiscussionLogEntry
  result?: DiscussionResult
  error?: string
}) => void

// ============================================
// 컨텍스트 구성
// ============================================

/**
 * 스토리의 이전 챕터, 세계관, 캐릭터, 채택 댓글을 하나의 컨텍스트로 구성
 */
export async function buildContext(
  supabase: SupabaseClient,
  storyId: string,
  adoptedCommentIds: string[],
): Promise<StoryContext> {
  // 스토리 기본 정보
  const { data: story } = await supabase
    .from('stories')
    .select('title, synopsis, genre, world_setting, characters')
    .eq('id', storyId)
    .single()

  if (!story) throw new Error('스토리를 찾을 수 없습니다')

  // 최근 챕터 (최대 5개, 요약용)
  const { data: chapters } = await supabase
    .from('chapters')
    .select('chapter_number, title, content')
    .eq('story_id', storyId)
    .eq('status', 'published')
    .order('chapter_number', { ascending: false })
    .limit(5)

  const previousChapters = (chapters ?? []).reverse().map((ch) => ({
    number: ch.chapter_number,
    title: ch.title,
    summary:
      ch.content.length > MAX_CHAPTER_SUMMARY_LENGTH
        ? ch.content.slice(0, MAX_CHAPTER_SUMMARY_LENGTH) + '...'
        : ch.content,
  }))

  // 채택된 댓글 내용
  let adoptedComments: Array<{ content: string; type: string }> = []
  if (adoptedCommentIds.length > 0) {
    const { data: comments } = await supabase
      .from('comments')
      .select('content, comment_type')
      .in('id', adoptedCommentIds)

    adoptedComments = (comments ?? []).map((c) => ({
      content: c.content,
      type: c.comment_type,
    }))
  }

  return {
    title: story.title,
    synopsis: story.synopsis,
    genre: story.genre,
    worldSetting: story.world_setting,
    characters: story.characters,
    previousChapters,
    adoptedComments,
    trendKeywords: await fetchTrendKeywords(story.genre).then((r) =>
      r.keywords.map((k) => k.keyword),
    ),
  }
}

// ============================================
// AI 호출 (재시도 포함)
// ============================================

async function callAgent(
  agent: AgentRow,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const client = createAIClient()
  const model = agent.model || getDefaultModel()

  return withRetry(
    async () => {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1024,
        temperature: 0.8,
      })
      return response.choices[0]?.message?.content ?? ''
    },
    { maxRetries: 2, label: `agent:${agent.name}` },
  )
}

// ============================================
// 멀티 에이전트 토론 실행
// ============================================

/**
 * PD -> 작가 -> 편집자 순서로 라운드 반복
 */
export async function runDiscussion(
  supabase: SupabaseClient,
  storyId: string,
  userId: string,
  adoptedCommentIds: string[],
  onProgress?: OnProgress,
): Promise<DiscussionResult> {
  // 1. 스토리에 배치된 에이전트 조회
  const { data: storyAgents } = await supabase
    .from('story_agents')
    .select('agent_id, agent:agents(*)')
    .eq('story_id', storyId)

  if (!storyAgents || storyAgents.length === 0) {
    throw new Error('스토리에 배치된 에이전트가 없습니다. 먼저 에이전트를 배치해주세요.')
  }

  // 역할별 에이전트 분류
  const agents = storyAgents.map((sa) => sa.agent as unknown as AgentRow)
  const pd = agents.find((a) => a.role === 'pd')
  const writer = agents.find((a) => a.role === 'writer')
  const editor = agents.find((a) => a.role === 'editor')

  if (!pd || !writer || !editor) {
    throw new Error('PD, 작가, 편집자 역할의 에이전트가 모두 필요합니다.')
  }

  // 2. 컨텍스트 구성
  const context = await buildContext(supabase, storyId, adoptedCommentIds)

  // 3. 토론 레코드 생성
  const { data: discussion, error: createError } = await supabase
    .from('discussions')
    .insert({
      story_id: storyId,
      initiated_by: userId,
      status: 'in_progress',
      context_summary: `${context.title} - ${context.genre.join(', ')}`,
      adopted_comments: adoptedCommentIds.length > 0 ? adoptedCommentIds : null,
      discussion_log: [],
      total_rounds: 0,
    })
    .select('id')
    .single()

  if (createError || !discussion) {
    throw new Error('토론 세션 생성 실패')
  }

  const discussionId = discussion.id
  const log: DiscussionLogEntry[] = []

  onProgress?.({ type: 'started', discussionId })

  try {
    // 4. 라운드 실행
    let consensusReached = false
    let actualRounds = 0

    for (let round = 1; round <= MAX_ROUNDS; round++) {
      const previousMessages = log
        .map((entry) => `[${entry.agent_name}(${entry.agent_role})] ${entry.message}`)
        .join('\n\n')

      // PD 발언
      onProgress?.({
        type: 'agent_speaking',
        round,
        agent: { id: pd.id, name: pd.name, role: 'pd' },
      })
      const pdSystemPrompt = buildAgentSystemPrompt(pd, context)
      const pdUserPrompt = buildPdPrompt(round, MAX_ROUNDS, previousMessages)
      const pdMessage = await callAgent(pd, pdSystemPrompt, pdUserPrompt)

      const pdEntry: DiscussionLogEntry = {
        round,
        agent_id: pd.id,
        agent_name: pd.name,
        agent_role: 'pd',
        message: pdMessage,
        timestamp: new Date().toISOString(),
      }
      log.push(pdEntry)
      onProgress?.({ type: 'agent_message', entry: pdEntry })

      // 작가 발언
      onProgress?.({
        type: 'agent_speaking',
        round,
        agent: { id: writer.id, name: writer.name, role: 'writer' },
      })
      const writerSystemPrompt = buildAgentSystemPrompt(writer, context)
      const writerUserPrompt = buildWriterPrompt(pdMessage, previousMessages)
      const writerMessage = await callAgent(writer, writerSystemPrompt, writerUserPrompt)

      const writerEntry: DiscussionLogEntry = {
        round,
        agent_id: writer.id,
        agent_name: writer.name,
        agent_role: 'writer',
        message: writerMessage,
        timestamp: new Date().toISOString(),
      }
      log.push(writerEntry)
      onProgress?.({ type: 'agent_message', entry: writerEntry })

      // 편집자 발언
      onProgress?.({
        type: 'agent_speaking',
        round,
        agent: { id: editor.id, name: editor.name, role: 'editor' },
      })
      const editorSystemPrompt = buildAgentSystemPrompt(editor, context)
      const editorUserPrompt = buildEditorPrompt(pdMessage, writerMessage, round, MAX_ROUNDS)
      const editorMessage = await callAgent(editor, editorSystemPrompt, editorUserPrompt)

      const editorEntry: DiscussionLogEntry = {
        round,
        agent_id: editor.id,
        agent_name: editor.name,
        agent_role: 'editor',
        message: editorMessage,
        timestamp: new Date().toISOString(),
      }
      log.push(editorEntry)
      onProgress?.({ type: 'agent_message', entry: editorEntry })

      actualRounds = round

      // 라운드 완료 시 DB 업데이트
      await supabase
        .from('discussions')
        .update({
          discussion_log: log,
          total_rounds: round,
        })
        .eq('id', discussionId)

      // 편집자 합의 확인 → 조기 종료
      if (editorMessage.includes('[AGREED]')) {
        consensusReached = true
        break
      }
    }

    // 5. 토론 요약 생성
    onProgress?.({ type: 'summary_generating' })

    const fullLog = log
      .map(
        (entry) =>
          `[라운드 ${entry.round}] ${entry.agent_name}(${entry.agent_role}): ${entry.message}`,
      )
      .join('\n\n')

    const summaryPrompt = buildSummaryPrompt(fullLog, consensusReached)
    const summary = await callAgent(pd, pd.system_prompt, summaryPrompt)

    // 6. 완료 상태로 업데이트
    await supabase
      .from('discussions')
      .update({
        status: 'completed',
        discussion_log: log,
        summary,
        total_rounds: actualRounds,
        completed_at: new Date().toISOString(),
      })
      .eq('id', discussionId)

    const result: DiscussionResult = {
      discussionId,
      summary,
      totalRounds: actualRounds,
      log,
      consensusReached,
    }

    onProgress?.({ type: 'completed', result })

    return result
  } catch (error) {
    // 실패 시 상태 업데이트
    await supabase
      .from('discussions')
      .update({
        status: 'failed',
        discussion_log: log,
        total_rounds: log.length > 0 ? log[log.length - 1].round : 0,
      })
      .eq('id', discussionId)

    onProgress?.({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })

    throw error
  }
}

// ============================================
// 사용자 피드백 라운드
// ============================================

/**
 * 완료된 토론에 사용자 피드백을 반영해 1라운드 추가 (PD→작가→편집자)
 * 새 요약을 생성하고 DB를 업데이트한다.
 */
export async function runFeedbackRound(
  supabase: SupabaseClient,
  discussionId: string,
  feedback: string,
  onProgress?: OnProgress,
): Promise<DiscussionResult> {
  // 1. 기존 토론 조회
  const { data: discussion } = await supabase
    .from('discussions')
    .select('*')
    .eq('id', discussionId)
    .single()

  if (!discussion) throw new Error('토론을 찾을 수 없습니다')
  if (discussion.status !== 'completed')
    throw new Error('완료된 토론에만 피드백을 추가할 수 있습니다')

  const storyId = discussion.story_id

  // 2. 에이전트 조회
  const { data: storyAgents } = await supabase
    .from('story_agents')
    .select('agent_id, agent:agents(*)')
    .eq('story_id', storyId)

  const agents = (storyAgents ?? []).map((sa) => sa.agent as unknown as AgentRow)
  const pd = agents.find((a) => a.role === 'pd')
  const writer = agents.find((a) => a.role === 'writer')
  const editor = agents.find((a) => a.role === 'editor')

  if (!pd || !writer || !editor) {
    throw new Error('PD, 작가, 편집자 역할의 에이전트가 모두 필요합니다.')
  }

  // 3. 컨텍스트 구성
  const context = await buildContext(supabase, storyId, [])

  // 4. 기존 로그 복원 + 상태를 in_progress로 전환
  const log: DiscussionLogEntry[] = discussion.discussion_log ?? []
  const feedbackRound = (discussion.total_rounds ?? 0) + 1

  await supabase.from('discussions').update({ status: 'in_progress' }).eq('id', discussionId)

  onProgress?.({ type: 'started', discussionId })

  try {
    const previousMessages = log
      .map((entry) => `[${entry.agent_name}(${entry.agent_role})] ${entry.message}`)
      .join('\n\n')

    // 5. PD 발언 (피드백 반영)
    onProgress?.({
      type: 'agent_speaking',
      round: feedbackRound,
      agent: { id: pd.id, name: pd.name, role: 'pd' },
    })
    const pdSystemPrompt = buildAgentSystemPrompt(pd, context)
    const pdUserPrompt = buildFeedbackPdPrompt(feedback, previousMessages)
    const pdMessage = await callAgent(pd, pdSystemPrompt, pdUserPrompt)

    const pdEntry: DiscussionLogEntry = {
      round: feedbackRound,
      agent_id: pd.id,
      agent_name: pd.name,
      agent_role: 'pd',
      message: pdMessage,
      timestamp: new Date().toISOString(),
    }
    log.push(pdEntry)
    onProgress?.({ type: 'agent_message', entry: pdEntry })

    // 6. 작가 발언 (피드백 반영)
    onProgress?.({
      type: 'agent_speaking',
      round: feedbackRound,
      agent: { id: writer.id, name: writer.name, role: 'writer' },
    })
    const writerSystemPrompt = buildAgentSystemPrompt(writer, context)
    const writerUserPrompt = buildFeedbackWriterPrompt(feedback, pdMessage, previousMessages)
    const writerMessage = await callAgent(writer, writerSystemPrompt, writerUserPrompt)

    const writerEntry: DiscussionLogEntry = {
      round: feedbackRound,
      agent_id: writer.id,
      agent_name: writer.name,
      agent_role: 'writer',
      message: writerMessage,
      timestamp: new Date().toISOString(),
    }
    log.push(writerEntry)
    onProgress?.({ type: 'agent_message', entry: writerEntry })

    // 7. 편집자 발언 (피드백 반영)
    onProgress?.({
      type: 'agent_speaking',
      round: feedbackRound,
      agent: { id: editor.id, name: editor.name, role: 'editor' },
    })
    const editorSystemPrompt = buildAgentSystemPrompt(editor, context)
    const editorUserPrompt = buildFeedbackEditorPrompt(feedback, pdMessage, writerMessage)
    const editorMessage = await callAgent(editor, editorSystemPrompt, editorUserPrompt)

    const editorEntry: DiscussionLogEntry = {
      round: feedbackRound,
      agent_id: editor.id,
      agent_name: editor.name,
      agent_role: 'editor',
      message: editorMessage,
      timestamp: new Date().toISOString(),
    }
    log.push(editorEntry)
    onProgress?.({ type: 'agent_message', entry: editorEntry })

    // 8. 새 요약 생성
    onProgress?.({ type: 'summary_generating' })

    const fullLog = log
      .map(
        (entry) =>
          `[라운드 ${entry.round}] ${entry.agent_name}(${entry.agent_role}): ${entry.message}`,
      )
      .join('\n\n')

    const consensusReached = editorMessage.includes('[AGREED]')
    const summaryPrompt = buildSummaryPrompt(fullLog, consensusReached)
    const summary = await callAgent(pd, pd.system_prompt, summaryPrompt)

    // 9. 완료 상태로 업데이트
    await supabase
      .from('discussions')
      .update({
        status: 'completed',
        discussion_log: log,
        summary,
        total_rounds: feedbackRound,
        completed_at: new Date().toISOString(),
      })
      .eq('id', discussionId)

    const result: DiscussionResult = {
      discussionId,
      summary,
      totalRounds: feedbackRound,
      log,
      consensusReached,
    }

    onProgress?.({ type: 'completed', result })

    return result
  } catch (error) {
    await supabase
      .from('discussions')
      .update({
        status: 'completed',
        discussion_log: log,
        total_rounds: feedbackRound,
      })
      .eq('id', discussionId)

    onProgress?.({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })

    throw error
  }
}

// ============================================
// 챕터 초안 생성
// ============================================

export async function generateChapter(
  supabase: SupabaseClient,
  discussionId: string,
): Promise<GeneratedChapter> {
  // 1. 토론 정보 조회
  const { data: discussion } = await supabase
    .from('discussions')
    .select('*')
    .eq('id', discussionId)
    .single()

  if (!discussion) throw new Error('토론을 찾을 수 없습니다')
  if (discussion.status !== 'completed') throw new Error('완료된 토론만 챕터를 생성할 수 있습니다')
  if (!discussion.summary) throw new Error('토론 요약이 없습니다')

  // 2. 스토리 컨텍스트
  const context = await buildContext(supabase, discussion.story_id, [])

  // 3. 작가 에이전트 조회
  const { data: storyAgents } = await supabase
    .from('story_agents')
    .select('agent:agents(*)')
    .eq('story_id', discussion.story_id)

  const agents = (storyAgents ?? []).map((sa) => sa.agent as unknown as AgentRow)
  const writer = agents.find((a) => a.role === 'writer')

  if (!writer) throw new Error('작가 에이전트를 찾을 수 없습니다')

  // 4. 챕터 생성
  const prompt = buildChapterGenerationPrompt(context, discussion.summary)
  const client = createAIClient()
  const model = writer.model || getDefaultModel()

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: writer.system_prompt },
      { role: 'user', content: prompt },
    ],
    max_tokens: 4096,
    temperature: 0.7,
  })

  const content = response.choices[0]?.message?.content ?? ''

  // 5. 다음 챕터 번호
  const { data: lastChapter } = await supabase
    .from('chapters')
    .select('chapter_number')
    .eq('story_id', discussion.story_id)
    .order('chapter_number', { ascending: false })
    .limit(1)
    .single()

  const nextNumber = (lastChapter?.chapter_number ?? 0) + 1

  return {
    title: `${nextNumber}화`,
    content,
    wordCount: content.length,
  }
}

// ============================================
// 자동 회차 생성 (Cron용)
// ============================================

/**
 * 48시간 마감 후 자동으로 댓글 분석 → 토론 → 챕터 생성/발행
 */
export async function autoGenerateNextChapter(
  supabase: SupabaseClient,
  storyId: string,
  chapterId: string,
  creatorId: string,
): Promise<{ chapterId: string; chapterNumber: number }> {
  // 1. 해당 챕터의 모든 댓글 조회 (아직 채택되지 않은 것)
  const { data: comments } = await supabase
    .from('comments')
    .select('id, content, comment_type, like_count')
    .eq('chapter_id', chapterId)
    .eq('is_adopted', false)
    .order('like_count', { ascending: false })

  // 2. 스토리 정보
  const { data: story } = await supabase
    .from('stories')
    .select('title, synopsis')
    .eq('id', storyId)
    .single()

  if (!story) throw new Error(`스토리 ${storyId}를 찾을 수 없습니다`)

  let adoptedIds: string[] = []

  // 3. 댓글이 있으면 AI 분석으로 선별
  if (comments && comments.length > 0) {
    const ai = createAIClient()
    const commentsText = comments.map((c, i) => `[${i + 1}] ${c.content}`).join('\n')

    const response = await ai.chat.completions.create({
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

    adoptedIds = adopted
      .filter((a) => a.index >= 1 && a.index <= comments.length)
      .map((a) => comments[a.index - 1].id)

    // 채택된 댓글 DB 업데이트
    if (adoptedIds.length > 0) {
      await supabase.from('comments').update({ is_adopted: true }).in('id', adoptedIds)

      // 기여 기록
      const { data: adoptedRows } = await supabase
        .from('comments')
        .select('id, user_id, chapter_id')
        .in('id', adoptedIds)

      if (adoptedRows) {
        const { data: chapters } = await supabase
          .from('chapters')
          .select('id, chapter_number')
          .in('id', [...new Set(adoptedRows.map((c) => c.chapter_id))])

        const chapterMap = new Map(chapters?.map((ch) => [ch.id, ch.chapter_number]) ?? [])

        for (const comment of adoptedRows) {
          await recordContributionWithClient(supabase, {
            userId: comment.user_id,
            storyId,
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
  }

  // 4. 토론 실행
  const discussionResult = await runDiscussion(supabase, storyId, creatorId, adoptedIds)

  // 5. 챕터 생성
  const generated = await generateChapter(supabase, discussionResult.discussionId)

  // 6. 챕터 DB insert (published)
  const { data: lastChapter } = await supabase
    .from('chapters')
    .select('chapter_number')
    .eq('story_id', storyId)
    .order('chapter_number', { ascending: false })
    .limit(1)
    .single()

  const nextNumber = (lastChapter?.chapter_number ?? 0) + 1

  const { data: newChapter, error: insertError } = await supabase
    .from('chapters')
    .insert({
      story_id: storyId,
      chapter_number: nextNumber,
      title: generated.title,
      content: generated.content,
      discussion_id: discussionResult.discussionId,
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertError || !newChapter) {
    throw new Error(`챕터 insert 실패: ${insertError?.message}`)
  }

  // 채택 댓글에 adopted_in_chapter 업데이트
  if (adoptedIds.length > 0) {
    await supabase.from('comments').update({ adopted_in_chapter: nextNumber }).in('id', adoptedIds)
  }

  // 기여 기록
  await recordContributionWithClient(supabase, {
    userId: creatorId,
    storyId,
    contributionType: 'chapter_generated',
    context: {
      chapter_id: newChapter.id,
      chapter_number: nextNumber,
    },
  })

  return { chapterId: newChapter.id, chapterNumber: nextNumber }
}

/** 주어진 supabase 클라이언트로 기여 기록 (cron 환경에서 사용) */
async function recordContributionWithClient(
  supabase: SupabaseClient,
  params: {
    userId: string
    storyId: string
    contributionType: ContributionType
    context: Record<string, unknown>
  },
): Promise<void> {
  try {
    await supabase.from('contributions').insert({
      user_id: params.userId,
      story_id: params.storyId,
      contribution_type: params.contributionType,
      context: params.context,
    })
  } catch (err) {
    console.error('[auto-chapter] contribution record failed:', err)
  }
}
