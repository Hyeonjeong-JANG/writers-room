import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ContributionsQuerySchema } from '@/features/onchain/lib/schemas'

// GET /api/onchain/contributions/[userId] - 유저 기여 히스토리 (공개, 페이지네이션)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params
    const { searchParams } = new URL(request.url)
    const parsed = ContributionsQuerySchema.safeParse(Object.fromEntries(searchParams))

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: '잘못된 쿼리 파라미터',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      )
    }

    const { page, limit, type } = parsed.data
    const offset = (page - 1) * limit
    const supabase = await createClient()

    let query = supabase
      .from('contributions')
      .select('*, story:stories(id, title)', { count: 'exact' })
      .eq('user_id', userId)

    if (type) query = query.eq('contribution_type', type)

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({ data, meta: { page, limit, total: count ?? 0 } })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
