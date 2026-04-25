'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, Wallet, ArrowRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePayment } from '../hooks/use-payment'

type PaymentStep = 'confirm' | 'signing' | 'verifying' | 'success' | 'error'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  agentId: string
  agentName: string
  storyId: string
  amount: number
}

export function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  agentId,
  agentName,
  storyId,
  amount,
}: PaymentModalProps) {
  const [step, setStep] = useState<PaymentStep>('confirm')
  const [txHash, setTxHash] = useState<string | null>(null)
  const { initiatePayment, executeTransfer, confirmPayment, error, reset } = usePayment()

  const platformFee = Math.round(amount * 0.1 * 100) / 100
  const netAmount = Math.round((amount - platformFee) * 100) / 100

  const handlePayment = async () => {
    // Step 1: 서버에 결제 생성
    setStep('signing')
    const details = await initiatePayment(agentId, storyId)
    if (!details) {
      setStep('error')
      return
    }

    // Step 2: Smart Wallet 서명 (USDC 전송)
    const hash = await executeTransfer(details)
    if (!hash) {
      setStep('error')
      return
    }
    setTxHash(hash)

    // Step 3: 서버에 결제 확인
    setStep('verifying')
    const result = await confirmPayment(details.paymentId, hash)
    if (!result) {
      setStep('error')
      return
    }

    setStep('success')
    toast.success('결제 완료! 에이전트가 배치되었습니다')
  }

  const handleClose = () => {
    if (step === 'signing' || step === 'verifying') return // 진행 중 닫기 방지
    setStep('confirm')
    setTxHash(null)
    reset()
    onClose()
    if (step === 'success') onSuccess()
  }

  const chainId = parseInt(process.env.NEXT_PUBLIC_BASE_CHAIN_ID ?? '8453', 10)
  const explorerBase = chainId === 84532 ? 'https://sepolia.basescan.org' : 'https://basescan.org'

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>에이전트 고용 결제</DialogTitle>
          <DialogDescription>USDC로 에이전트를 고용합니다</DialogDescription>
        </DialogHeader>

        {/* Step: 결제 확인 */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">에이전트</span>
                <span className="font-medium">{agentName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">고용 비용</span>
                <span className="text-lg font-bold">${amount} USDC</span>
              </div>
              <div className="space-y-1 border-t pt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">에이전트 빌더 수령</span>
                  <span>${netAmount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">플랫폼 수수료 (10%)</span>
                  <span>${platformFee}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Wallet className="h-4 w-4 shrink-0" />
              <span>Smart Wallet에서 USDC 전송이 진행됩니다</span>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                취소
              </Button>
              <Button className="flex-1" onClick={handlePayment}>
                결제하기
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: 서명 중 */}
        {step === 'signing' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            <div className="text-center">
              <p className="font-medium">지갑 서명 대기 중...</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Smart Wallet에서 트랜잭션을 승인하세요
              </p>
            </div>
          </div>
        )}

        {/* Step: 검증 중 */}
        {step === 'verifying' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
            <div className="text-center">
              <p className="font-medium">온체인 확인 중...</p>
              <p className="text-muted-foreground mt-1 text-sm">
                트랜잭션이 블록에 포함되고 있습니다
              </p>
            </div>
          </div>
        )}

        {/* Step: 성공 */}
        {step === 'success' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div className="text-center">
              <p className="text-lg font-medium">결제 완료!</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {agentName}이(가) 스토리에 배치되었습니다
              </p>
            </div>
            {txHash && (
              <a
                href={`${explorerBase}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 hover:underline"
              >
                트랜잭션 확인 →
              </a>
            )}
            <Button onClick={handleClose} className="mt-2 w-full">
              확인
            </Button>
          </div>
        )}

        {/* Step: 에러 */}
        {step === 'error' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <XCircle className="h-12 w-12 text-red-500" />
            <div className="text-center">
              <p className="text-lg font-medium">결제 실패</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {error ?? '알 수 없는 오류가 발생했습니다'}
              </p>
            </div>
            <div className="flex w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                닫기
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setStep('confirm')
                  reset()
                }}
              >
                다시 시도
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
