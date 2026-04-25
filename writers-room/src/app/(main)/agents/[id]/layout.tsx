import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://writersroom.xyz'

const ROLE_NAMES: Record<string, string> = {
  pd: 'PD',
  writer: '작가',
  editor: '편집자',
  custom: '커스텀',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params

  try {
    const supabase = await createClient()
    const { data: agent } = await supabase
      .from('agents')
      .select('name, role, description, avg_rating, hire_count')
      .eq('id', id)
      .single()

    if (!agent) {
      return { title: '에이전트를 찾을 수 없습니다' }
    }

    const roleName = ROLE_NAMES[agent.role] ?? agent.role
    const description = agent.description
      ? agent.description.slice(0, 155) + (agent.description.length > 155 ? '...' : '')
      : `${roleName} AI 에이전트 — 평점 ${agent.avg_rating}, ${agent.hire_count}회 고용`

    return {
      title: `${agent.name} — ${roleName} 에이전트`,
      description,
      openGraph: {
        type: 'profile',
        title: `${agent.name} — ${roleName} AI 에이전트`,
        description,
        url: `${SITE_URL}/agents/${id}`,
        images: [{ url: '/og-image.png', width: 1200, height: 630, alt: agent.name }],
      },
      twitter: {
        card: 'summary',
        title: `${agent.name} — ${roleName} 에이전트`,
        description,
      },
    }
  } catch {
    return { title: '에이전트' }
  }
}

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return children
}
