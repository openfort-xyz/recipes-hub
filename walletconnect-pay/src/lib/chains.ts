import { arbitrum, base, mainnet, optimism, polygon } from 'viem/chains'

// WalletConnect Pay settles in stablecoins on EVM mainnets. These are the chains we
// advertise to the gateway as eligible source accounts for the connected wallet.
export const SUPPORTED_CHAINS = [base, mainnet, polygon, arbitrum, optimism] as const

// Build the CAIP-10 accounts array WalletConnect Pay expects: one `eip155:<chainId>:<address>`
// entry per supported chain. The gateway picks which chain to charge based on balances.
export function buildAccounts(address: string): string[] {
  return SUPPORTED_CHAINS.map((chain) => `eip155:${chain.id}:${address}`)
}

// Parse the numeric chain id out of a CAIP-2 reference like "eip155:8453".
export function chainIdFromCaip2(reference: string): number {
  const id = Number(reference.split(':').at(-1))
  if (!Number.isInteger(id)) {
    throw new Error(`Unsupported chain reference from WalletConnect Pay: ${reference}`)
  }
  return id
}
