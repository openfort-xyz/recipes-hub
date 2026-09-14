// Drain tracking — the half of the flow Bridge's sandbox cannot run.
//
// In production, Bridge watches the cash-out address, converts what arrives and
// records a drain per deposit, which this app reads back. In sandbox there is no
// testnet and liquidation addresses are dummy data, so nothing is ever watched
// and no drain is ever created. Rather than showing the reader a screen that
// never moves, sandbox advances a local timeline instead — flagged as simulated
// everywhere it surfaces, and never written to Bridge.

import { listDrains } from '@/features/bridge/client'
import type { Drain, DrainState } from '@/features/bridge/types'
import type { SimulatedDrain } from '@/lib/store'

/**
 * Where a simulated cash-out has got to, derived from how long ago it started.
 *
 * Deriving rather than storing means a restart, a refresh or two browser tabs
 * all agree, and there is no interval to leak.
 */
function simulatedDrainState(drain: SimulatedDrain, now = Date.now()): DrainState {
  const elapsed = now - drain.startedAt
  if (elapsed >= 20_000) return 'payment_processed'
  if (elapsed >= 8_000) return 'payment_submitted'
  return 'funds_received'
}

export function toDrain(simulated: SimulatedDrain, now = Date.now()): Drain {
  return {
    id: simulated.id,
    state: simulatedDrainState(simulated, now),
    amount: simulated.amount,
    currency: 'usdc',
    destination_currency: simulated.destinationCurrency,
    deposit_tx_hash: simulated.txHash,
    created_at: new Date(simulated.startedAt).toISOString(),
    updated_at: new Date(now).toISOString(),
    simulated: true,
  }
}

/** Real drain history, newest first. Production only. */
export async function fetchDrains(customerId: string, liquidationAddressId: string): Promise<Drain[]> {
  const { data } = await listDrains(customerId, liquidationAddressId)
  return (data as Drain[]) ?? []
}
