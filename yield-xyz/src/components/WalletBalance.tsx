import { formatUnits } from 'viem'
import type { DemoConfig } from '../config/demos'

export function WalletBalance({
  demo,
  value,
  decimals,
  isLoading,
  onRefresh,
}: {
  demo: DemoConfig
  value: bigint | undefined
  decimals: number | undefined
  isLoading: boolean
  onRefresh: () => void
}) {
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
      {balance === '0.0000' && (
        <a
          href={demo.faucetUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-emerald-400 hover:underline"
        >
          fund wallet
        </a>
      )}
    </div>
  )
}
