// The signed-in user's card state: Reap user (created on first call), KYC
// status, account and deposit address, card and spendable balance.
// Answers 409 until it has a name and phone number for the cardholder.

import { type CardholderDetails, stateFor } from '@/features/reap/cardholder'
import { ReapError } from '@/features/reap/client'
import { DEPOSIT_TOKEN } from '@/features/reap/constants'
import { authenticateRequest, errorResponse } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { user } = await authenticateRequest(req)
    const { chainId, ...details } = (await req.json()) as CardholderDetails & { chainId: number }
    const token = DEPOSIT_TOKEN[chainId]
    if (!token) throw new ReapError(`Reap deposits are not configured for chain ${chainId}`, 400)
    return Response.json(await stateFor(user, token.reapChainId, details))
  } catch (err) {
    return errorResponse(err)
  }
}
