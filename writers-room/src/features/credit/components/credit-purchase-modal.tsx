'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, Wallet, ArrowRight, Zap } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useCreditPurchase, type CreditPack } from '../hooks/use-credit-purchase'
import { useCredits } from '../hooks/use-credits'

type PurchaseStep = 'select' | 'confirm' | 'signing' | 'verifying' | 'success' | 'error'

interface CreditPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreditPurchaseModal({ isOpen, onClose, onSuccess }: CreditPurchaseModalProps) {
  const [step, setStep] = useState<PurchaseStep>('select')
  const [packs, setPacks] = useState<CreditPack[]>([])
  const [selectedPack, setSelectedPack] = useState<CreditPack | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [creditsAdded, setCreditsAdded] = useState(0)

  const { fetchPacks, initiatePurchase, executeTransfer, confirmPurchase, error, reset } =
    useCreditPurchase()
  const { refreshCredits } = useCredits()

  // 모달 열릴 때 팩 목록 로드
  useEffect(() => {
    if (isOpen) {
      fetchPacks().then((data) => {
        if (data) setPacks(data)
      })
    }
  }, [isOpen, fetchPacks])

  const handleSelectPack = (pack: CreditPack) => {
    setSelectedPack(pack)
    setStep('confirm')
  }

  const handlePurchase = async () => {
    if (!selectedPack) return

    // Step 1: 서버에 구매 생성
    setStep('signing')
    const details = await initiatePurchase(selectedPack.id)
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

    // Step 3: 서버에 구매 확인
    setStep('verifying')
    const result = await confirmPurchase(details.paymentId, hash)
    if (!result) {
      setStep('error')
      return
    }

    setCreditsAdded(result.creditsAdded)
    setStep('success')
    refreshCredits()
    toast.success(`${result.creditsAdded} 크레딧이 충전되었습니다!`)
  }

  const handleClose = () => {
    if (step === 'signing' || step === 'verifying') return
    setStep('select')
    setSelectedPack(null)
    setTxHash(null)
    setCreditsAdded(0)
    reset()
    onClose()
    if (step === 'success') onSuccess?.()
  }

  const chainId = parseInt(process.env.NEXT_PUBLIC_BASE_CHAIN_ID ?? '8453', 10)
  const explorerBase = chainId === 84532 ? 'https://sepolia.basescan.org' : 'https://basescan.org'

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>크레딧 충전</DialogTitle>
          <DialogDescription>USDC로 크레딧을 충전하세요</DialogDescription>
        </DialogHeader>

        {/* Step: 팩 선택 */}
        {step === 'select' && (
          <div className="space-y-3">
            {packs.map((pack) => {
              const unitPrice = (pack.priceUsdc / pack.credits).toFixed(4)
              const isPopular = pack.id === 'medium'
              return (
                <button
                  key={pack.id}
                  onClick={() => handleSelectPack(pack)}
                  className={cn(
                    'relative w-full rounded-lg border p-4 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30',
                    isPopular && 'border-indigo-300 dark:border-indigo-700',
                  )}
                >
                  {isPopular && (
                    <Badge className="absolute -top-2 right-3 bg-indigo-500 text-white">인기</Badge>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                        <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="font-semibold">{pack.credits} 크레딧</p>
                        <p className="text-muted-foreground text-xs">크레딧당 ${unitPrice}</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold">${pack.priceUsdc} USDC</span>
                  </div>
                </button>
              )
            })}

            <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Wallet className="h-4 w-4 shrink-0" />
              <span>Smart Wallet에서 USDC로 결제됩니다</span>
            </div>
          </div>
        )}

        {/* Step: 확인 */}
        {step === 'confirm' && selectedPack && (
          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">충전 크레딧</span>
                <span className="flex items-center gap-1 font-medium">
                  <Zap className="h-4 w-4 text-indigo-500" />
                  {selectedPack.credits}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-muted-foreground text-sm">결제 금액</span>
                <span className="text-lg font-bold">${selectedPack.priceUsdc} USDC</span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Wallet className="h-4 w-4 shrink-0" />
              <span>Smart Wallet에서 USDC 전송이 진행됩니다</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setSelectedPack(null)
                  setStep('select')
                }}
              >
                뒤로
              </Button>
              <Button className="flex-1" onClick={handlePurchase}>
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
              <p className="text-lg font-medium">충전 완료!</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {creditsAdded} 크레딧이 추가되었습니다
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
            <div className="w-full text-center">
              <p className="text-lg font-medium">충전 실패</p>
              <p className="text-muted-foreground mt-1 line-clamp-3 text-sm break-words">
                {error?.split('\n')[0] ?? '알 수 없는 오류가 발생했습니다'}
              </p>
            </div>
            <div className="flex w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                닫기
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setStep('select')
                  setSelectedPack(null)
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
