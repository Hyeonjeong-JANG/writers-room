import { z } from 'zod'

// ============================================
// Discussion Schemas
// ============================================

export const StartDiscussionSchema = z.object({
  storyId: z.string().uuid('유효한 스토리 ID가 필요합니다'),
  adoptedCommentIds: z.array(z.string().uuid()).optional().default([]),
})

export const GenerateChapterSchema = z.object({
  discussionId: z.string().uuid('유효한 토론 ID가 필요합니다'),
})

// ============================================
// Types
// ============================================

export type StartDiscussionInput = z.infer<typeof StartDiscussionSchema>
export type GenerateChapterInput = z.infer<typeof GenerateChapterSchema>

// Discussion log entry
export interface DiscussionLogEntry {
  round: number
  agent_id: string
  agent_name: string
  agent_role: 'pd' | 'writer' | 'editor'
  message: string
  timestamp: string
}

// Agent DB row
export interface AgentRow {
  id: string
  creator_id: string
  name: string
  role: 'pd' | 'writer' | 'editor'
  genre_tags: string[]
  system_prompt: string
  few_shot_examples: unknown[] | null
  avatar_url: string | null
  description: string | null
  price_usdc: number
  is_default: boolean
  is_active: boolean
  hire_count: number
  avg_rating: number
  model: string
  created_at: string
  updated_at: string
}

// Discussion DB row
export interface DiscussionRow {
  id: string
  story_id: string
  initiated_by: string
  status: 'in_progress' | 'completed' | 'failed'
  context_summary: string | null
  adopted_comments: string[] | null
  discussion_log: DiscussionLogEntry[]
  summary: string | null
  total_rounds: number
  created_at: string
  completed_at: string | null
}

// Story agent (join table)
export interface StoryAgentRow {
  id: string
  story_id: string
  agent_id: string
  assigned_at: string
  agent?: AgentRow
}

// Orchestrator result
export interface DiscussionResult {
  discussionId: string
  summary: string
  totalRounds: number
  log: DiscussionLogEntry[]
  consensusReached?: boolean
}

// Chapter generation result
export interface GeneratedChapter {
  title: string
  content: string
  wordCount: number
}
