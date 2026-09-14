import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const EXPLORERS: Record<number, string> = {
  8453: 'https://basescan.org/tx/',
  84532: 'https://sepolia.basescan.org/tx/',
}

export const getExplorerUrl = (txHash: string, chainId?: number): string | null => {
  if (!chainId) return null
  const base = EXPLORERS[chainId]
  return base ? `${base}${txHash}` : null
}
