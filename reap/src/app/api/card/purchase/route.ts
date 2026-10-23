// Sandbox only: swipe the caller's card at a pretend merchant. Reap authorizes
// it against the account balance the wallet funded.

import { requireCard } from '@/features/reap/cardholder'
import { ReapError, simulatePurchase } from '@/features/reap/client'
import { authenticateRequest, errorResponse } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { user } = await authenticateRequest(req)
    const { amount, merchant } = (await req.json()) as { amount: string; merchant?: string }
    if (!/^\d+(\.\d{1,2})?$/.test(amount ?? '') || Number(amount) <= 0)
      throw new ReapError('Enter an amount like 5 or 5.25', 400)

    const card = await requireCard(user)
    const tx = await simulatePurchase({ cardId: card.id, amount: Number(amount), merchant: merchant || 'Coffee Shop' })
    return Response.json(tx)
  } catch (err) {
    return errorResponse(err)
  }
}
