// Open the Reap account with the user's Openfort wallet as its signer.
// GET hands out the message to sign; POST registers the signature.

import { requireUser } from '@/features/reap/cardholder'
import { createAccount, findAccount, getAuthMessage, ReapError } from '@/features/reap/client'
import { authenticateRequest, authorizeAddress, errorResponse } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    await authenticateRequest(req)
    return Response.json(await getAuthMessage())
  } catch (err) {
    return errorResponse(err)
  }
}

export async function POST(req: Request) {
  try {
    const { address, message, signature } = (await req.json()) as {
      address: string
      message: string
      signature: string
    }
    // The signer controls withdrawals, so it must be a wallet this user owns.
    const { user } = await authorizeAddress(req, address)
    const reapUser = await requireUser(user)
    if (reapUser.application.status !== 'APPROVED') throw new ReapError('KYC is not approved yet', 409)

    const existing = await findAccount(reapUser.id)
    if (existing) return Response.json({ id: existing.id })

    const account = await createAccount({ userId: reapUser.id, signer: { address, message, signature } })
    return Response.json({ id: account.id })
  } catch (err) {
    return errorResponse(err)
  }
}
