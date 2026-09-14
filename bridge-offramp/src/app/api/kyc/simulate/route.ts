// Sandbox shortcut: push a customer straight to `approved`.
//
// Only reachable once the hosted flow has produced a customer id — Bridge
// creates the customer record on approval of the KYC link, so there is nothing
// to approve before then.

import { isSandbox, simulateKycApproval } from '@/features/bridge/client'
import { authenticateRequest, errorResponse } from '@/lib/auth'
import { getRecord } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { user } = await authenticateRequest(req)
    if (!isSandbox()) {
      return Response.json({ error: 'Not available outside sandbox' }, { status: 400 })
    }

    const record = await getRecord(user.id)
    if (!record.bridgeCustomerId) {
      return Response.json(
        { error: 'Complete the hosted KYC flow first — the customer record is created when the link is approved.' },
        { status: 409 }
      )
    }

    await simulateKycApproval(record.bridgeCustomerId)
    return Response.json({ kycStatus: 'approved' })
  } catch (err) {
    return errorResponse(err)
  }
}
