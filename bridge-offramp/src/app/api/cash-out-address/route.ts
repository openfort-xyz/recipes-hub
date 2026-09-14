// The cash-out address itself: a permanent address that converts anything sent
// to it and pays the proceeds to the linked bank account.

import { createLiquidationAddress } from '@/features/bridge/client'
import { authorizeAddress, errorResponse } from '@/lib/auth'
import { getRecord, updateRecord } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Bridge has no testnet chains — sandbox returns dummy data on mainnet chain
 * names. The wallet may be on Base Sepolia while this says `base`; see README.
 */
const CHAIN = 'base'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      currency: 'usd' | 'eur'
      returnAddress: string
    }

    // Authorizes the session AND that this wallet belongs to it: the return
    // address is where Bridge sends funds back when a payout fails.
    const { user } = await authorizeAddress(req, body.returnAddress)

    const record = await getRecord(user.id)
    if (!record.bridgeCustomerId) {
      return Response.json({ error: 'Verify your identity first' }, { status: 409 })
    }

    const bank = record.bankAccounts.find((b) => b.currency === body.currency)
    if (!bank) {
      return Response.json({ error: `Link a ${body.currency.toUpperCase()} bank account first` }, { status: 409 })
    }

    const existing = record.cashOutAddresses.find((a) => a.destinationCurrency === body.currency)
    if (existing) return Response.json({ cashOutAddress: existing })

    const rail = body.currency === 'eur' ? ('sepa' as const) : ('ach' as const)
    const liquidation = await createLiquidationAddress({
      customerId: record.bridgeCustomerId,
      userId: user.id,
      externalAccountId: bank.id,
      chain: CHAIN,
      rail,
      destinationCurrency: body.currency,
      returnAddress: body.returnAddress,
    })

    const stored = {
      id: liquidation.id,
      address: liquidation.address,
      chain: liquidation.chain,
      rail,
      destinationCurrency: body.currency,
      externalAccountId: bank.id,
    }

    await updateRecord(user.id, (r) => ({
      ...r,
      cashOutAddresses: [...r.cashOutAddresses.filter((a) => a.destinationCurrency !== body.currency), stored],
    }))

    return Response.json({ cashOutAddress: stored })
  } catch (err) {
    return errorResponse(err)
  }
}
