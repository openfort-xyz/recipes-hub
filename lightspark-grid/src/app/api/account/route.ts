// The signed-in user's Grid state, created on first call: the customer, the
// wallet registered as the on-ramp destination, and any linked bank account.
// Answers 409 until it has a first and last name for the customer.

import { findOrCreateWalletAccount, isSandbox, listExternalAccounts } from '@/features/grid/client'
import { customerFor } from '@/features/grid/customer'
import { authorizeAddress, errorResponse } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { address, fullName } = (await req.json()) as { address: string; fullName?: string }
    const { user } = await authorizeAddress(req, address)

    const customer = await customerFor(user, fullName)
    const wallet = await findOrCreateWalletAccount(customer.id, address)
    const bank = (await listExternalAccounts(customer.id)).find((a) => a.accountInfo.accountType === 'USD_ACCOUNT')

    return Response.json({
      environment: isSandbox() ? 'sandbox' : 'production',
      customerId: customer.id,
      kycStatus: customer.kycStatus,
      walletAccountId: wallet.id,
      bankAccount: bank
        ? {
            id: bank.id,
            bankName: bank.accountInfo.bankName ?? 'Bank',
            last4: bank.accountInfo.accountNumber?.slice(-4),
          }
        : null,
    })
  } catch (err) {
    return errorResponse(err)
  }
}
