import { useState } from 'react'
import { formatUnits } from 'viem'
import type { DemoConfig } from '../config/demos'

export function WalletBalance({
  demo,
  address,
  value,
  decimals,
  isLoading,
  onRefresh,
}: {
  demo: DemoConfig
  address: string
  value: bigint | undefined
  decimals: number | undefined
  isLoading: boolean
  onRefresh: () => void
}) {
  const [copied, setCopied] = useState(false)

  /** Mainnet has no faucet - funding means sending real MON to this address. */
  function copyAddress() {
    navigator.clipboard
      ?.writeText(address)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2_000)
      })
      .catch(() => {
        // Clipboard can be denied (unfocused document, no permission).
      })
  }

  const balance = value !== undefined && decimals !== undefined ? Number(formatUnits(value, decimals)).toFixed(4) : null

  return (
    <div className="flex items-center justify-center gap-2 text-sm text-neutral-400">
      {isLoading && <span>Loading balance…</span>}
      {!isLoading && (
        <span>
          Balance: <span className="text-white font-medium">{balance ?? '0.0000'}</span> {demo.tokenSymbol}
        </span>
      )}
      <button onClick={onRefresh} className="text-xs text-neutral-500 hover:text-neutral-300 underline">
        refresh
      </button>
      <button
        type="button"
        onClick={copyAddress}
        title={`Copy ${address} to fund this wallet`}
        className="text-xs text-emerald-400 hover:underline"
      >
        {copied ? 'address copied' : 'fund wallet'}
      </button>
    </div>
  )
}
