// Price a conversion. The quote locks the rate for a few minutes and carries
// the payment instructions: bank details for money in, a USDC deposit address
// for money out.

import { parseUnits } from 'viem'
import {
  createOffRampQuote,
  createOnRampQuote,
  findOrCreateWalletAccount,
  GridError,
  listExternalAccounts,
} from '@/features/grid/client'
import { customerFor } from '@/features/grid/customer'
import { authorizeAddress, errorResponse } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const USDC_DECIMALS = 6

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { direction: 'in' | 'out'; amount: string; address: string }
    const { user } = await authorizeAddress(req, body.address)

    if (!/^\d+(\.\d{1,6})?$/.test(body.amount ?? '')) throw new GridError('Enter an amount like 5 or 5.25', 400)
    const usdcAmount = parseUnits(body.amount, USDC_DECIMALS)
    if (usdcAmount <= 0n) throw new GridError('Enter an amount above zero', 400)

    const customer = await customerFor(user)

    if (body.direction === 'in') {
      const wallet = await findOrCreateWalletAccount(customer.id, body.address)
      return Response.json(await createOnRampQuote({ customerId: customer.id, walletAccountId: wallet.id, usdcAmount }))
    }

    const bank = (await listExternalAccounts(customer.id)).find((a) => a.accountInfo.accountType === 'USD_ACCOUNT')
    if (!bank) throw new GridError('Link a bank account first', 409)
    return Response.json(await createOffRampQuote({ customerId: customer.id, bankAccountId: bank.id, usdcAmount }))
  } catch (err) {
    return errorResponse(err)
  }
}
