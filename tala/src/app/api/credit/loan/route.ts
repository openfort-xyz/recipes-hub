// GET: the user's current loan (null when none) plus where repayments go.
// POST: accept the quoted terms and have Tala pay the loan out to the wallet.

import {
  acceptOffer,
  currency,
  getLoan,
  getTerms,
  isMock,
  requestDisbursement,
  TalaError,
} from '@/features/tala/client'
import { authenticateRequest, authorizeAddress, errorResponse } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { user } = await authenticateRequest(req)
    return Response.json({
      loan: await getLoan(user.id),
      currency: currency(),
      environment: isMock() ? 'mock' : 'tala',
      repaymentAddress: process.env.TALA_REPAYMENT_ADDRESS ?? null,
    })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function POST(req: Request) {
  try {
    const { address, amount, duration } = (await req.json()) as { address: string; amount: number; duration: number }
    // The payout destination must be the caller's own embedded wallet.
    const { user } = await authorizeAddress(req, address)
    if (!(amount > 0) || !Number.isInteger(duration)) throw new TalaError('Pick an amount and a duration', 400)

    // Re-quote server-side so the due date comes from Tala, not the browser.
    const terms = await getTerms(user.id, amount, duration)
    const accepted = await acceptOffer(user.id, { amount, dueDate: terms.dueDate, partnerLoanId: crypto.randomUUID() })
    try {
      await requestDisbursement(user.id, amount, address)
    } catch (err) {
      // The loan is booked but unpaid. Surface the loan id so the payout can be retried, not re-borrowed.
      const message = err instanceof Error ? err.message : 'unknown error'
      throw new TalaError(`Loan ${accepted.loanId} accepted but the payout request failed: ${message}`, 502)
    }
    return Response.json(accepted)
  } catch (err) {
    return errorResponse(err)
  }
}
