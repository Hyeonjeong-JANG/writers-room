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
 * PD에게 보내는 첫 라운드 프롬프트
 */
export function buildPdPrompt(round: number, previousMessages: string): string {
  if (round === 1) {
    return `이번 회차의 스토리 방향을 제안해주세요. 핵심 갈등, 전환점, 독자를 끌어당길 포인트를 포함해주세요.`
  }
  return `이전 토론 내용을 바탕으로 최종 방향을 정리해주세요:\n\n${previousMessages}`
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
 * 편집자에게 보내는 프롬프트
 */
export function buildEditorPrompt(pdMessage: string, writerMessage: string): string {
  return `PD와 작가의 의견을 검토하고, 개선점과 주의사항을 제안해주세요.

PD 의견:
${pdMessage}

작가 의견:
${writerMessage}`
}

// ============================================
// 토론 요약 프롬프트
// ============================================

export function buildSummaryPrompt(discussionLog: string): string {
  return `다음 작가방 토론 내용을 요약해주세요. 핵심 결정사항, 스토리 방향, 주요 장면을 정리해주세요.

토론 내용:
${discussionLog}

다음 형식으로 요약해주세요:
1. 핵심 방향: (한 줄 요약)
2. 주요 장면: (3-5개 bullet)
3. 주의사항: (편집자 지적 사항)
4. 다음 회차 훅: (독자 유인 포인트)`
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
