// A single-use, 5-minute URL that shows the card's PAN, CVV and expiry. The
// browser loads it in an iframe, so card details never pass through this app.

import { requireCard } from '@/features/reap/cardholder'
import { revealCard } from '@/features/reap/client'
import { authenticateRequest, errorResponse } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { user } = await authenticateRequest(req)
    return Response.json(await revealCard((await requireCard(user)).id))
  } catch (err) {
    return errorResponse(err)
  }
}
