import { z } from 'zod'

// ============================================
// Contribution Schemas
// ============================================

export const RecordContributionSchema = z.object({
  storyId: z.string().uuid().optional(),
  contributionType: z.enum(['comment_adopted', 'chapter_generated', 'agent_created'], {
    message: '기여 유형을 선택하세요',
  }),
  context: z.record(z.string(), z.unknown()).optional(),
})

export const ContributionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  type: z.enum(['comment_adopted', 'chapter_generated', 'agent_created']).optional(),
})

export const WalletAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, '유효한 지갑 주소가 필요합니다')

// ============================================
// Types
// ============================================

export type RecordContributionInput = z.infer<typeof RecordContributionSchema>
export type ContributionsQuery = z.infer<typeof ContributionsQuerySchema>

export type ContributionType = 'comment_adopted' | 'chapter_generated' | 'agent_created'

export interface ContributionRow {
  id: string
  user_id: string
  story_id: string | null
  contribution_type: ContributionType
  context: Record<string, unknown>
  tx_hash: string | null
  onchain_confirmed: boolean
  created_at: string
  user?: {
    id: string
    display_name: string
    avatar_url: string | null
    wallet_address: string
  }
  story?: {
    id: string
    title: string
  }
}

export interface NansenWalletData {
  wallet_address: string
  labels: string[]
  is_smart_money: boolean
  portfolio_quality_score: number
  raw_response: Record<string, unknown>
  fetched_at: string
  expires_at: string
}

export type TrustTier = 'none' | 'bronze' | 'silver' | 'gold'

export interface AgentTrustScoreRow {
  id: string
  agent_id: string
  overall_score: number
  trust_tier: TrustTier
  rehire_rate: number
  smart_money_ratio: number
  utilization_rate: number
  unique_hirers: number
  calculated_at: string
  created_at: string
  updated_at: string
}

// ============================================
// Constants
// ============================================

export const TRUST_TIER_LABELS: Record<TrustTier, string> = {
  none: '미평가',
  bronze: '브론즈',
  silver: '실버',
  gold: '골드',
}

export const TRUST_TIER_COLORS: Record<TrustTier, string> = {
  none: 'text-gray-400',
  bronze: 'text-amber-700',
  silver: 'text-gray-500',
  gold: 'text-yellow-500',
}

export const TRUST_TIER_BG: Record<TrustTier, string> = {
  none: 'bg-gray-100',
  bronze: 'bg-amber-100',
  silver: 'bg-gray-200',
  gold: 'bg-yellow-100',
}

export const CONTRIBUTION_TYPE_LABELS: Record<ContributionType, string> = {
  comment_adopted: '댓글 채택',
  chapter_generated: '챕터 발행',
  agent_created: '에이전트 생성',
}
