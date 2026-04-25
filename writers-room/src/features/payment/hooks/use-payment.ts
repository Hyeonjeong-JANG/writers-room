'use client'

import { useCallback, useState } from 'react'
import { useWriteContract } from 'wagmi'
import { ERC20_TRANSFER_ABI, USDC_ADDRESSES, toUsdcUnits } from '../lib/constants'

interface PaymentDetails {
  paymentId: string
  amount: number
  platformFee: number
  netAmount: number
  token: string
  tokenAddress: string
  recipient: string
  chainId: number
}

export function usePayment() {
  const [isInitiating, setIsInitiating] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)

  const { writeContractAsync } = useWriteContract()

  // Step 1: 결제 시작 (서버에 pending 레코드 생성)
  const initiatePayment = useCallback(async (agentId: string, storyId: string) => {
    setIsInitiating(true)
    setError(null)
    try {
      const res = await fetch('/api/payments/x402/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, storyId }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error?.message ?? '결제 시작 실패')
      }
      const { data } = await res.json()
      setPaymentDetails(data as PaymentDetails)
      return data as PaymentDetails
    } catch (err) {
      const msg = err instanceof Error ? err.message : '결제 시작 실패'
      setError(msg)
      return null
    } finally {
      setIsInitiating(false)
    }
  }, [])

  // Step 2: USDC 전송 (Smart Wallet 서명)
  const executeTransfer = useCallback(
    async (details: PaymentDetails) => {
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

  // Step 3: 결제 확인 (서버에 tx_hash 전달)
  const confirmPayment = useCallback(async (paymentId: string, txHash: string) => {
    setIsConfirming(true)
    setError(null)
    try {
      const res = await fetch('/api/payments/x402/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, txHash }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error?.message ?? '결제 확인 실패')
      }
      const { data } = await res.json()
      return data as { paymentId: string; status: string; txHash: string; assigned: boolean }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '결제 확인 실패'
      setError(msg)
      return null
    } finally {
      setIsConfirming(false)
    }
  }, [])

  const reset = useCallback(() => {
    setError(null)
    setPaymentDetails(null)
  }, [])

  return {
    initiatePayment,
    executeTransfer,
    confirmPayment,
    paymentDetails,
    isInitiating,
    isConfirming,
    error,
    reset,
  }
}

export function usePaymentHistory(type?: 'paid' | 'received') {
  const [isLoading, setIsLoading] = useState(false)

  // SWR 대신 간단한 fetch로 구현
  const fetchHistory = useCallback(
    async (page = 1, limit = 20) => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        if (type) params.set('type', type)
        params.set('page', String(page))
        params.set('limit', String(limit))

        const res = await fetch(`/api/payments/history?${params}`)
        if (!res.ok) throw new Error('내역 조회 실패')
        return await res.json()
      } finally {
        setIsLoading(false)
      }
    },
    [type],
  )

  return { fetchHistory, isLoading }
}
