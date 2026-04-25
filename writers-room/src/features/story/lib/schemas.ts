import { z } from 'zod'

// ============================================
// Story Schemas
// ============================================

const CharacterSchema = z.object({
  name: z.string().min(1, '캐릭터 이름은 필수입니다'),
  personality: z.string().optional(),
  role: z.string().optional(),
  description: z.string().optional(),
})

export const CreateStorySchema = z.object({
  title: z.string().min(1, '제목은 필수입니다').max(100, '제목은 100자 이내로 입력하세요'),
  synopsis: z
    .string()
    .min(10, '시놉시스는 10자 이상 입력하세요')
    .max(2000, '시놉시스는 2000자 이내로 입력하세요'),
  genre: z
    .array(z.string())
    .min(1, '장르를 하나 이상 선택하세요')
    .max(5, '장르는 최대 5개까지 선택 가능합니다'),
  worldSetting: z.record(z.string(), z.unknown()).optional(),
  characters: z.array(CharacterSchema).optional(),
})

export const UpdateStorySchema = z.object({
  title: z.string().min(1).max(100).optional(),
  synopsis: z.string().min(10).max(2000).optional(),
  genre: z.array(z.string()).min(1).max(5).optional(),
  worldSetting: z.record(z.string(), z.unknown()).optional(),
  characters: z.array(CharacterSchema).optional(),
  status: z.enum(['ongoing', 'hiatus', 'completed']).optional(),
  coverImageUrl: z.string().url().optional().nullable(),
})

// ============================================
// Chapter Schemas
// ============================================

export const CreateChapterSchema = z.object({
  title: z
    .string()
    .min(1, '챕터 제목은 필수입니다')
    .max(200, '챕터 제목은 200자 이내로 입력하세요'),
  content: z.string().min(1, '챕터 내용은 필수입니다'),
  discussionId: z.string().uuid().optional(),
})

// ============================================
// Query Schemas
// ============================================

export const StoriesQuerySchema = z.object({
  genre: z.string().optional(),
  status: z.enum(['ongoing', 'hiatus', 'completed']).optional(),
  sort: z.enum(['latest', 'popular']).default('latest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

// ============================================
// Types
// ============================================

export type CreateStoryInput = z.infer<typeof CreateStorySchema>
export type UpdateStoryInput = z.infer<typeof UpdateStorySchema>
export type CreateChapterInput = z.infer<typeof CreateChapterSchema>
export type StoriesQuery = z.infer<typeof StoriesQuerySchema>

// DB row types
export interface StoryRow {
  id: string
  creator_id: string
  title: string
  synopsis: string
  genre: string[]
  world_setting: Record<string, unknown> | null
  characters: Array<{
    name: string
    personality?: string
    role?: string
    description?: string
  }> | null
  status: 'ongoing' | 'hiatus' | 'completed'
  cover_image_url: string | null
  view_count: number
  created_at: string
  updated_at: string
  creator?: {
    id: string
    display_name: string
    avatar_url: string | null
    wallet_address: string
  }
  chapters?: Array<{ count: number }>
}

export interface ChapterRow {
  id: string
  story_id: string
  chapter_number: number
  title: string
  content: string
  discussion_id: string | null
  status: 'draft' | 'published'
  published_at: string | null
  created_at: string
  updated_at: string
}
