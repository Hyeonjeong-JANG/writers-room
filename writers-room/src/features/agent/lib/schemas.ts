import { z } from 'zod'

// ============================================
// Agent Schemas
// ============================================

export const CreateAgentSchema = z.object({
  name: z.string().min(1, '에이전트 이름은 필수입니다').max(50, '이름은 50자 이내'),
  role: z.enum(['pd', 'writer', 'editor'], {
    message: '역할을 선택하세요',
  }),
  genreTags: z.array(z.string()).min(1, '장르를 하나 이상 선택하세요').max(5, '장르는 최대 5개'),
  systemPrompt: z
    .string()
    .min(10, '시스템 프롬프트는 10자 이상')
    .max(5000, '시스템 프롬프트는 5000자 이내'),
  fewShotExamples: z.array(z.record(z.string(), z.unknown())).optional(),
  priceUsdc: z.coerce.number().min(0, '가격은 0 이상').max(100, '가격은 100 USDC 이하'),
  flockModel: z.string().min(1, '모델을 선택하세요'),
  description: z.string().max(500, '소개는 500자 이내').optional(),
})

export const UpdateAgentSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  genreTags: z.array(z.string()).min(1).max(5).optional(),
  systemPrompt: z.string().min(10).max(5000).optional(),
  fewShotExamples: z.array(z.record(z.string(), z.unknown())).optional(),
  priceUsdc: z.coerce.number().min(0).max(100).optional(),
  flockModel: z.string().min(1).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
})

export const AgentsQuerySchema = z.object({
  role: z.enum(['pd', 'writer', 'editor']).optional(),
  genre: z.string().optional(),
  sort: z.enum(['rating', 'popular', 'latest']).default('rating'),
  minRating: z.coerce.number().min(0).max(5).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const HireAgentSchema = z.object({
  storyId: z.string().uuid('유효한 스토리 ID가 필요합니다'),
})

export const CreateReviewSchema = z.object({
  rating: z.coerce.number().int().min(1, '별점은 1~5').max(5, '별점은 1~5'),
  reviewText: z.string().max(1000, '리뷰는 1000자 이내').optional(),
  storyId: z.string().uuid().optional(),
})

// ============================================
// Types
// ============================================

export type CreateAgentInput = z.infer<typeof CreateAgentSchema>
export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>
export type AgentsQuery = z.infer<typeof AgentsQuerySchema>
export type HireAgentInput = z.infer<typeof HireAgentSchema>
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>

export type AgentRole = 'pd' | 'writer' | 'editor'

export interface AgentRow {
  id: string
  creator_id: string
  name: string
  role: AgentRole
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
  flock_model: string
  created_at: string
  updated_at: string
  creator?: {
    id: string
    display_name: string
    avatar_url: string | null
    wallet_address: string
  }
}

export interface AgentReviewRow {
  id: string
  agent_id: string
  reviewer_id: string
  rating: number
  review_text: string | null
  story_id: string | null
  created_at: string
  reviewer?: {
    id: string
    display_name: string
    avatar_url: string | null
  }
}

export const ROLE_LABELS: Record<AgentRole, string> = {
  pd: 'PD',
  writer: '작가',
  editor: '편집자',
}

export const ROLE_COLORS: Record<AgentRole, string> = {
  pd: 'bg-blue-500',
  writer: 'bg-violet-500',
  editor: 'bg-teal-500',
}

export const GENRE_OPTIONS = [
  '로맨스',
  '판타지',
  'SF',
  '미스터리',
  '스릴러',
  '드라마',
  '액션',
  '호러',
  '코미디',
  '사극',
]
