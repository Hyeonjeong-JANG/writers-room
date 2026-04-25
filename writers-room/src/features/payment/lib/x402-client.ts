import { createPublicClient, http } from 'viem'
import { base, baseSepolia } from 'viem/chains'

const chainId = parseInt(process.env.NEXT_PUBLIC_BASE_CHAIN_ID ?? '8453', 10)

const chain = chainId === 84532 ? baseSepolia : base

// Server-side public client for tx verification
export const publicClient = createPublicClient({
  chain,
  transport: http(),
})

/**
 * Verify a transaction on-chain
 * - Checks the tx exists and is confirmed
 * - Returns the transaction receipt
 */
export async function verifyTransaction(txHash: `0x${string}`) {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash })
    return {
      confirmed: receipt.status === 'success',
      blockNumber: receipt.blockNumber,
      from: receipt.from,
      to: receipt.to,
    }
  } catch {
    return { confirmed: false, blockNumber: null, from: null, to: null }
  }
}

/**
 * Wait for transaction confirmation with timeout
 */
export async function waitForTransaction(txHash: `0x${string}`, timeoutMs = 60_000) {
  try {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: timeoutMs,
    })
    return {
      confirmed: receipt.status === 'success',
      blockNumber: receipt.blockNumber,
    }
  } catch {
    return { confirmed: false, blockNumber: null }
  }
}
