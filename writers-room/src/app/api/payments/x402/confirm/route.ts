import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ConfirmPaymentSchema } from '@/features/payment/lib/schemas'
import { verifyTransaction } from '@/features/payment/lib/x402-client'

// POST /api/payments/x402/confirm - 결제 확인 (온체인 검증)
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
    const parsed = ConfirmPaymentSchema.safeParse(body)

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

    const { paymentId, txHash } = parsed.data

    // pending 트랜잭션 조회
    const { data: transaction } = await supabase
      .from('transactions')
      .select('id, payer_id, agent_id, story_id, status')
      .eq('id', paymentId)
      .single()

    if (!transaction) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '결제 정보를 찾을 수 없습니다' } },
        { status: 404 },
      )
    }

    if (transaction.payer_id !== user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '본인의 결제만 확인할 수 있습니다' } },
        { status: 403 },
      )
    }

    if (transaction.status !== 'pending') {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: '이미 처리된 결제입니다' } },
        { status: 400 },
      )
    }

    // 온체인 트랜잭션 검증
    const verification = await verifyTransaction(txHash as `0x${string}`)

    if (!verification.confirmed) {
      // 트랜잭션이 아직 확인되지 않았거나 실패
      await supabase
        .from('transactions')
        .update({ tx_hash: txHash, status: 'failed' })
        .eq('id', paymentId)

      return NextResponse.json(
        { error: { code: 'PAYMENT_FAILED', message: '온체인 트랜잭션 확인 실패' } },
        { status: 400 },
      )
    }

    // 트랜잭션 confirmed 업데이트
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        tx_hash: txHash,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', paymentId)

    if (updateError) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: '결제 상태 업데이트 실패' } },
        { status: 500 },
      )
    }

    // 에이전트를 스토리에 배치
    const { error: assignError } = await supabase.from('story_agents').insert({
      story_id: transaction.story_id,
      agent_id: transaction.agent_id,
    })

    if (assignError) {
      // 이미 배치된 경우 (중복 방지 unique index)
      if (!assignError.message.includes('duplicate')) {
        return NextResponse.json(
          { error: { code: 'DB_ERROR', message: '에이전트 배치 실패' } },
          { status: 500 },
        )
      }
    }

    // hire_count 증가
    await supabase.rpc('increment_agent_hire_count', {
      target_agent_id: transaction.agent_id,
    })

    return NextResponse.json({
      data: {
        paymentId,
        status: 'confirmed',
        txHash,
        assigned: true,
      },
    })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
