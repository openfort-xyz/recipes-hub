import { base, baseSepolia } from 'wagmi/chains'

/** USDC, the only token this recipe cashes out. */
export const USDC_ADDRESS: Record<number, `0x${string}`> = {
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [baseSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
}

export const USDC_DECIMALS = 6

export const ERC20_ABI = [
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const

export const CHAIN_NAME: Record<number, string> = {
  [base.id]: 'Base',
  [baseSepolia.id]: 'Base Sepolia',
}

export const RAIL_LABEL: Record<string, string> = {
  ach: 'ACH',
  wire: 'Wire',
  sepa: 'SEPA',
}

/** How each drain state reads to someone waiting for their money. */
export const DRAIN_LABEL: Record<string, string> = {
  in_review: 'On hold for review',
  funds_received: 'USDC received, converting',
  payment_submitted: 'Payment sent to your bank',
  payment_processed: 'Arrived',
  undeliverable: 'Undeliverable — returned',
  returned: 'Returned to your wallet',
  error: 'Failed',
  canceled: 'Canceled',
}

export const TERMINAL_DRAIN_STATES = new Set(['payment_processed', 'undeliverable', 'returned', 'error', 'canceled'])
