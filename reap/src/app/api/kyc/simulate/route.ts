// Sandbox only: approve the caller's KYC application. In production the user
// completes Reap's managed KYC flow (POST /users/{id}/application) instead.

import { requireUser } from '@/features/reap/cardholder'
import { simulateKycApproval } from '@/features/reap/client'
import { authenticateRequest, errorResponse } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { user } = await authenticateRequest(req)
    await simulateKycApproval((await requireUser(user)).id)
    return new Response(null, { status: 204 })
  } catch (err) {
    return errorResponse(err)
  }
}
