import { getAddress } from 'viem'

/** The supplier's payout address on Monad (Shenzhen Supply Co). */
export const SUPPLIER_ADDRESS = getAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18')

export interface Invoice {
  id: string
  number: number
  amount: string
  dueDate: string
  recipient: string
  status: 'open' | 'paying' | 'paid'
  txHash?: string
  private?: boolean
}

let counter = 0

export function generateInvoice(): Invoice {
  counter++
  const suffix = Math.random().toString(36).substring(2, 10)
  const amount = (5 + Math.random() * 95).toFixed(2)
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  return {
    id: `INV-${String(counter).padStart(4, '0')}-${suffix}`,
    number: counter,
    amount,
    dueDate: dueDate.toISOString().split('T')[0] ?? '',
    recipient: SUPPLIER_ADDRESS,
    status: 'open',
  }
}
