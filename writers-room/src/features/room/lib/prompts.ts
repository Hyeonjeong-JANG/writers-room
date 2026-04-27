import type { AgentRow } from './schemas'

// ============================================
// 컨텍스트 구성용 타입
// ============================================

export interface StoryContext {
  title: string
  synopsis: string
  genre: string[]
  worldSetting: Record<string, unknown> | null
  characters: Array<{
    name: string
    personality?: string
    role?: string
    description?: string
  }> | null
  previousChapters: Array<{ number: number; title: string; summary: string }>
  adoptedComments: Array<{ content: string; type: string }>
  trendKeywords: string[]
}

// ============================================
// 시스템 프롬프트 빌더
// ============================================

/**
 * 에이전트의 시스템 프롬프트에 스토리 컨텍스트를 결합
 */
export function buildAgentSystemPrompt(agent: AgentRow, context: StoryContext): string {
  const parts: string[] = [agent.system_prompt]

  parts.push('\n\n## 현재 스토리 정보')
  parts.push(`- 제목: ${context.title}`)
  parts.push(`- 장르: ${context.genre.join(', ')}`)
  parts.push(`- 시놉시스: ${context.synopsis}`)

  if (context.worldSetting) {
    parts.push(`- 세계관: ${JSON.stringify(context.worldSetting)}`)
  }

  if (context.characters && context.characters.length > 0) {
    parts.push('\n### 등장인물')
    for (const char of context.characters) {
      const desc = [char.role, char.personality, char.description].filter(Boolean).join(' / ')
      parts.push(`- ${char.name}: ${desc}`)
    }
  }

  if (context.previousChapters.length > 0) {
    parts.push('\n### 이전 챕터 요약')
    for (const ch of context.previousChapters) {
      parts.push(`- ${ch.number}화 "${ch.title}": ${ch.summary}`)
    }
  }

  if (context.adoptedComments.length > 0) {
    parts.push('\n### 독자 채택 의견 (이번 토론에 반영할 것)')
    for (const comment of context.adoptedComments) {
      parts.push(`- [${comment.type}] ${comment.content}`)
    }
  }

  if (context.trendKeywords.length > 0) {
    parts.push(`\n### 현재 트렌드 키워드: ${context.trendKeywords.join(', ')}`)
  }

  return parts.join('\n')
}

// ============================================
// 토론 라운드 유저 프롬프트
// ============================================

/**
 * PD에게 보내는 프롬프트 (라운드별 분기)
 */
export function buildPdPrompt(round: number, maxRounds: number, previousMessages: string): string {
  if (round === 1) {
    return `이번 회차의 스토리 방향을 제안해주세요. 핵심 갈등, 전환점, 독자를 끌어당길 포인트를 포함해주세요.`
  }
  if (round === maxRounds) {
    return `이전 토론 내용을 바탕으로 최종 방향을 정리해주세요:\n\n${previousMessages}`
  }
  return `편집자의 피드백을 반영해 방향을 보완해주세요:\n\n${previousMessages}`
}

/**
 * 작가에게 보내는 프롬프트
 */
export function buildWriterPrompt(pdMessage: string, previousMessages: string): string {
  return `PD의 제안을 바탕으로 구체적인 장면, 대사, 전개를 구상해주세요.

PD 의견:
${pdMessage}

${previousMessages ? `이전 토론:\n${previousMessages}` : ''}`
}

/**
 * 편집자에게 보내는 프롬프트 (합의 판정 태그 포함)
 */
export function buildEditorPrompt(
  pdMessage: string,
  writerMessage: string,
  round: number,
  maxRounds: number,
): string {
  const isLastRound = round === maxRounds

  return `PD와 작가의 의견을 검토하고, 개선점과 주의사항을 제안해주세요.

PD 의견:
${pdMessage}

작가 의견:
${writerMessage}

## 합의 판정
검토 후 반드시 응답 마지막에 다음 태그 중 하나를 포함하세요:
- [AGREED] — PD와 작가의 방향에 동의하며, 이대로 챕터를 작성해도 좋다고 판단될 때
- [REVISION_NEEDED] — 수정이 필요할 때 (구체적 개선점을 함께 제시)${isLastRound ? '\n\n⚠️ 이번이 마지막 라운드입니다. 완벽하지 않더라도 최선의 방향을 판단해주세요.' : ''}`
}

// ============================================
// 토론 요약 프롬프트
// ============================================

export function buildSummaryPrompt(discussionLog: string, consensusReached: boolean): string {
  if (consensusReached) {
    return `다음 작가방 토론에서 에이전트들이 합의에 도달했습니다. 합의된 내용을 정리해주세요.

토론 내용:
${discussionLog}

다음 형식으로 요약해주세요:
1. 합의 방향: (한 줄 요약)
2. 주요 장면: (3-5개 bullet)
3. 편집 지침: (편집자가 동의한 방향 기준)
4. 다음 회차 훅: (독자 유인 포인트)`
  }

  return `다음 작가방 토론이 마지막 라운드까지 진행되었지만 완전한 합의에 이르지 못했습니다. PD로서 최종 방향을 결정해주세요.

토론 내용:
${discussionLog}

다음 형식으로 요약해주세요:
1. 최종 결정 방향: (PD 판단으로 한 줄 요약)
2. 주요 장면: (3-5개 bullet)
3. 미해결 쟁점: (합의되지 않은 부분과 PD의 판단)
4. 다음 회차 훅: (독자 유인 포인트)`
}

// ============================================
// 사용자 피드백 라운드 프롬프트
// ============================================

/**
 * 사용자 피드백을 반영한 PD 프롬프트
 */
export function buildFeedbackPdPrompt(feedback: string, previousMessages: string): string {
  return `독자(사용자)가 토론 결과에 대해 피드백을 보냈습니다. 이를 반영하여 방향을 수정/보완해주세요.

## 독자 피드백
${feedback}

## 이전 토론 내용
${previousMessages}`
}

/**
 * 사용자 피드백을 반영한 작가 프롬프트
 */
export function buildFeedbackWriterPrompt(
  feedback: string,
  pdMessage: string,
  previousMessages: string,
): string {
  return `독자 피드백을 반영한 PD의 수정 방향을 바탕으로 장면과 전개를 다시 구상해주세요.

## 독자 피드백
${feedback}

## PD 수정 방향
${pdMessage}

## 이전 토론 내용
${previousMessages}`
}

/**
 * 사용자 피드백을 반영한 편집자 프롬프트
 */
export function buildFeedbackEditorPrompt(
  feedback: string,
  pdMessage: string,
  writerMessage: string,
): string {
  return `독자 피드백을 반영한 PD와 작가의 수정안을 검토해주세요.

## 독자 피드백
${feedback}

## PD 수정 방향
${pdMessage}

## 작가 수정안
${writerMessage}

## 합의 판정
검토 후 반드시 응답 마지막에 다음 태그 중 하나를 포함하세요:
- [AGREED] — 독자 피드백이 충분히 반영되었고, 이대로 챕터를 작성해도 좋다고 판단될 때
- [REVISION_NEEDED] — 추가 수정이 필요할 때 (구체적 개선점을 함께 제시)`
}

// ============================================
// 챕터 생성 프롬프트
// ============================================

export function buildChapterGenerationPrompt(context: StoryContext, summary: string): string {
  return `당신은 웹소설 작가입니다. 아래 토론 요약을 바탕으로 챕터 본문을 작성해주세요.

## 스토리 정보
- 제목: ${context.title}
- 장르: ${context.genre.join(', ')}

${context.characters && context.characters.length > 0 ? `## 등장인물\n${context.characters.map((c) => `- ${c.name}: ${[c.role, c.personality].filter(Boolean).join(' / ')}`).join('\n')}` : ''}

## 토론 요약
${summary}

## 작성 규칙
- 2000~3000자 분량의 웹소설 챕터를 작성하세요
- 생생한 묘사와 자연스러운 대화를 포함하세요
- 챕터 끝에 다음 회차가 궁금해지는 클리프행어를 넣으세요
- 제목은 "N화 - 부제" 형식으로 시작하지 마세요. 본문만 작성하세요
- 한국어로 작성하세요

본문:`
}
