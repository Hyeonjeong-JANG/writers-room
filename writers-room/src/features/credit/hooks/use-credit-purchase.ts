'use client'

import { useCallback, useState } from 'react'
import { useWriteContract } from 'wagmi'
import { ERC20_TRANSFER_ABI, USDC_ADDRESSES, toUsdcUnits } from '@/features/payment/lib/constants'

export interface CreditPack {
  id: string
  credits: number
  priceUsdc: number
}

interface PurchaseDetails {
  paymentId: string
  amount: number
  credits: number
  token: string
  tokenAddress: string
  recipient: string
  chainId: number
}

export function useCreditPurchase() {
  const [isInitiating, setIsInitiating] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { writeContractAsync } = useWriteContract()

  // 팩 목록 가져오기
  const fetchPacks = useCallback(async (): Promise<CreditPack[] | null> => {
    try {
      const res = await fetch('/api/credits/purchase')
      if (!res.ok) throw new Error('팩 목록 조회 실패')
      const { data } = await res.json()
      return data as CreditPack[]
    } catch (err) {
      const msg = err instanceof Error ? err.message : '팩 목록 조회 실패'
      setError(msg)
      return null
    }
  }, [])

  // Step 1: 구매 시작 (서버에 pending 레코드 생성)
  const initiatePurchase = useCallback(async (pack: string) => {
    setIsInitiating(true)
    setError(null)
    try {
      const res = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error?.message ?? '구매 시작 실패')
      }
      const { data } = await res.json()
      return data as PurchaseDetails
    } catch (err) {
      const msg = err instanceof Error ? err.message : '구매 시작 실패'
      setError(msg)
      return null
    } finally {
      setIsInitiating(false)
    }
  }, [])

  // Step 2: USDC 전송 (Smart Wallet 서명)
  const executeTransfer = useCallback(
    async (details: PurchaseDetails) => {
      setError(null)
      try {
        const chainId = details.chainId as keyof typeof USDC_ADDRESSES
        const usdcAddress = USDC_ADDRESSES[chainId]
        if (!usdcAddress) throw new Error('지원하지 않는 체인입니다')

        const txHash = await writeContractAsync({
          address: usdcAddress,
          abi: ERC20_TRANSFER_ABI,
          functionName: 'transfer',
          args: [details.recipient as `0x${string}`, toUsdcUnits(details.amount)],
          chainId: details.chainId as 8453 | 84532,
        })

        return txHash
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'USDC 전송 실패'
        setError(msg)
        return null
      }
    },
    [writeContractAsync],
  )

  // Step 3: 구매 확인 (서버에 tx_hash 전달 → 크레딧 추가)
  const confirmPurchase = useCallback(async (paymentId: string, txHash: string) => {
    setIsConfirming(true)
    setError(null)
    try {
      const res = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, txHash }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error?.message ?? '구매 확인 실패')
      }
      const { data } = await res.json()
      return data as { paymentId: string; status: string; txHash: string; creditsAdded: number }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '구매 확인 실패'
      setError(msg)
      return null
    } finally {
      setIsConfirming(false)
    }
  }, [])

  const reset = useCallback(() => {
    setError(null)
  }, [])

  return {
    fetchPacks,
    initiatePurchase,
    executeTransfer,
    confirmPurchase,
    isInitiating,
    isConfirming,
    error,
    reset,
  }
}
