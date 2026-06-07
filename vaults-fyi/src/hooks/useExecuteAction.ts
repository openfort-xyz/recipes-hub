import { useCallback, useRef, useState } from 'react'
import { usePublicClient, useSendTransaction } from 'wagmi'

type ActionStep = {
  name: string
  tx: { to: string; chainId: number; data?: string; value?: string }
}

export type TxRecord = { hash: string; name: string }

export type ExecuteState = {
  running: boolean
  step: { current: number; total: number } | null
  hashes: TxRecord[]
  error: string | null
}

const initial: ExecuteState = {
  running: false,
  step: null,
  hashes: [],
  error: null,
}

/**
 * Executes an ordered list of vaults.fyi action steps with the connected
 * Openfort wallet, waiting for each transaction receipt before proceeding.
 */
export function useExecuteAction() {
  const [state, setState] = useState<ExecuteState>(initial)
  const { sendTransactionAsync } = useSendTransaction()
  const publicClient = usePublicClient()
  const publicClientRef = useRef(publicClient)
  publicClientRef.current = publicClient

  const execute = useCallback(
    async (currentActionIndex: number, actions: ActionStep[]) => {
      const client = publicClientRef.current
      if (!client) return

      const remaining = actions.slice(currentActionIndex)
      if (remaining.length === 0) {
        setState({ ...initial, error: 'Nothing to execute.' })
        return
      }

      setState({ running: true, step: null, hashes: [], error: null })
      const hashes: TxRecord[] = []

      try {
        for (let i = 0; i < remaining.length; i++) {
          const step = remaining[i]
          setState((s) => ({ ...s, step: { current: i + 1, total: remaining.length } }))
          const hash = await sendTransactionAsync({
            to: step.tx.to as `0x${string}`,
            data: step.tx.data as `0x${string}` | undefined,
            value: step.tx.value ? BigInt(step.tx.value) : undefined,
            chainId: step.tx.chainId,
          })
          await client.waitForTransactionReceipt({
            hash,
            confirmations: 2,
          })
          hashes.push({ hash, name: step.name })
        }
        setState({ running: false, step: null, hashes, error: null })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        setState({ running: false, step: null, hashes, error: message })
      }
    },
    [sendTransactionAsync]
  )

  const reset = useCallback(() => setState(initial), [])

  return { ...state, execute, reset }
}
