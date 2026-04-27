import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { type SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { verifyTransaction } from '@/features/payment/lib/x402-client'
import { USDC_ADDRESSES } from '@/features/payment/lib/constants'

// 크레딧 팩 정의: USDC 가격 → 크레딧 수
const CREDIT_PACKS = {
  small: { credits: 50, priceUsdc: 1.0 },
  medium: { credits: 150, priceUsdc: 2.5 },
  large: { credits: 500, priceUsdc: 7.0 },
} as const

type PackId = keyof typeof CREDIT_PACKS

const InitiateCreditPurchaseSchema = z.object({
  pack: z.enum(['small', 'medium', 'large']),
})

const ConfirmCreditPurchaseSchema = z.object({
  paymentId: z.string().uuid('유효한 결제 ID가 필요합니다'),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, '유효한 트랜잭션 해시가 필요합니다'),
})

// GET /api/credits/purchase - 크레딧 팩 목록 조회
export async function GET() {
  const packs = Object.entries(CREDIT_PACKS).map(([id, pack]) => ({
    id,
    credits: pack.credits,
    priceUsdc: pack.priceUsdc,
  }))
  return NextResponse.json({ data: packs })
}

// POST /api/credits/purchase - 크레딧 구매 시작 또는 확인
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

    // txHash가 있으면 confirm, 없으면 initiate
    if ('txHash' in body) {
      return handleConfirm(supabase, user.id, body)
    }
    return handleInitiate(supabase, user.id, body)
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}

async function handleInitiate(supabase: SupabaseClient, userId: string, body: unknown) {
  const parsed = InitiateCreditPurchaseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '유효한 팩을 선택하세요' } },
      { status: 400 },
    )
  }

  const pack = CREDIT_PACKS[parsed.data.pack as PackId]
  const platformWallet = process.env.PLATFORM_WALLET_ADDRESS

  if (!platformWallet) {
    return NextResponse.json(
      { error: { code: 'CONFIG_ERROR', message: '플랫폼 지갑 미설정' } },
      { status: 500 },
    )
  }

  // 크레딧 구매 트랜잭션 생성
  const { data: transaction, error: insertError } = await supabase
    .from('transactions')
    .insert({
      payer_id: userId,
      payee_id: userId, // 자신에게 크레딧 충전
      agent_id: null,
      story_id: null,
      amount_usdc: pack.priceUsdc,
      platform_fee: 0,
      status: 'pending',
      metadata: { type: 'credit_purchase', pack: parsed.data.pack, credits: pack.credits },
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
      amount: pack.priceUsdc,
      credits: pack.credits,
      token: 'USDC',
      tokenAddress: usdcAddress,
      recipient: platformWallet,
      chainId,
    },
  })
}

async function handleConfirm(supabase: SupabaseClient, userId: string, body: unknown) {
  const parsed = ConfirmCreditPurchaseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '입력값을 확인하세요' } },
      { status: 400 },
    )
  }

  const { paymentId, txHash } = parsed.data

  // pending 트랜잭션 조회
  const { data: transaction } = await supabase
    .from('transactions')
    .select('id, payer_id, status, metadata')
    .eq('id', paymentId)
    .single()

  if (!transaction) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '결제 정보를 찾을 수 없습니다' } },
      { status: 404 },
    )
  }

  if (transaction.payer_id !== userId) {
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
  await supabase
    .from('transactions')
    .update({
      tx_hash: txHash,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', paymentId)

  // 유료 크레딧 추가
  const creditsToAdd = (transaction.metadata as { credits: number })?.credits ?? 50
  const { data: result } = await supabase.rpc('add_paid_credits', {
    p_user_id: userId,
    p_amount: creditsToAdd,
  })

  return NextResponse.json({
    data: {
      paymentId,
      status: 'confirmed',
      txHash,
      creditsAdded: creditsToAdd,
      paidCredits: result?.paid_credits ?? null,
    },
  })
}
