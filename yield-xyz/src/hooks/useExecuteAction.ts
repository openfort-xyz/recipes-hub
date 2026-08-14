import { useCallback, useState } from 'react'
import { useAccount, usePublicClient, useSendTransaction, useSwitchChain } from 'wagmi'
import { yieldXyz, type YieldTransaction } from '../lib/yieldXyz'

export type TxRecord = { hash: string; title: string }

export type ExecuteState = {
  running: boolean
  step: { current: number; total: number } | null
  hashes: TxRecord[]
  error: string | null
}

const initial: ExecuteState = { running: false, step: null, hashes: [], error: null }

interface ParsedTx {
  to: `0x${string}`
  data?: `0x${string}`
  value?: bigint
  chainId: number
}

/**
 * Yield.xyz's `unsignedTransaction` is a JSON-stringified plain transaction
 * request (to/data/value/chainId/nonce/gas fields). Gas, nonce and fee
 * fields are dropped here and left to wagmi/viem to (re-)estimate at send
 * time - they can go stale between when Yield.xyz built the tx and when the
 * user actually signs it.
 */
function parseUnsignedTransaction(raw: string): ParsedTx {
  const tx = JSON.parse(raw) as { to: string; data?: string; value?: string; chainId: number }
  return {
    to: tx.to as `0x${string}`,
    data: tx.data as `0x${string}` | undefined,
    value: tx.value && tx.value !== '0' ? BigInt(tx.value) : undefined,
    chainId: tx.chainId,
  }
}

/**
 * Signs and broadcasts an ordered list of Yield.xyz action steps with the
 * connected Openfort wallet, waiting for each receipt before moving on, and
 * reporting the resulting hash back to Yield.xyz via submit-hash.
 */
export function useExecuteAction(chainId: number) {
  const [state, setState] = useState<ExecuteState>(initial)
  const { sendTransactionAsync } = useSendTransaction()
  const { switchChainAsync } = useSwitchChain()
  const { chainId: activeChainId } = useAccount()
  const publicClient = usePublicClient({ chainId })

  const execute = useCallback(
    async (transactions: YieldTransaction[]) => {
      if (!publicClient) {
        setState({ ...initial, error: 'No RPC client for this chain.' })
        return
      }

      const steps = [...transactions].sort((a, b) => a.stepIndex - b.stepIndex).filter((t) => t.unsignedTransaction)
      if (steps.length === 0) {
        setState({ ...initial, error: 'This action has nothing left to sign.' })
        return
      }

      setState({ running: true, step: null, hashes: [], error: null })
      const hashes: TxRecord[] = []

      try {
        if (activeChainId !== chainId) {
          await switchChainAsync({ chainId })
        }

        for (let i = 0; i < steps.length; i++) {
          const step = steps[i]
          setState((s) => ({ ...s, step: { current: i + 1, total: steps.length } }))

          const parsed = parseUnsignedTransaction(step.unsignedTransaction!)
          const hash = await sendTransactionAsync(parsed)
          await publicClient.waitForTransactionReceipt({ hash })
          await yieldXyz.submitHash(step.id, hash).catch(() => {
            // Best-effort: the tx is confirmed on-chain either way.
          })

          hashes.push({ hash, title: step.title })
        }
        setState({ running: false, step: null, hashes, error: null })
      } catch (error) {
        setState({ running: false, step: null, hashes, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    },
    [sendTransactionAsync, switchChainAsync, activeChainId, chainId, publicClient]
  )

  const reset = useCallback(() => setState(initial), [])

  return { ...state, execute, reset }
}
