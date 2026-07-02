import type {
  Action,
  CollectDataFieldResult,
  ConfirmPaymentResponse,
  PaymentOption,
  PaymentOptionsResponse,
} from '@walletconnect/pay'
import { useCallback, useState } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { buildAccounts, chainIdFromCaip2 } from '../lib/chains'
import { type Eip1193Provider, getPayClient, type PayClient } from '../lib/pay'
import { errorMessage } from '../utils/format'

export type PaymentPhase = 'idle' | 'fetching' | 'review' | 'collect' | 'signing' | 'confirming' | 'success' | 'failed'

export interface SigningStep {
  index: number
  total: number
}

type SwitchChain = (args: { chainId: number }) => Promise<unknown>

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Forward each WalletConnect Pay action to the wallet as a raw EIP-1193 request. The action's
// `method` is eth_sendTransaction / eth_signTypedData_v4 / personal_sign and `params` is the
// JSON-encoded argument array — exactly what the Openfort provider expects.
async function signActions(
  provider: Eip1193Provider,
  actions: Action[],
  switchChain: SwitchChain,
  startChainId: number | undefined,
  onStep: (step: SigningStep) => void
): Promise<string[]> {
  const signatures: string[] = []
  let activeChainId = startChainId
  for (let i = 0; i < actions.length; i++) {
    const { chainId: reference, method, params } = actions[i].walletRpc
    const target = chainIdFromCaip2(reference)
    if (activeChainId !== target) {
      await switchChain({ chainId: target })
      activeChainId = target
    }
    onStep({ index: i + 1, total: actions.length })
    const parsed = JSON.parse(params) as unknown[] | Record<string, unknown>
    const signature = (await provider.request({ method, params: parsed })) as string
    signatures.push(signature)
  }
  return signatures
}

// Submit signatures and poll until the gateway reaches a terminal state.
async function pollConfirmation(
  client: PayClient,
  paymentId: string,
  optionId: string,
  signatures: string[],
  collectedData?: CollectDataFieldResult[]
): Promise<ConfirmPaymentResponse> {
  let result = await client.confirmPayment({ paymentId, optionId, signatures, collectedData })
  while (!result.isFinal) {
    await sleep(result.pollInMs ?? 2500)
    result = await client.confirmPayment({ paymentId, optionId, signatures, collectedData })
  }
  return result
}

export function usePayment() {
  const { address, connector, chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const [phase, setPhase] = useState<PaymentPhase>('idle')
  const [response, setResponse] = useState<PaymentOptionsResponse>()
  const [selected, setSelected] = useState<PaymentOption>()
  const [step, setStep] = useState<SigningStep>()
  const [txId, setTxId] = useState<string>()
  const [error, setError] = useState<string>()
  const [isSample, setIsSample] = useState(false)

  const reset = useCallback(() => {
    setPhase('idle')
    setResponse(undefined)
    setSelected(undefined)
    setStep(undefined)
    setTxId(undefined)
    setError(undefined)
    setIsSample(false)
  }, [])

  // Preview the options screen with representative data (no live link, no signing).
  const loadSample = useCallback((sample: PaymentOptionsResponse) => {
    setError(undefined)
    setSelected(undefined)
    setIsSample(true)
    setResponse(sample)
    setPhase('review')
  }, [])

  const fail = useCallback((message: string) => {
    setError(message)
    setPhase('failed')
  }, [])

  const fetchOptions = useCallback(
    async (paymentLink: string) => {
      if (!address) return
      setError(undefined)
      setPhase('fetching')
      try {
        const res = await getPayClient().getPaymentOptions({
          paymentLink: paymentLink.trim(),
          accounts: buildAccounts(address),
          includePaymentInfo: true,
        })
        if (res.options.length === 0) {
          throw new Error('No payment options available for this wallet on the supported chains.')
        }
        setResponse(res)
        setPhase('review')
      } catch (e) {
        setError(errorMessage(e))
        setPhase('failed')
      }
    },
    [address]
  )

  const runPayment = useCallback(
    async (option: PaymentOption, collectedData?: CollectDataFieldResult[]) => {
      if (isSample || !response || !connector) return
      setSelected(option)
      setError(undefined)
      setPhase('signing')
      try {
        const provider = (await connector.getProvider()) as Eip1193Provider
        const client = getPayClient()
        const actions = await client.getRequiredPaymentActions({
          paymentId: response.paymentId,
          optionId: option.id,
        })
        const signatures = await signActions(provider, actions, switchChainAsync, chainId, setStep)
        setPhase('confirming')
        const result = await pollConfirmation(client, response.paymentId, option.id, signatures, collectedData)
        if (result.status === 'succeeded') {
          setTxId(result.info?.txId)
          setPhase('success')
        } else {
          setError(`Payment ${result.status}.`)
          setPhase('failed')
        }
      } catch (e) {
        setError(errorMessage(e))
        setPhase('failed')
      }
    },
    [isSample, response, connector, switchChainAsync, chainId]
  )

  const selectOption = useCallback(
    (option: PaymentOption) => {
      if (option.collectData?.url) {
        setSelected(option)
        setPhase('collect')
      } else {
        runPayment(option)
      }
    },
    [runPayment]
  )

  const submitCollectedData = useCallback(
    (collectedData?: CollectDataFieldResult[]) => {
      if (selected) runPayment(selected, collectedData)
    },
    [selected, runPayment]
  )

  return {
    phase,
    response,
    selected,
    step,
    txId,
    error,
    isSample,
    fetchOptions,
    loadSample,
    selectOption,
    submitCollectedData,
    reset,
    fail,
  }
}
