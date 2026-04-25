// USDC Contract Addresses on Base
export const USDC_ADDRESSES = {
  // Base Mainnet
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const,
  // Base Sepolia Testnet
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const,
}

// USDC has 6 decimals
export const USDC_DECIMALS = 6

// Minimal ERC-20 ABI for transfer
export const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

// Chain ID to use (from env or default)
export function getChainId(): number {
  return parseInt(process.env.NEXT_PUBLIC_BASE_CHAIN_ID ?? '8453', 10)
}

// Convert USDC amount (e.g. 1.50) to on-chain units (1500000)
export function toUsdcUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** USDC_DECIMALS))
}

// Convert on-chain USDC units to display amount
export function fromUsdcUnits(units: bigint): number {
  return Number(units) / 10 ** USDC_DECIMALS
}
