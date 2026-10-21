import { polygon, polygonAmoy } from 'wagmi/chains'

/**
 * The stablecoin Reap credits on each chain this recipe runs on. The sandbox
 * only accepts Reap's own test token, RUSDC, which Reap sends on request.
 * Token addresses are only meaningful per chain, so always key by chain.
 */
export const DEPOSIT_TOKEN: Record<number, { address: `0x${string}`; symbol: string; reapChainId: string }> = {
  [polygonAmoy.id]: {
    address: '0x00D4e14024d8AbC6D6D35708b5bEC65B2f28e6E3',
    symbol: 'RUSDC',
    reapChainId: 'POLYGON_AMOY',
  },
  [polygon.id]: { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', symbol: 'USDC', reapChainId: 'POLYGON_MAINNET' },
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
  [polygon.id]: 'Polygon',
  [polygonAmoy.id]: 'Polygon Amoy',
}
