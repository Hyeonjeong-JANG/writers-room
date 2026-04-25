import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InitiatePaymentSchema, PLATFORM_FEE_RATE } from '@/features/payment/lib/schemas'
import { USDC_ADDRESSES } from '@/features/payment/lib/constants'

// POST /api/payments/x402/initiate - 결제 시작
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()
    const parsed = InitiatePaymentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: '입력값을 확인하세요',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      )
    }

    const { agentId, storyId } = parsed.data

    // 스토리 소유권 확인
    const { data: story } = await supabase
      .from('stories')
      .select('id, creator_id')
      .eq('id', storyId)
      .single()

    if (!story) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '스토리를 찾을 수 없습니다' } },
        { status: 404 },
      )
    }

    if (story.creator_id !== user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '스토리 작성자만 결제할 수 있습니다' } },
        { status: 403 },
      )
    }

    // 에이전트 확인 + 빌더 정보
    const { data: agent } = await supabase
      .from('agents')
      .select('id, price_usdc, is_active, creator_id')
      .eq('id', agentId)
      .single()

    if (!agent || !agent.is_active) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '에이전트를 찾을 수 없습니다' } },
        { status: 404 },
      )
    }

    if (agent.price_usdc <= 0) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: '무료 에이전트는 결제가 필요 없습니다' } },
        { status: 400 },
      )
    }

    // 이미 배치 확인
    const { data: existing } = await supabase
      .from('story_agents')
      .select('id')
      .eq('story_id', storyId)
      .eq('agent_id', agentId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: '이미 배치된 에이전트입니다' } },
        { status: 409 },
      )
    }

    // 진행 중인 결제가 있는지 확인
    const { data: pendingTx } = await supabase
      .from('transactions')
      .select('id')
      .eq('payer_id', user.id)
      .eq('agent_id', agentId)
      .eq('story_id', storyId)
      .eq('status', 'pending')
      .maybeSingle()

    if (pendingTx) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: '이미 진행 중인 결제가 있습니다' } },
        { status: 409 },
      )
    }

    // 수령자(에이전트 빌더) 지갑 주소 조회
    const { data: payee } = await supabase
      .from('users')
      .select('id, wallet_address')
      .eq('id', agent.creator_id)
      .single()

    if (!payee?.wallet_address) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: '에이전트 빌더의 지갑 주소가 없습니다' } },
        { status: 400 },
      )
    }

    // 플랫폼 수수료 계산
    const amount = agent.price_usdc
    const platformFee = Math.round(amount * PLATFORM_FEE_RATE * 100) / 100

    // 트랜잭션 레코드 생성 (pending)
    const { data: transaction, error: insertError } = await supabase
      .from('transactions')
      .insert({
        payer_id: user.id,
        payee_id: agent.creator_id,
        agent_id: agentId,
        story_id: storyId,
        amount_usdc: amount,
        platform_fee: platformFee,
        status: 'pending',
      })
      .select('id')
      .single()

    if (insertError || !transaction) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: '결제 생성 실패' } },
        { status: 500 },
      )
    }

    const chainId = parseInt(process.env.NEXT_PUBLIC_BASE_CHAIN_ID ?? '8453', 10)
    const usdcAddress = USDC_ADDRESSES[chainId as keyof typeof USDC_ADDRESSES]

    return NextResponse.json({
      data: {
        paymentId: transaction.id,
        amount: amount,
        platformFee: platformFee,
        netAmount: Math.round((amount - platformFee) * 100) / 100,
        token: 'USDC',
        tokenAddress: usdcAddress,
        recipient: payee.wallet_address,
        chainId: chainId,
      },
    })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
