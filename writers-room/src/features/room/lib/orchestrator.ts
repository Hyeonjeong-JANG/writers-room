import { createFlockClient, getDefaultModel } from '@/lib/flock/client'
import { fetchTrendKeywords } from '@/lib/selanet/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AgentRow, DiscussionLogEntry, DiscussionResult, GeneratedChapter } from './schemas'
import {
  type StoryContext,
  buildAgentSystemPrompt,
  buildPdPrompt,
  buildWriterPrompt,
  buildEditorPrompt,
  buildSummaryPrompt,
  buildChapterGenerationPrompt,
} from './prompts'

const MAX_ROUNDS = 2
const MAX_CHAPTER_SUMMARY_LENGTH = 500

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
// FLock API 호출
// ============================================

async function callAgent(
  agent: AgentRow,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const client = createFlockClient()
  const model = agent.flock_model || getDefaultModel()

  try {
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
  } catch (error) {
    // 1회 재시도
    try {
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
    } catch {
      throw new Error(
        `에이전트 "${agent.name}" 호출 실패: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }
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

  try {
    // 4. 라운드 실행
    for (let round = 1; round <= MAX_ROUNDS; round++) {
      const previousMessages = log
        .map((entry) => `[${entry.agent_name}(${entry.agent_role})] ${entry.message}`)
        .join('\n\n')

      // PD 발언
      const pdSystemPrompt = buildAgentSystemPrompt(pd, context)
      const pdUserPrompt = buildPdPrompt(round, previousMessages)
      const pdMessage = await callAgent(pd, pdSystemPrompt, pdUserPrompt)

      log.push({
        round,
        agent_id: pd.id,
        agent_name: pd.name,
        agent_role: 'pd',
        message: pdMessage,
        timestamp: new Date().toISOString(),
      })

      // 작가 발언
      const writerSystemPrompt = buildAgentSystemPrompt(writer, context)
      const writerUserPrompt = buildWriterPrompt(pdMessage, previousMessages)
      const writerMessage = await callAgent(writer, writerSystemPrompt, writerUserPrompt)

      log.push({
        round,
        agent_id: writer.id,
        agent_name: writer.name,
        agent_role: 'writer',
        message: writerMessage,
        timestamp: new Date().toISOString(),
      })

      // 편집자 발언
      const editorSystemPrompt = buildAgentSystemPrompt(editor, context)
      const editorUserPrompt = buildEditorPrompt(pdMessage, writerMessage)
      const editorMessage = await callAgent(editor, editorSystemPrompt, editorUserPrompt)

      log.push({
        round,
        agent_id: editor.id,
        agent_name: editor.name,
        agent_role: 'editor',
        message: editorMessage,
        timestamp: new Date().toISOString(),
      })

      // 라운드 완료 시 DB 업데이트
      await supabase
        .from('discussions')
        .update({
          discussion_log: log,
          total_rounds: round,
        })
        .eq('id', discussionId)
    }

    // 5. 토론 요약 생성
    const fullLog = log
      .map(
        (entry) =>
          `[라운드 ${entry.round}] ${entry.agent_name}(${entry.agent_role}): ${entry.message}`,
      )
      .join('\n\n')

    const summaryPrompt = buildSummaryPrompt(fullLog)
    const summary = await callAgent(pd, pd.system_prompt, summaryPrompt)

    // 6. 완료 상태로 업데이트
    await supabase
      .from('discussions')
      .update({
        status: 'completed',
        discussion_log: log,
        summary,
        total_rounds: MAX_ROUNDS,
        completed_at: new Date().toISOString(),
      })
      .eq('id', discussionId)

    return {
      discussionId,
      summary,
      totalRounds: MAX_ROUNDS,
      log,
    }
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
  const client = createFlockClient()
  const model = writer.flock_model || getDefaultModel()

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
