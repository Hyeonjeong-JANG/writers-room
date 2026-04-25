import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WalletAddressSchema } from '@/features/onchain/lib/schemas'
import { getWalletAnalysis } from '@/features/onchain/lib/nansen-client'

// GET /api/nansen/wallet/[address] - 지갑 분석 (인증 필요)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await params
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

    const result = WalletAddressSchema.safeParse(address)
    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: '유효한 지갑 주소가 필요합니다',
          },
        },
        { status: 400 },
      )
    }

    const data = await getWalletAnalysis(result.data)

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
