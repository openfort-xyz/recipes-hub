// Where a quote's payment has got to. Polled by the UI instead of receiving
// webhooks, so the recipe runs locally without a public URL.

import { getTransaction } from '@/features/grid/client'
import { customerFor, ownedQuote } from '@/features/grid/customer'
import { authenticateRequest, errorResponse } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await authenticateRequest(req)
    const customer = await customerFor(user)
    const quote = await ownedQuote((await params).id, customer.id)
    const tx = await getTransaction(quote.transactionId)
    return Response.json({
      quoteStatus: quote.status,
      status: tx.status,
      paymentRail: tx.paymentRail ?? null,
      settledAt: tx.settledAt ?? null,
      failureReason: tx.failureReason ?? null,
    })
  } catch (err) {
    return errorResponse(err)
  }
}
