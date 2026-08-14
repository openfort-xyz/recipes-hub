import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { DemoConfig } from '../config/demos'
import { useExecuteAction } from '../hooks/useExecuteAction'
import { useBalances } from '../hooks/useYieldQueries'
import { yieldXyz } from '../lib/yieldXyz'
import { Card } from './Card'

export function PositionsPanel({
  userAddress,
  demo,
  onSettled,
}: {
  userAddress: string
  demo: DemoConfig
  onSettled?: () => void
}) {
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch } = useBalances(demo.yieldId, userAddress)
  const { running, step, hashes, error: execError, execute } = useExecuteAction(demo.chainId)
  const [exitingType, setExitingType] = useState<string | null>(null)

  async function handleExit(balance: { type: string; amount: string; validatorAddress?: string }) {
    setExitingType(balance.type)
    try {
      const action = await yieldXyz.exit({
        yieldId: demo.yieldId,
        address: userAddress,
        amount: balance.amount,
        validatorAddress: demo.requiresValidator ? balance.validatorAddress : undefined,
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
      title="Your position"
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

      {hashes.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs">
          {hashes.map((h) => (
            <li key={h.hash}>
              <a
                href={`${demo.explorerUrl}/tx/${h.hash}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline"
              >
                {h.hash}
              </a>{' '}
              <span className="text-neutral-500">({h.title})</span>
            </li>
          ))}
        </ul>
      )}
      {execError && <p className="mt-3 text-sm text-red-400">{execError}</p>}
      <button
        onClick={() => queryClient.invalidateQueries({ queryKey: ['balances', demo.yieldId] })}
        className="mt-4 text-xs text-neutral-500 hover:text-neutral-300 underline"
      >
        Refresh
      </button>
    </Card>
  )
}
