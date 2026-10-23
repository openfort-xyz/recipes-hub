'use client'

import { useUser } from '@openfort/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { formatUnits, parseUnits } from 'viem'
import { useAccount, useChainId, usePublicClient, useReadContract, useSignMessage, useWriteContract } from 'wagmi'
import type { CardholderDetails } from '@/features/reap/cardholder'
import { DEPOSIT_TOKEN, ERC20_ABI, MIN_DEPOSIT, TOKEN_DECIMALS } from '@/features/reap/constants'
import type { CardholderState, CardTransaction } from '@/features/reap/types'

/** Everything the card screens need, in one hook. */
export function useReap() {
  const { getAccessToken, isAuthenticated } = useUser()
  const { address } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()
  const { signMessageAsync } = useSignMessage()

  const [state, setState] = useState<CardholderState | null>(null)
  const [needsDetails, setNeedsDetails] = useState(false)
  const [revealUrl, setRevealUrl] = useState<string | null>(null)
  const [lastPurchase, setLastPurchase] = useState<CardTransaction | null>(null)
  const [awaiting, setAwaiting] = useState<'kyc' | 'deposit' | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const token = DEPOSIT_TOKEN[chainId]
  const { data: walletBalance, refetch: refetchWalletBalance } = useReadContract({
    abi: ERC20_ABI,
    address: token?.address,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && token), refetchInterval: 15_000 },
  })

  const call = useCallback(
    async <T>(path: string, init?: { method: 'POST'; body?: unknown }): Promise<T> => {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Not signed in')
      const res = await fetch(path, {
        method: init?.method ?? 'GET',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: init?.body ? JSON.stringify(init.body) : undefined,
      })
      if (res.status === 204) return undefined as T
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

  const fetchState = useCallback(
    (details?: CardholderDetails) =>
      call<CardholderState>('/api/state', { method: 'POST', body: { chainId, ...details } }),
    [call, chainId]
  )

  /** 409 means Reap has no user yet and Openfort has no name and phone number to create one with. */
  const loadState = useCallback(
    (details?: CardholderDetails) =>
      run('state', async () => {
        try {
          setState(await fetchState(details))
          setNeedsDetails(false)
        } catch (err) {
          if ((err as { status?: number }).status !== 409) throw err
          setNeedsDetails(true)
          if (details) throw err
        }
      }),
    [fetchState, run]
  )

  useEffect(() => {
    if (isAuthenticated && address) void loadState()
  }, [address, isAuthenticated, loadState])

  // KYC approval and deposit crediting both land asynchronously on Reap's side,
  // so poll until the state moves on. Deposits take a few blocks plus validation.
  const fetchRef = useRef(fetchState)
  fetchRef.current = fetchState
  const startBalance = useRef<number | null>(null)
  useEffect(() => {
    if (!awaiting) return
    let tries = 0
    const id = setInterval(async () => {
      tries += 1
      try {
        const next = await fetchRef.current()
        setState(next)
        const done =
          awaiting === 'kyc'
            ? next.kycStatus === 'APPROVED'
            : (next.balance?.availableBalance ?? 0) > (startBalance.current ?? 0)
        if (done || tries >= 60) setAwaiting(null)
      } catch {
        // Polling is best-effort; a failed poll shouldn't blank the screen.
      }
    }, 5_000)
    return () => clearInterval(id)
  }, [awaiting])

  const simulateKyc = useCallback(
    () =>
      run('kyc', async () => {
        await call('/api/kyc/simulate', { method: 'POST' })
        setAwaiting('kyc')
      }),
    [call, run]
  )

  /** The wallet signs Reap's auth message, which makes it the account's withdrawal signer. */
  const openAccount = useCallback(
    () =>
      run('account', async () => {
        if (!address) throw new Error('Wallet not ready')
        const { message } = await call<{ message: string }>('/api/account')
        const signature = await signMessageAsync({ message })
        await call('/api/account', { method: 'POST', body: { address, message, signature } })
        setState(await fetchState())
      }),
    [address, call, fetchState, run, signMessageAsync]
  )

  /** Load the card: the embedded wallet sends stablecoins to the account's own deposit address. */
  const deposit = useCallback(
    (amount: string) =>
      run('deposit', async () => {
        const to = state?.account?.depositAddress as `0x${string}` | null | undefined
        if (!to) throw new Error(`Reap has no deposit address for this account on chain ${chainId}`)
        if (!token || !publicClient) throw new Error(`No deposit token configured for chain ${chainId}`)
        if (!/^\d+(\.\d{1,6})?$/.test(amount) || Number(amount) < MIN_DEPOSIT)
          throw new Error(`Reap rejects deposits below ${MIN_DEPOSIT} USD`)

        const value = parseUnits(amount, TOKEN_DECIMALS)
        // A transfer above the balance reverts during gas estimation, which viem
        // reports as a gas error. Say what is actually wrong instead.
        const held = (walletBalance as bigint | undefined) ?? 0n
        if (held < value) {
          throw new Error(
            `The wallet holds ${formatUnits(held, TOKEN_DECIMALS)} ${token.symbol}. Ask your Reap contact for sandbox ${token.symbol}.`
          )
        }

        const hash = await writeContractAsync({
          abi: ERC20_ABI,
          address: token.address,
          functionName: 'transfer',
          args: [to, value],
        })
        await publicClient.waitForTransactionReceipt({ hash })
        void refetchWalletBalance()
        startBalance.current = state?.balance?.availableBalance ?? 0
        setAwaiting('deposit')
      }),
    [chainId, publicClient, refetchWalletBalance, run, state, token, walletBalance, writeContractAsync]
  )

  const reveal = useCallback(
    () =>
      run('reveal', async () => {
        // Single-use: fetch a fresh URL every time the details are opened.
        const { revealUrl } = await call<{ revealUrl: string }>('/api/card/reveal', { method: 'POST' })
        setRevealUrl(revealUrl)
      }),
    [call, run]
  )

  const purchase = useCallback(
    (amount: string, merchant: string) =>
      run('purchase', async () => {
        setLastPurchase(
          await call<CardTransaction>('/api/card/purchase', { method: 'POST', body: { amount, merchant } })
        )
        setState(await fetchState())
      }),
    [call, fetchState, run]
  )

  return {
    state,
    needsDetails,
    submitDetails: loadState,
    awaiting,
    busy,
    error,
    chainId,
    token,
    walletBalance: walletBalance !== undefined ? formatUnits(walletBalance as bigint, TOKEN_DECIMALS) : null,
    revealUrl,
    hideCard: () => setRevealUrl(null),
    lastPurchase,
    simulateKyc,
    openAccount,
    deposit,
    reveal,
    purchase,
  }
}
