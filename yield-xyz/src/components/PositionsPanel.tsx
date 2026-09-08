import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useExecuteAction } from '../hooks/useExecuteAction'
import { useBalances } from '../hooks/useYieldQueries'
import { yieldXyz } from '../lib/yieldXyz'
import type { DemoConfig } from '../config/demos'
import { Card } from './Card'
import { TxList } from './TxList'

/** One Yield.xyz position - staking or vault - with its exit button. */
export function PositionsPanel({
  userAddress,
  demo,
  title,
  yieldId,
  requiresValidator,
  onSettled,
}: {
  userAddress: string
  demo: DemoConfig
  title: string
  /** Defaults to the demo's staking opportunity; the vault card passes its own. */
  yieldId?: string
  requiresValidator?: boolean
  onSettled?: () => void
}) {
  const resolvedYieldId = yieldId ?? demo.yieldId
  const needsValidator = requiresValidator ?? demo.requiresValidator
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch } = useBalances(resolvedYieldId, userAddress)
  const { running, step, hashes, error: execError, execute } = useExecuteAction(demo.chainId)
  const [exitingType, setExitingType] = useState<string | null>(null)

  async function handleExit(balance: { type: string; amount: string; validatorAddress?: string }) {
    setExitingType(balance.type)
    try {
      const action = await yieldXyz.exit({
        yieldId: resolvedYieldId,
        address: userAddress,
        amount: balance.amount,
        validatorAddress: needsValidator ? balance.validatorAddress : undefined,
      })
      await execute(action.transactions)
      await refetch()
    } finally {
      setExitingType(null)
      onSettled?.()
    }
  }

  const balances = data?.balances ?? []

  return (
    <Card
      title={title}
      subtitle={`Read directly from Yield.xyz for this wallet on ${demo.network} - refreshes after every action.`}
    >
      {isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
      {error && <p className="text-sm text-red-400">{(error as Error).message}</p>}
      {!isLoading && balances.length === 0 && <p className="text-sm text-neutral-500">No position yet.</p>}

      <div className="space-y-2">
        {balances.map((b) => (
          <div
            key={`${b.type}-${b.validatorAddress ?? ''}`}
            className="flex items-center justify-between p-3 rounded-xl bg-neutral-800"
          >
            <div className="text-left min-w-0">
              <div className="text-sm text-white font-medium">
                {b.amount} {b.token.symbol}
              </div>
              <div className="text-xs text-neutral-500 capitalize">{b.type.replace(/_/g, ' ').toLowerCase()}</div>
            </div>
            <button
              onClick={() => handleExit(b)}
              disabled={running || exitingType === b.type}
              className="text-xs bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-2 rounded-lg disabled:opacity-50"
            >
              {exitingType === b.type ? `Exiting…${step ? ` (${step.current}/${step.total})` : ''}` : 'Exit'}
            </button>
          </div>
        ))}
      </div>

      <TxList hashes={hashes} explorerUrl={demo.explorerUrl} />
      {execError && <p className="mt-3 text-sm text-red-400">{execError}</p>}
      <button
        onClick={() => queryClient.invalidateQueries({ queryKey: ['balances', resolvedYieldId] })}
        className="mt-4 text-xs text-neutral-500 hover:text-neutral-300 underline"
      >
        Refresh
      </button>
    </Card>
  )
}
