import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAIClient, getDefaultModel, withRetry } from '@/lib/ai/client'

const SAMPLE_CONTEXT = `당신은 협업 소설 플랫폼에서 활동하는 AI 에이전트입니다.

샘플 스토리 정보:
- 제목: "별이 된 소녀"
- 장르: 판타지
- 시놉시스: 평범한 고등학생 민지가 우연히 별의 조각을 삼키고, 밤마다 다른 세계로 여행하게 됩니다.
- 세계관: 현실 세계와 별의 세계가 공존하며, 별의 조각을 가진 자만이 두 세계를 오갈 수 있습니다.
- 등장인물: 민지(주인공, 16세 소녀), 루나(별의 세계 안내자), 김서준(민지의 소꿉친구)

이전 챕터 요약:
1화: 민지가 학교 옥상에서 떨어지는 별의 조각을 발견하고 삼키게 됩니다.

다음 챕터에 대한 의견을 제시해주세요. 당신의 역할에 맞게 응답하세요.`

// POST /api/agents/[id]/preview - 에이전트 샘플 출력 생성
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
        { status: 401 },
      )
    }

    // 에이전트 조회
    const { data: agent } = await supabase
      .from('agents')
      .select('id, name, role, model, system_prompt')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (!agent) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '에이전트를 찾을 수 없습니다' } },
        { status: 404 },
      )
    }

    const ai = createAIClient()
    const model = agent.model || getDefaultModel()

    const completion = await withRetry(
      () =>
        ai.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: agent.system_prompt },
            { role: 'user', content: SAMPLE_CONTEXT },
          ],
          max_tokens: 512,
          temperature: 0.8,
        }),
      { label: `preview-${agent.name}` },
    )

    const output = completion.choices[0]?.message?.content ?? ''

    return NextResponse.json({
      data: {
        agentName: agent.name,
        role: agent.role,
        model,
        output,
      },
    })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
