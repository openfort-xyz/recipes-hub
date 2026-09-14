// Start identity verification.
//
// Bridge creates the customer record itself, once the hosted flow is approved —
// there is no "create customer" call to make first.

import { createKycLink } from '@/features/bridge/client'
import { authenticateRequest, errorResponse } from '@/lib/auth'
import { getRecord, updateRecord } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { user } = await authenticateRequest(req)
    const body = (await req.json()) as { fullName?: string; sepa?: boolean }

    // The email comes from the verified session, never from the request body:
    // it is what Bridge runs KYC against.
    const email = user.email
    if (!email) {
      return Response.json({ error: 'This Openfort account has no email to verify against' }, { status: 400 })
    }
    const fullName = body.fullName?.trim()
    if (!fullName) {
      return Response.json({ error: 'Full name is required' }, { status: 400 })
    }

    const existing = await getRecord(user.id)
    if (existing.bridgeCustomerId) {
      return Response.json({ error: 'This user is already verified' }, { status: 409 })
    }

    const link = await createKycLink({
      fullName,
      email,
      userId: user.id,
      redirectUri: req.headers.get('origin') ?? undefined,
      // Non-EEA customers need proof of address before SEPA payouts.
      endorsements: body.sepa ? ['sepa'] : undefined,
    })

    await updateRecord(user.id, (r) => ({
      ...r,
      kycLinkId: link.id,
      bridgeCustomerId: link.customer_id ?? r.bridgeCustomerId,
    }))

    return Response.json({
      kycLinkId: link.id,
      kycUrl: link.kyc_link,
      tosUrl: link.tos_link,
      kycStatus: link.kyc_status,
    })
  } catch (err) {
    return errorResponse(err)
  }
}
