import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base, baseSepolia } from 'viem/chains'
import {
  CONTRIBUTION_CONTRACT_ABI,
  getContributionContractAddress,
  isOnchainEnabled,
} from './contracts'

const chainId = parseInt(process.env.NEXT_PUBLIC_BASE_CHAIN_ID ?? '8453', 10)
const chain = chainId === 84532 ? baseSepolia : base

function getSignerAccount() {
  const key = process.env.ONCHAIN_SIGNER_PRIVATE_KEY
  if (!key) return null
  return privateKeyToAccount(key as `0x${string}`)
}

const publicClient = createPublicClient({
  chain,
  transport: http(),
})

/**
 * 기여 기록을 온체인에 기록 (fire-and-forget)
 * - DB insert 이후 비동기로 호출
 * - 실패해도 DB 기록은 유지됨
 */
export async function recordOnchain(params: {
  contributionId: string
  contributorWallet: string
  contributionType: string
  storyId: string | null
}): Promise<{ txHash: string } | null> {
  if (!isOnchainEnabled()) return null

  const account = getSignerAccount()
  if (!account) {
    console.warn('[onchain] ONCHAIN_SIGNER_PRIVATE_KEY not set, skipping onchain recording')
    return null
  }

  const contractAddress = getContributionContractAddress()
  if (!contractAddress) return null

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  })

  try {
    // UUID → bytes32 (앞 0x 제거 후 패딩)
    const contributionIdBytes = uuidToBytes32(params.contributionId)
    const storyIdBytes = params.storyId
      ? uuidToBytes32(params.storyId)
      : (('0x' + '0'.repeat(64)) as `0x${string}`)

    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: CONTRIBUTION_CONTRACT_ABI,
      functionName: 'recordContribution',
      args: [
        contributionIdBytes,
        params.contributorWallet as `0x${string}`,
        params.contributionType,
        storyIdBytes,
      ],
    })

    // 트랜잭션 확인 대기 (최대 30초)
    await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 30_000,
    })

    return { txHash }
  } catch (err) {
    console.error('[onchain] Contract call failed:', err)
    return null
  }
}

/** UUID string → bytes32 hex */
function uuidToBytes32(uuid: string): `0x${string}` {
  const hex = uuid.replace(/-/g, '')
  return `0x${hex.padEnd(64, '0')}` as `0x${string}`
}
