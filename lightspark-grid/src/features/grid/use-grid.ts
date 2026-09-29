'use client'

import { useUser } from '@openfort/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { formatUnits } from 'viem'
import { useAccount, useChainId, usePublicClient, useReadContract, useWriteContract } from 'wagmi'
import { ERC20_ABI, TERMINAL_STATUSES, USDC_ADDRESS, USDC_DECIMALS } from '@/features/grid/constants'
import type { Quote, UsBankForm } from '@/features/grid/types'

export type Direction = 'in' | 'out'

export interface AccountState {
  environment: 'sandbox' | 'production'
  customerId: string
  kycStatus: string
  walletAccountId: string
  bankAccount: { id: string; bankName: string; last4?: string } | null
}

export interface PaymentStatus {
  status: string
  paymentRail: string | null
  settledAt: string | null
  failureReason: string | null
}

/** Everything the money-in and money-out screens need, in one hook. */
export function useGrid() {
  const { getAccessToken, isAuthenticated } = useUser()
  const { address } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const [account, setAccount] = useState<AccountState | null>(null)
  const [quote, setQuote] = useState<(Quote & { direction: Direction }) | null>(null)
  const [payment, setPayment] = useState<PaymentStatus | null>(null)
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [needsName, setNeedsName] = useState(false)

  const usdc = USDC_ADDRESS[chainId]
  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    abi: ERC20_ABI,
    address: usdc,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && usdc), refetchInterval: 15_000 },
  })

  const call = useCallback(
    async <T>(path: string, init?: { method: 'POST'; body?: unknown }): Promise<T> => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not signed in')
      const res = await fetch(path, {
        method: init?.method ?? 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: init?.body ? JSON.stringify(init.body) : undefined,
      })
      const payload = await res.json()
      if (!res.ok)
        throw Object.assign(new Error(payload.error ?? `Request failed (${res.status})`), { status: res.status })
      return payload as T
    },
    [getAccessToken]
  )

  const run = useCallback(async (label: string, fn: () => Promise<void>) => {
    setBusy(label)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(null)
    }
  }, [])

  /** 409 means Grid has no customer yet and the Openfort user has no full name to create one with. */
  const loadAccount = useCallback(
    (fullName?: string) =>
      run('account', async () => {
        try {
          setAccount(await call<AccountState>('/api/account', { method: 'POST', body: { address, fullName } }))
          setNeedsName(false)
        } catch (err) {
          if ((err as { status?: number }).status !== 409) throw err
          setNeedsName(true)
          if (fullName) throw err
        }
      }),
    [address, call, run]
  )

  const refreshAccount = useCallback(async () => {
    if (!isAuthenticated || !address) return
    await loadAccount()
  }, [address, isAuthenticated, loadAccount])

  useEffect(() => {
    void refreshAccount()
  }, [refreshAccount])

  // Poll the payment only while it is still moving.
  const quoteId = quote?.id
  const moving = Boolean(payment && !TERMINAL_STATUSES.has(payment.status))
  const callRef = useRef(call)
  callRef.current = call
  useEffect(() => {
    if (!quoteId || !moving) return
    const id = setInterval(async () => {
      try {
        const next = await callRef.current<PaymentStatus>(`/api/quotes/${encodeURIComponent(quoteId)}`)
        setPayment(next)
        if (TERMINAL_STATUSES.has(next.status)) void refetchBalance()
      } catch {
        // Tracking is best-effort; a failed poll shouldn't blank the screen.
      }
    }, 2_000)
    return () => clearInterval(id)
  }, [quoteId, moving, refetchBalance])

  const linkBank = useCallback(
    (form: UsBankForm) =>
      run('bank', async () => {
        await call('/api/bank-accounts', { method: 'POST', body: form })
        const next = await call<AccountState>('/api/account', { method: 'POST', body: { address } })
        setAccount(next)
      }),
    [address, call, run]
  )

  const requestQuote = useCallback(
    (direction: Direction, amount: string) =>
      run('quote', async () => {
        setPayment(null)
        setTxHash(null)
        const next = await call<Quote>('/api/quotes', { method: 'POST', body: { direction, amount, address } })
        setQuote({ ...next, direction })
      }),
    [address, call, run]
  )

  /** Sandbox stand-in for the bank transfer (money in) or for Grid spotting the deposit (money out). */
  const simulate = useCallback(async () => {
    if (!quote) throw new Error('Get a quote first')
    await call(`/api/quotes/${encodeURIComponent(quote.id)}/simulate`, { method: 'POST' })
    setPayment({ status: 'PROCESSING', paymentRail: null, settledAt: null, failureReason: null })
  }, [call, quote])

  const simulateBankTransfer = useCallback(() => run('simulate', simulate), [run, simulate])

  /** Money out: the embedded wallet sends the quoted USDC to Grid's deposit address. */
  const sendUsdc = useCallback(
    () =>
      run('send', async () => {
        if (quote?.direction !== 'out') throw new Error('Get a cash-out quote first')
        if (!usdc || !publicClient) throw new Error(`USDC is not configured for chain ${chainId}`)
        const deposit = quote.paymentInstructions.find((p) => p.accountOrWalletInfo.accountType === 'BASE_WALLET')
        const to = deposit?.accountOrWalletInfo.address as `0x${string}` | undefined
        if (!to) throw new Error('The quote has no Base deposit address')

        // A transfer above the balance reverts during gas estimation, which viem
        // reports as a gas error. Say what is actually wrong instead.
        const needed = BigInt(quote.totalSendingAmount)
        const held = (balanceData as bigint | undefined) ?? 0n
        if (held < needed) {
          throw new Error(
            `The wallet holds ${formatUnits(held, USDC_DECIMALS)} USDC and this cash-out needs ${formatUnits(needed, USDC_DECIMALS)}. ` +
              'Sandbox deposits never deliver on-chain, so fund the wallet with Base Sepolia USDC from faucet.circle.com.'
          )
        }

        const hash = await writeContractAsync({
          abi: ERC20_ABI,
          address: usdc,
          functionName: 'transfer',
          args: [to, BigInt(quote.totalSendingAmount)],
        })
        setTxHash(hash)
        await publicClient.waitForTransactionReceipt({ hash })
        void refetchBalance()

        // Grid watches Base mainnet. In sandbox the transfer above is on Base
        // Sepolia, which Grid never sees, so tell it the deposit landed.
        if (account?.environment === 'sandbox') await simulate()
        else setPayment({ status: 'PENDING', paymentRail: null, settledAt: null, failureReason: null })
      }),
    [
      account?.environment,
      balanceData,
      refetchBalance,
      chainId,
      publicClient,
      quote,
      run,
      simulate,
      usdc,
      writeContractAsync,
    ]
  )

  return {
    account,
    needsName,
    submitName: loadAccount,
    quote,
    payment,
    txHash,
    busy,
    error,
    chainId,
    usdcBalance: balanceData !== undefined ? formatUnits(balanceData as bigint, USDC_DECIMALS) : null,
    linkBank,
    requestQuote,
    simulateBankTransfer,
    sendUsdc,
    clearQuote: () => {
      setQuote(null)
      setPayment(null)
      setTxHash(null)
    },
  }
}
