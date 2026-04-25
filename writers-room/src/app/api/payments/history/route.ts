import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PaymentHistoryQuerySchema } from '@/features/payment/lib/schemas'

// GET /api/payments/history - 결제 내역 조회
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const parsed = PaymentHistoryQuerySchema.safeParse({
      type: searchParams.get('type') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    })

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

    const { type, page, limit } = parsed.data
    const offset = (page - 1) * limit

    // 기본 쿼리: 본인 관련 트랜잭션
    let query = supabase
      .from('transactions')
      .select(
        `
        *,
        payer:users!transactions_payer_id_fkey(id, display_name, wallet_address),
        payee:users!transactions_payee_id_fkey(id, display_name, wallet_address),
        agent:agents!transactions_agent_id_fkey(id, name, role)
      `,
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 타입 필터
    if (type === 'paid') {
      query = query.eq('payer_id', user.id)
    } else if (type === 'received') {
      query = query.eq('payee_id', user.id)
    } else {
      query = query.or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`)
    }

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({
      data: data ?? [],
      meta: {
        page,
        limit,
        total: count ?? 0,
      },
    })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
