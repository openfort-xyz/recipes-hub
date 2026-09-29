import { base, baseSepolia } from 'wagmi/chains'

/** USDC, the stablecoin this recipe moves in and out. */
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

export const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'REFUNDED', 'EXPIRED'])

/** Grid's sandbox test bank: any account number not ending in 001–003 settles. */
export const SANDBOX_BANK = {
  fullName: 'Alice Test',
  birthDate: '1990-01-15',
  bankName: 'Chase Bank',
  routingNumber: '021000021',
  accountNumber: '123456789000',
  bankAccountType: 'CHECKING',
  address: { line1: '123 Main Street', city: 'San Francisco', state: 'CA', postalCode: '94105', country: 'US' },
} as const
