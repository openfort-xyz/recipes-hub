import { NextResponse } from 'next/server'
import { guarded } from '@/lib/api'
import { quote } from '@/lib/blend'
import { parseUsdcAmount } from '@/lib/validate'

export function POST(request: Request) {
  return guarded(request, async () => {
    const { type, amount, max } = await request.json().catch(() => ({}))
    const isMax = type === 'withdraw' && max === true
    const units = isMax ? '0' : parseUsdcAmount(amount)
    if ((type !== 'deposit' && type !== 'withdraw') || !units) {
      return NextResponse.json(
        { error: 'Body must be { type: "deposit" | "withdraw", amount: "<USDC>" } or { type: "withdraw", max: true }' },
        { status: 400 }
      )
    }
    return quote(type === 'deposit' ? { type } : { type, max: isMax }, units)
  })
}
