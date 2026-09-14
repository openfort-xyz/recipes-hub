'use client'

import { Check, Loader2 } from 'lucide-react'
import { DRAIN_LABEL, TERMINAL_DRAIN_STATES } from '@/features/bridge/constants'
import type { Drain } from '@/features/bridge/types'

interface Props {
  drains: Drain[]
  simulated: boolean
}

export function DrainTimeline({ drains, simulated }: Props) {
  if (drains.length === 0) {
    return <p className="text-sm text-muted-foreground">No cash-outs yet. Send USDC to see one appear here.</p>
  }

  return (
    <div className="grid gap-3">
      {simulated && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <strong>Simulated.</strong> Bridge&apos;s sandbox has no testnet and never watches a cash-out address, so
          these states are produced by this app to show the shape of the flow. In production they come from Bridge.
        </p>
      )}

      {drains.map((drain) => {
        const done = drain.state === 'payment_processed'
        const settled = TERMINAL_DRAIN_STATES.has(drain.state)
        return (
          <div key={drain.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
            <div className="mt-0.5">
              {done ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : settled ? (
                <span className="block h-4 w-4 rounded-full bg-destructive/70" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="grid gap-1 text-sm">
              <span className="font-medium">
                {drain.amount} USDC → {(drain.destination_currency ?? 'usd').toUpperCase()}
              </span>
              <span className="text-muted-foreground">{DRAIN_LABEL[drain.state] ?? drain.state}</span>
              {drain.deposit_tx_hash && (
                <span className="font-mono text-xs text-muted-foreground">
                  {drain.deposit_tx_hash.slice(0, 10)}…{drain.deposit_tx_hash.slice(-8)}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
