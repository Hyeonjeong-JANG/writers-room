import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const WalletAuthSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
})

// Service role client for admin operations
function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = WalletAuthSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }

    const { walletAddress } = parsed.data
    const normalizedAddress = walletAddress.toLowerCase()
    const adminClient = getAdminClient()

    // 이메일 형태로 변환 (Supabase Auth는 이메일 기반)
    const email = `${normalizedAddress}@wallet.writersroom.xyz`

    // 기존 유저 조회
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = existingUsers?.users.find((u) => u.email === email)

    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      // 새 유저 생성
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { wallet_address: normalizedAddress },
      })

      if (createError || !newUser.user) {
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }

      userId = newUser.user.id

      // users 테이블에 프로필 생성
      await adminClient.from('users').insert({
        id: userId,
        wallet_address: normalizedAddress,
        display_name: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
      })
    }

    // 매직 링크 대신 직접 세션 생성
    const { data: session, error: sessionError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Failed to generate session' }, { status: 500 })
    }

    return NextResponse.json({
      token_hash: session.properties?.hashed_token,
      user_id: userId,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
