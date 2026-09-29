// Sandbox only: tell Grid the quote's funding payment arrived. In production
// Grid sees the bank transfer or the on-chain deposit by itself.

import { simulateFunding } from '@/features/grid/client'
import { customerFor, ownedQuote } from '@/features/grid/customer'
import { authenticateRequest, errorResponse } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await authenticateRequest(req)
    const customer = await customerFor(user)
    const quote = await ownedQuote((await params).id, customer.id)
    return Response.json(await simulateFunding(quote))
  } catch (err) {
    return errorResponse(err)
  }
}
