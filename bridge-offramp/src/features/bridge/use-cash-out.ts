'use client'

import { useUser } from '@openfort/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { formatUnits, parseUnits } from 'viem'
import { useAccount, useChainId, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { ERC20_ABI, TERMINAL_DRAIN_STATES, USDC_ADDRESS, USDC_DECIMALS } from '@/features/bridge/constants'
import type { Drain } from '@/features/bridge/types'

export interface BankAccount {
  id: string
  currency: 'usd' | 'eur'
  bankName: string
  last4: string
}

export interface CashOutAddress {
  id: string
  address: `0x${string}`
  chain: string
  rail: 'ach' | 'wire' | 'sepa'
  destinationCurrency: 'usd' | 'eur'
}

export interface AccountState {
  environment: 'sandbox' | 'production'
  kycStatus: string
  customerId: string | null
  kycLinkId: string | null
  bankAccounts: BankAccount[]
  cashOutAddresses: CashOutAddress[]
}

export interface BankForm {
  currency: 'usd' | 'eur'
  bankName: string
  accountOwnerName: string
  firstName?: string
  lastName?: string
  routingNumber?: string
  accountNumber?: string
  iban?: string
  bic?: string
  ibanCountry?: string
  address: {
    street_line_1: string
    city: string
    state?: string
    postal_code: string
    country: string
  }
}

/** Everything the cash-out screens need, in one hook. */
export function useCashOut(currency: 'usd' | 'eur' = 'usd') {
  const { getAccessToken, isAuthenticated } = useUser()
  const { address } = useAccount()
  const chainId = useChainId()
  const { writeContractAsync } = useWriteContract()

  const [account, setAccount] = useState<AccountState | null>(null)
  const [drains, setDrains] = useState<Drain[]>([])
  const [simulated, setSimulated] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingTx, setPendingTx] = useState<`0x${string}` | null>(null)

  const receipt = useWaitForTransactionReceipt({ hash: pendingTx ?? undefined })

  const usdc = USDC_ADDRESS[chainId]
  const balance = useReadContract({
    abi: ERC20_ABI,
    address: usdc,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && usdc), refetchInterval: 15_000 },
  })

  const authHeaders = useCallback(async () => {
    const token = await getAccessToken()
    if (!token) throw new Error('Not signed in')
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  }, [getAccessToken])

  const call = useCallback(
    async <T>(path: string, init?: { method: 'POST'; body: unknown }): Promise<T> => {
      const res = await fetch(path, {
        method: init?.method ?? 'GET',
        headers: await authHeaders(),
        body: init ? JSON.stringify(init.body) : undefined,
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? `Request failed (${res.status})`)
      return payload as T
    },
    [authHeaders]
  )

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      setAccount(await call<AccountState>('/api/account'))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your account')
    }
  }, [call, isAuthenticated])

  const refreshDrains = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const res = await call<{ drains: Drain[]; simulated: boolean }>(`/api/drains?currency=${currency}`)
      setDrains(res.drains)
      setSimulated(res.simulated)
    } catch {
      // Tracking is best-effort; a failed poll shouldn't blank the screen.
    }
  }, [call, currency, isAuthenticated])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Poll only while something is still moving.
  const hasPending = drains.some((d) => !TERMINAL_DRAIN_STATES.has(d.state))
  const refreshDrainsRef = useRef(refreshDrains)
  refreshDrainsRef.current = refreshDrains
  useEffect(() => {
    void refreshDrainsRef.current()
    if (!hasPending) return
    const id = setInterval(() => void refreshDrainsRef.current(), 4_000)
    return () => clearInterval(id)
  }, [hasPending])

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

  const startKyc = useCallback(
    (fullName: string) =>
      run('kyc', async () => {
        const res = await call<{ kycUrl: string; tosUrl: string }>('/api/kyc', {
          method: 'POST',
          body: { fullName, sepa: currency === 'eur' },
        })
        // Terms first: Bridge won't approve without them.
        window.open(res.tosUrl, '_blank', 'noopener')
        window.open(res.kycUrl, '_blank', 'noopener')
        await refresh()
      }),
    [call, currency, refresh, run]
  )

  const simulateApproval = useCallback(
    () =>
      run('simulate', async () => {
        await call('/api/kyc/simulate', { method: 'POST', body: {} })
        await refresh()
      }),
    [call, refresh, run]
  )

  const linkBank = useCallback(
    (form: BankForm) =>
      run('bank', async () => {
        await call('/api/bank-accounts', { method: 'POST', body: form })
        await refresh()
      }),
    [call, refresh, run]
  )

  const createCashOutAddress = useCallback(
    () =>
      run('address', async () => {
        if (!address) throw new Error('Connect a wallet first')
        await call('/api/cash-out-address', {
          method: 'POST',
          body: { currency, returnAddress: address },
        })
        await refresh()
      }),
    [address, call, currency, refresh, run]
  )

  const cashOutAddress = account?.cashOutAddresses.find((a) => a.destinationCurrency === currency) ?? null

  const cashOut = useCallback(
    (amount: string) =>
      run('cashout', async () => {
        if (!cashOutAddress) throw new Error('Create a cash-out address first')
        if (!usdc) throw new Error(`USDC is not configured for chain ${chainId}`)

        const hash = await writeContractAsync({
          abi: ERC20_ABI,
          address: usdc,
          functionName: 'transfer',
          args: [cashOutAddress.address, parseUnits(amount, USDC_DECIMALS)],
        })
        setPendingTx(hash)

        // Tell the backend what was sent. In production this is a no-op —
        // Bridge sees the deposit itself.
        await call('/api/drains', { method: 'POST', body: { amount, txHash: hash, currency } })
        await refreshDrains()
      }),
    [call, cashOutAddress, chainId, currency, refreshDrains, run, usdc, writeContractAsync]
  )

  return {
    account,
    cashOutAddress,
    bankAccount: account?.bankAccounts.find((b) => b.currency === currency) ?? null,
    drains,
    simulated,
    busy,
    error,
    pendingTx,
    isConfirming: receipt.isLoading,
    usdcBalance: balance.data !== undefined ? formatUnits(balance.data as bigint, USDC_DECIMALS) : null,
    startKyc,
    simulateApproval,
    linkBank,
    createCashOutAddress,
    cashOut,
    refresh,
  }
}
