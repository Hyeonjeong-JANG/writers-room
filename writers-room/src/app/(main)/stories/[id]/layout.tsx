import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://writersroom.xyz'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params

  try {
    const supabase = await createClient()
    const { data: story } = await supabase
      .from('stories')
      .select('title, synopsis, genre, cover_image_url')
      .eq('id', id)
      .single()

    if (!story) {
      return { title: '스토리를 찾을 수 없습니다' }
    }

    const genreText = story.genre?.join(', ') ?? ''
    const description = story.synopsis
      ? story.synopsis.slice(0, 155) + (story.synopsis.length > 155 ? '...' : '')
      : `${genreText} 장르의 AI 협업 소설`

    return {
      title: story.title,
      description,
      openGraph: {
        type: 'article',
        title: story.title,
        description,
        url: `${SITE_URL}/stories/${id}`,
        images: story.cover_image_url
          ? [{ url: story.cover_image_url, width: 1200, height: 630, alt: story.title }]
          : [{ url: '/og-image.png', width: 1200, height: 630, alt: story.title }],
      },
      twitter: {
        card: 'summary_large_image',
        title: story.title,
        description,
        images: story.cover_image_url ? [story.cover_image_url] : ['/og-image.png'],
      },
    }
  } catch {
    return { title: '스토리' }
  }
}

export default function StoryLayout({ children }: { children: React.ReactNode }) {
  return children
}
