import { z } from 'zod'

// ============================================
// Comment Schemas
// ============================================

export const CreateCommentSchema = z.object({
  chapterId: z.string().uuid('유효한 챕터 ID가 필요합니다'),
  content: z.string().min(1, '댓글 내용을 입력하세요').max(1000, '댓글은 1000자 이내로 입력하세요'),
  commentType: z
    .enum(['general', 'idea_plot', 'idea_character', 'idea_setting'])
    .default('general'),
})

export const CommentsQuerySchema = z.object({
  chapterId: z.string().uuid('유효한 챕터 ID가 필요합니다'),
  type: z.enum(['general', 'idea_plot', 'idea_character', 'idea_setting']).optional(),
  sort: z.enum(['latest', 'popular']).default('latest'),
})

export const AnalyzeCommentsSchema = z.object({
  storyId: z.string().uuid('유효한 스토리 ID가 필요합니다'),
  chapterId: z.string().uuid('유효한 챕터 ID가 필요합니다'),
})

// ============================================
// Types
// ============================================

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>
export type CommentsQuery = z.infer<typeof CommentsQuerySchema>
export type AnalyzeCommentsInput = z.infer<typeof AnalyzeCommentsSchema>

export type CommentType = 'general' | 'idea_plot' | 'idea_character' | 'idea_setting'

export interface CommentRow {
  id: string
  chapter_id: string
  user_id: string
  content: string
  comment_type: CommentType
  like_count: number
  is_adopted: boolean
  adopted_in_discussion: string | null
  adopted_in_chapter: number | null
  created_at: string
  user?: {
    id: string
    display_name: string
    avatar_url: string | null
    wallet_address: string
  }
}

export interface AnalyzeResult {
  analyzedCount: number
  adoptedComments: Array<{
    commentId: string
    content: string
    relevanceScore: number
    reason: string
  }>
}

export const COMMENT_TYPE_LABELS: Record<CommentType, string> = {
  general: '일반 댓글',
  idea_plot: '#전개제안',
  idea_character: '#캐릭터제안',
  idea_setting: '#설정제안',
}

export const IDEA_TYPES: CommentType[] = ['idea_plot', 'idea_character', 'idea_setting']
