// The signed-in user's Bridge state, in one call.
//
// Also the only place KYC status is refreshed: the hosted flow finishes in a
// different tab, so the app has to ask Bridge rather than be told.

import { getKycLink, isSandbox } from '@/features/bridge/client'
import { authenticateRequest, errorResponse } from '@/lib/auth'
import { getRecord, updateRecord } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { user } = await authenticateRequest(req)
    let record = await getRecord(user.id)

    let kycStatus: string = record.bridgeCustomerId ? 'approved' : 'not_started'

    // A customer id only exists once Bridge approves the link, so an
    // unapproved link is the only thing worth re-reading.
    if (record.kycLinkId && !record.bridgeCustomerId) {
      const link = await getKycLink(record.kycLinkId)
      kycStatus = link.kyc_status
      if (link.customer_id) {
        record = await updateRecord(user.id, (r) => ({ ...r, bridgeCustomerId: link.customer_id }))
      }
    }

    return Response.json({
      environment: isSandbox() ? 'sandbox' : 'production',
      kycStatus,
      customerId: record.bridgeCustomerId ?? null,
      kycLinkId: record.kycLinkId ?? null,
      bankAccounts: record.bankAccounts,
      cashOutAddresses: record.cashOutAddresses,
    })
  } catch (err) {
    return errorResponse(err)
  }
}
