// Cash-out tracking.
//
// GET  reads the drain history for a cash-out address — real in production,
//      simulated in sandbox (see features/bridge/drains.ts for why).
// POST records that the wallet sent USDC, which is what starts the simulated
//      timeline. In production it does nothing: Bridge notices the deposit by
//      itself, and inventing a drain would contradict it.

import { isSandbox } from '@/features/bridge/client'
import { fetchDrains, toDrain } from '@/features/bridge/drains'
import { authenticateRequest, errorResponse } from '@/lib/auth'
import { getRecord, updateRecord } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { user } = await authenticateRequest(req)
    const record = await getRecord(user.id)
    const currency = new URL(req.url).searchParams.get('currency') ?? 'usd'
    const cashOut = record.cashOutAddresses.find((a) => a.destinationCurrency === currency)

    if (!cashOut) return Response.json({ drains: [], simulated: isSandbox() })

    if (isSandbox()) {
      const now = Date.now()
      const drains = record.simulatedDrains
        .filter((d) => d.destinationCurrency === currency)
        .map((d) => toDrain(d, now))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
      return Response.json({ drains, simulated: true })
    }

    if (!record.bridgeCustomerId) return Response.json({ drains: [], simulated: false })
    return Response.json({
      drains: await fetchDrains(record.bridgeCustomerId, cashOut.id),
      simulated: false,
    })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function POST(req: Request) {
  try {
    const { user } = await authenticateRequest(req)
    const body = (await req.json()) as {
      amount: string
      txHash: string
      currency: 'usd' | 'eur'
    }

    if (!isSandbox()) {
      // Production drains come from Bridge watching the chain. Nothing to do.
      return Response.json({ recorded: false, simulated: false })
    }

    await updateRecord(user.id, (r) => ({
      ...r,
      simulatedDrains: [
        ...r.simulatedDrains,
        {
          id: `sim_${body.txHash.slice(2, 12)}`,
          amount: body.amount,
          txHash: body.txHash,
          startedAt: Date.now(),
          destinationCurrency: body.currency,
        },
      ],
    }))

    return Response.json({ recorded: true, simulated: true })
  } catch (err) {
    return errorResponse(err)
  }
}
