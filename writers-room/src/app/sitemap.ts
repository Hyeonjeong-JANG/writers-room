import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://writersroom.xyz'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  // 정적 페이지
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    {
      url: `${SITE_URL}/stories`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/agents`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ]

  // 스토리 동적 페이지
  const { data: stories } = await supabase
    .from('stories')
    .select('id, updated_at')
    .order('updated_at', { ascending: false })
    .limit(500)

  const storyPages: MetadataRoute.Sitemap = (stories ?? []).map((story) => ({
    url: `${SITE_URL}/stories/${story.id}`,
    lastModified: new Date(story.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // 에이전트 동적 페이지
  const { data: agents } = await supabase
    .from('agents')
    .select('id, updated_at')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(200)

  const agentPages: MetadataRoute.Sitemap = (agents ?? []).map((agent) => ({
    url: `${SITE_URL}/agents/${agent.id}`,
    lastModified: new Date(agent.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...storyPages, ...agentPages]
}
