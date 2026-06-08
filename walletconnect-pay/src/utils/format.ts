import type { PayAmount } from '@walletconnect/pay'
import { formatUnits } from 'viem'

// Render a WalletConnect Pay amount (smallest-unit integer string + decimals) as a
// human-readable "12.50 USDC" label.
export function formatAmount(amount: PayAmount): string {
  const { value, display } = amount
  try {
    const human = formatUnits(BigInt(value), display.decimals)
    return `${human} ${display.assetSymbol}`
  } catch {
    return `${value} ${display.assetSymbol}`
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unexpected error'
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}
