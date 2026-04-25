import { z } from 'zod'

// ============================================
// Payment Schemas
// ============================================

export const InitiatePaymentSchema = z.object({
  agentId: z.string().uuid('유효한 에이전트 ID가 필요합니다'),
  storyId: z.string().uuid('유효한 스토리 ID가 필요합니다'),
})

export const ConfirmPaymentSchema = z.object({
  paymentId: z.string().uuid('유효한 결제 ID가 필요합니다'),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, '유효한 트랜잭션 해시가 필요합니다'),
})

export const PaymentHistoryQuerySchema = z.object({
  type: z.enum(['paid', 'received']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

// ============================================
// Types
// ============================================

export type InitiatePaymentInput = z.infer<typeof InitiatePaymentSchema>
export type ConfirmPaymentInput = z.infer<typeof ConfirmPaymentSchema>
export type PaymentHistoryQuery = z.infer<typeof PaymentHistoryQuerySchema>

export type TransactionStatus = 'pending' | 'confirmed' | 'failed'

export interface TransactionRow {
  id: string
  payer_id: string
  payee_id: string
  agent_id: string
  story_id: string
  amount_usdc: number
  platform_fee: number
  tx_hash: string | null
  status: TransactionStatus
  created_at: string
  confirmed_at: string | null
  payer?: {
    id: string
    display_name: string
    wallet_address: string
  }
  payee?: {
    id: string
    display_name: string
    wallet_address: string
  }
  agent?: {
    id: string
    name: string
    role: string
  }
}

export const PLATFORM_FEE_RATE = 0.1 // 10%
