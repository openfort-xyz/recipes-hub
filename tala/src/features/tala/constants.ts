import { base, baseSepolia } from 'wagmi/chains'

/** USDC: Tala disburses it to the wallet and the wallet repays in it. */
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

/** Tala requires E.164: a leading + then 10 to 15 digits. */
export const PHONE_REGEX = /^\+\d{10,15}$/
