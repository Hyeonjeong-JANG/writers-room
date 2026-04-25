// Agent roles
export type AgentRole = 'pd' | 'writer' | 'editor'

// Story status
export type StoryStatus = 'ongoing' | 'hiatus' | 'completed'

// Chapter status
export type ChapterStatus = 'draft' | 'published'

// Discussion status
export type DiscussionStatus = 'in_progress' | 'completed' | 'failed'

// Comment types
export type CommentType = 'general' | 'idea_plot' | 'idea_character' | 'idea_setting'

// Trust tiers (Nansen)
export type TrustTier = 'none' | 'bronze' | 'silver' | 'gold'

// Contribution types
export type ContributionType = 'comment_adopted' | 'agent_created' | 'chapter_generated'

// Transaction status
export type TransactionStatus = 'pending' | 'confirmed' | 'failed'

// Agent role display config
export const AGENT_ROLE_CONFIG: Record<AgentRole, { label: string; color: string }> = {
  pd: { label: 'PD', color: '#3B82F6' },
  writer: { label: '작가', color: '#8B5CF6' },
  editor: { label: '편집자', color: '#14B8A6' },
}

// Trust tier display config
export const TRUST_TIER_CONFIG: Record<TrustTier, { label: string; color: string }> = {
  none: { label: '', color: '' },
  bronze: { label: 'Bronze', color: '#CD7F32' },
  silver: { label: 'Silver', color: '#C0C0C0' },
  gold: { label: 'Gold', color: '#FFD700' },
}
