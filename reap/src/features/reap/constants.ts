import { base, baseSepolia } from 'wagmi/chains'

/**
 * The stablecoin Reap credits on each chain this recipe runs on. The sandbox
 * only accepts Reap's own test token, RUSDC, which Reap sends on request.
 * The same address is RUSDT on Ethereum Sepolia, so always key by chain.
 */
export const DEPOSIT_TOKEN: Record<number, { address: `0x${string}`; symbol: string; reapChainId: string }> = {
  [baseSepolia.id]: {
    address: '0xeB9Cb47c97ecff4875a1f29A8345818BC0eDc30E',
    symbol: 'RUSDC',
    reapChainId: 'BASE_SEPOLIA',
  },
  [base.id]: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', reapChainId: 'BASE_MAINNET' },
}

export const TOKEN_DECIMALS = 6

/** Reap rejects deposits below 0.50 USD as dust. */
export const MIN_DEPOSIT = 0.5

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
