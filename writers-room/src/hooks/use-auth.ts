'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const { address, isConnected } = useAccount()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  // Supabase 세션 확인
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  // 지갑 연결 시 자동 인증
  const signInWithWallet = useCallback(async () => {
    if (!address) return

    try {
      setIsLoading(true)
      const res = await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      })

      if (!res.ok) throw new Error('Auth failed')

      const { token_hash } = await res.json()

      if (token_hash) {
        const { error } = await supabase.auth.verifyOtp({
          type: 'magiclink',
          token_hash,
        })
        if (error) throw error
      }
    } catch (err) {
      console.error('Wallet auth error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [address, supabase.auth])

  // 지갑 연결 상태 변화 감지 — 이전 주소를 추적하여 변경 시에만 인증
  const prevAddressRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (isConnected && address && address !== prevAddressRef.current && !user) {
      prevAddressRef.current = address
      signInWithWallet()
    }
    if (!isConnected) {
      prevAddressRef.current = undefined
    }
  }, [isConnected, address, user, signInWithWallet])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [supabase.auth])

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    signInWithWallet,
    signOut,
  }
}
