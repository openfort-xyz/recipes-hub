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

/** How long the fake timeline spends in each state before moving on. */
const SIMULATED_TIMELINE: { state: DrainState; afterMs: number }[] = [
  { state: 'funds_received', afterMs: 0 },
  { state: 'payment_submitted', afterMs: 8_000 },
  { state: 'payment_processed', afterMs: 20_000 },
]

/**
 * Where a simulated cash-out has got to, derived from how long ago it started.
 *
 * Deriving rather than storing means a restart, a refresh or two browser tabs
 * all agree, and there is no interval to leak.
 */
export function simulatedDrainState(drain: SimulatedDrain, now = Date.now()): DrainState {
  const elapsed = now - drain.startedAt
  let state: DrainState = 'funds_received'
  for (const step of SIMULATED_TIMELINE) {
    if (elapsed >= step.afterMs) state = step.state
  }
  return state
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
