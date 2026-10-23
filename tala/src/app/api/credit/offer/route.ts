// GET: the user's credit offer, or { status: 'not_enrolled' } before opt-in.
// POST: the fee breakdown and due date for an amount and duration in the offer.

import { getOffer, getTerms, TalaError } from '@/features/tala/client'
import { authenticateRequest, errorResponse } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { user } = await authenticateRequest(req)
    return Response.json(await getOffer(user.id))
  } catch (err) {
    if (err instanceof TalaError && err.status === 404) return Response.json({ status: 'not_enrolled' })
    return errorResponse(err)
  }
}

export async function POST(req: Request) {
  try {
    const { user } = await authenticateRequest(req)
    const { amount, duration } = (await req.json()) as { amount: number; duration: number }
    if (!(amount > 0) || !Number.isInteger(duration)) throw new TalaError('Pick an amount and a duration', 400)
    return Response.json(await getTerms(user.id, amount, duration))
  } catch (err) {
    return errorResponse(err)
  }
}
