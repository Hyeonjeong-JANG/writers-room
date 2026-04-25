// WritersRoomContribution ABI (minimal for recording)
export const CONTRIBUTION_CONTRACT_ABI = [
  {
    name: 'recordContribution',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'contributionId', type: 'bytes32' },
      { name: 'contributor', type: 'address' },
      { name: 'contributionType', type: 'string' },
      { name: 'storyId', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const

// AgentReputation ABI (minimal for reading/writing)
export const REPUTATION_CONTRACT_ABI = [
  {
    name: 'updateReputation',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'bytes32' },
      { name: 'overallScore', type: 'uint256' },
      { name: 'trustTier', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'getReputation',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [
      { name: 'overallScore', type: 'uint256' },
      { name: 'trustTier', type: 'string' },
      { name: 'updatedAt', type: 'uint256' },
    ],
  },
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const

// Contract addresses from env (undefined = onchain disabled)
export function getContributionContractAddress(): `0x${string}` | undefined {
  const addr = process.env.NEXT_PUBLIC_CONTRIBUTION_CONTRACT
  return addr ? (addr as `0x${string}`) : undefined
}

export function getReputationContractAddress(): `0x${string}` | undefined {
  const addr = process.env.NEXT_PUBLIC_REPUTATION_CONTRACT
  return addr ? (addr as `0x${string}`) : undefined
}

// Check if onchain recording is enabled
export function isOnchainEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_CONTRIBUTION_CONTRACT
}
