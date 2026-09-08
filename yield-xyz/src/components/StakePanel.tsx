import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { DemoConfig } from '../config/demos'
import { useExecuteAction } from '../hooks/useExecuteAction'
import { useValidators, useYieldDetail } from '../hooks/useYieldQueries'
import { yieldXyz } from '../lib/yieldXyz'
import { Card } from './Card'
import { TxList } from './TxList'

function formatSeconds(seconds?: number) {
  if (!seconds) return null
  const days = seconds / 86_400
  if (days >= 1) return `${days % 1 === 0 ? days : days.toFixed(1)} day${days === 1 ? '' : 's'}`
  const hours = seconds / 3_600
  return `${hours % 1 === 0 ? hours : hours.toFixed(1)} hour${hours === 1 ? '' : 's'}`
}

export function StakePanel({
  userAddress,
  demo,
  onSettled,
}: {
  userAddress: string
  demo: DemoConfig
  onSettled?: () => void
}) {
  const queryClient = useQueryClient()
  const { data: detail, isLoading, error } = useYieldDetail(demo.yieldId)
  const { data: validators } = useValidators(demo.yieldId, demo.requiresValidator)
  const { running, step, hashes, error: execError, execute, reset } = useExecuteAction(demo.chainId)

  const [amount, setAmount] = useState(demo.defaultAmount)
  const [validatorAddress, setValidatorAddress] = useState('')
  const [preparing, setPreparing] = useState(false)
  const [prepareError, setPrepareError] = useState<string | null>(null)

  const resolvedValidator = validatorAddress || validators?.find((v) => v.preferred)?.address || validators?.[0]?.address

  async function handleEnter() {
    setPreparing(true)
    setPrepareError(null)
    reset()
    try {
      const action = await yieldXyz.enter({
        yieldId: demo.yieldId,
        address: userAddress,
        amount,
        validatorAddress: demo.requiresValidator ? resolvedValidator : undefined,
      })
      await execute(action.transactions)
      await queryClient.invalidateQueries({ queryKey: ['balances', demo.yieldId] })
    } catch (err) {
      setPrepareError(err instanceof Error ? err.message : 'Failed to prepare the transaction.')
    } finally {
      setPreparing(false)
      onSettled?.()
    }
  }

  const apy = detail ? `${(detail.rewardRate.total * 100).toFixed(2)}% ${detail.rewardRate.rateType}` : null
  const min = detail?.mechanics.entryLimits.minimum
  const warmup = formatSeconds(detail?.mechanics.warmupPeriod?.seconds)
  const cooldown = formatSeconds(detail?.mechanics.cooldownPeriod?.seconds)

  return (
    <Card
      title={detail?.metadata.name ?? demo.label}
      subtitle={detail ? `${demo.protocol} · ${apy}${min ? ` · min ${min} ${demo.tokenSymbol}` : ''}` : undefined}
      badge="Mainnet · real funds"
    >
      {isLoading && <p className="text-sm text-neutral-500">Loading yield details…</p>}
      {error && <p className="text-sm text-red-400">{(error as Error).message}</p>}

      {detail && (
        <>
          <p className="text-sm text-neutral-400">{detail.metadata.description}</p>
          <p className="text-xs text-amber-500/80 mt-1">Mainnet: staking here delegates real {demo.tokenSymbol}.</p>
          {(warmup || cooldown) && (
            <p className="text-xs text-neutral-500 mt-1">
              {warmup && `Warmup ${warmup}`}
              {warmup && cooldown && ' · '}
              {cooldown && `Cooldown ${cooldown}`}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-3">
            {demo.requiresValidator && (
              <select
                value={resolvedValidator ?? ''}
                onChange={(e) => setValidatorAddress(e.target.value)}
                className="w-full bg-neutral-800 text-white text-sm rounded-lg px-3 py-2 border border-neutral-700"
              >
                {!validators?.length && <option value="">Loading validators…</option>}
                {validators?.map((v) => (
                  <option key={v.address} value={v.address}>
                    {v.name} · {(v.commission * 100).toFixed(0)}% commission{v.preferred ? ' · preferred' : ''}
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-neutral-800 text-white text-sm rounded-lg pl-3 pr-16 py-2 border border-neutral-700"
                  placeholder={`Amount in ${demo.tokenSymbol}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
                  {demo.tokenSymbol}
                </span>
              </div>
              <button
                onClick={handleEnter}
                disabled={preparing || running || (demo.requiresValidator && !resolvedValidator)}
                className="bg-white text-black font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {preparing || running ? `Staking…${step ? ` (${step.current}/${step.total})` : ''}` : 'Enter'}
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
