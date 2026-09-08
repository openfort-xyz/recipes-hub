import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { DemoConfig } from '../config/demos'
import { useExecuteAction } from '../hooks/useExecuteAction'
import { useYields } from '../hooks/useYieldQueries'
import { type YieldOpportunity, yieldXyz } from '../lib/yieldXyz'
import { Card } from './Card'
import { TxList } from './TxList'

const VISIBLE_VAULTS = 8

/**
 * Deposit into an ERC-4626 / Upshift vault through the same Yield.xyz action
 * API the staking panel uses - a different `mechanics.type`, identical
 * enter/exit plumbing. Monad Testnet lists no vaults at all, so like the
 * staking panel this runs on Monad mainnet and moves real funds.
 */
export function VaultsPanel({
  userAddress,
  demo,
  selected,
  onSelect,
  onSettled,
}: {
  userAddress: string
  demo: DemoConfig
  selected: YieldOpportunity | null
  onSelect: (vault: YieldOpportunity | null) => void
  onSettled?: () => void
}) {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useYields(demo.network)
  const { running, step, hashes, error: execError, execute, reset } = useExecuteAction(demo.chainId)

  const [amount, setAmount] = useState('')
  const [preparing, setPreparing] = useState(false)
  const [prepareError, setPrepareError] = useState<string | null>(null)

  const vaults = (data ?? [])
    .filter((y) => y.mechanics.type === 'vault' && y.rewardRate.total > 0 && !y.metadata.underMaintenance)
    .sort((a, b) => b.rewardRate.total - a.rewardRate.total)
    .slice(0, VISIBLE_VAULTS)

  const vault = selected ?? vaults[0] ?? null
  const min = vault?.mechanics.entryLimits.minimum

  // Publish the highest-APY default upward so the position panel below tracks it.
  useEffect(() => {
    if (!selected && vault) onSelect(vault)
  }, [selected, vault, onSelect])

  async function handleEnter() {
    if (!vault) return
    setPreparing(true)
    setPrepareError(null)
    reset()
    try {
      const action = await yieldXyz.enter({ yieldId: vault.id, address: userAddress, amount })
      await execute(action.transactions)
      await queryClient.invalidateQueries({ queryKey: ['balances', vault.id] })
    } catch (err) {
      setPrepareError(err instanceof Error ? err.message : 'Failed to prepare the transaction.')
    } finally {
      setPreparing(false)
      onSettled?.()
    }
  }

  return (
    <Card
      title="Vaults"
      subtitle={
        vault
          ? `${demo.protocol} · ${(vault.rewardRate.total * 100).toFixed(2)}% ${vault.rewardRate.rateType}${
              min && min !== '0' ? ` · min ${min} ${vault.token.symbol}` : ''
            }`
          : undefined
      }
      badge="Mainnet · real funds"
    >
      {isLoading && <p className="text-sm text-neutral-500">Loading vaults…</p>}
      {error && <p className="text-sm text-red-400">{(error as Error).message}</p>}
      {!isLoading && !error && vaults.length === 0 && (
        <p className="text-sm text-neutral-500">No vaults reporting a yield right now.</p>
      )}

      {vault && (
        <>
          <p className="text-sm text-neutral-400">
            Deposit into a {demo.network} vault. Same enter/exit endpoints as staking, no validator - the vault issues
            shares instead.
          </p>
          <p className="text-xs text-amber-500/80 mt-1">Mainnet: deposits here move real {vault.token.symbol}.</p>

          <div className="mt-4 flex flex-col gap-3">
            <select
              value={vault.id}
              onChange={(e) => onSelect(vaults.find((v) => v.id === e.target.value) ?? null)}
              className="w-full bg-neutral-800 text-white text-sm rounded-lg px-3 py-2 border border-neutral-700"
            >
              {vaults.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.metadata.name} · {(v.rewardRate.total * 100).toFixed(2)}% {v.rewardRate.rateType}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-neutral-800 text-white text-sm rounded-lg pl-3 pr-20 py-2 border border-neutral-700"
                  placeholder={`Amount in ${vault.token.symbol}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
                  {vault.token.symbol}
                </span>
              </div>
              <button
                onClick={handleEnter}
                disabled={preparing || running || !amount}
                className="bg-white text-black font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {preparing || running ? `Depositing…${step ? ` (${step.current}/${step.total})` : ''}` : 'Deposit'}
              </button>
            </div>
          </div>
        </>
      )}

      <TxList hashes={hashes} explorerUrl={demo.explorerUrl} />
      {(prepareError || execError) && <p className="mt-3 text-sm text-red-400">{prepareError ?? execError}</p>}
    </Card>
  )
}
