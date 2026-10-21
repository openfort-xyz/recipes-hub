'use client'

import { useUser } from '@openfort/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { formatUnits, parseUnits } from 'viem'
import { useAccount, useChainId, usePublicClient, useReadContract, useWriteContract } from 'wagmi'
import { ERC20_ABI, USDC_ADDRESS, USDC_DECIMALS } from '@/features/tala/constants'
import type { Loan, LoanOffer, LoanTerms } from '@/features/tala/types'

export interface LoanState {
  loan: Loan | null
  currency: string
  environment: 'mock' | 'tala'
  repaymentAddress: `0x${string}` | null
}

type Offer = LoanOffer | { status: 'not_enrolled' }

const PHONE_KEY = 'tala-recipe-phone'

function storedPhone() {
  try {
    return localStorage.getItem(PHONE_KEY) ?? ''
  } catch {
    return ''
  }
}

/** Everything the credit screens need: the offer, the loan, borrowing and repaying. */
export function useCredit() {
  const { getAccessToken, isAuthenticated } = useUser()
  const { address } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const [state, setState] = useState<LoanState | null>(null)
  const [offer, setOffer] = useState<Offer | null>(null)
  const [terms, setTerms] = useState<(LoanTerms & { duration: number }) | null>(null)
  const [phone, setPhoneState] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const clearTerms = useCallback(() => setTerms(null), [])

  useEffect(() => setPhoneState(storedPhone()), [])
  const setPhone = useCallback((value: string) => {
    setPhoneState(value)
    try {
      localStorage.setItem(PHONE_KEY, value)
    } catch {
      // Remembering the number is a convenience; without storage the user retypes it.
    }
  }, [])

  const usdc = USDC_ADDRESS[chainId]
  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    abi: ERC20_ABI,
    address: usdc,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && usdc), refetchInterval: 15_000 },
  })

  const call = useCallback(
    async <T>(path: string, body?: unknown): Promise<T> => {
      const token = await getAccessToken()
      if (!token) throw new Error('Not signed in')
      const res = await fetch(path, {
        method: body ? 'POST' : 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? `Request failed (${res.status})`)
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

  const refresh = useCallback(async () => {
    const next = await call<LoanState>('/api/credit/loan')
    setState(next)
    if (!next.loan) setOffer(await call<Offer>('/api/credit/offer'))
  }, [call])

  useEffect(() => {
    if (isAuthenticated && address) void run('load', refresh)
  }, [address, isAuthenticated, refresh, run])

  // Underwriting is asynchronous: poll while Tala is still deciding.
  const callRef = useRef(call)
  callRef.current = call
  const processing = offer?.status === 'offer_processing'
  useEffect(() => {
    if (!processing) return
    const id = setInterval(async () => {
      try {
        setOffer(await callRef.current<Offer>('/api/credit/offer'))
      } catch {
        // Best-effort; the next tick tries again.
      }
    }, 3_000)
    return () => clearInterval(id)
  }, [processing])

  const enroll = useCallback(
    () =>
      run('enroll', async () => {
        await call('/api/credit/opt-in', { phoneNumber: phone })
        setOffer(await call<Offer>('/api/credit/offer'))
      }),
    [call, phone, run]
  )

  const quote = useCallback(
    (amount: number, duration: number) =>
      run('terms', async () => {
        setTerms({ ...(await call<LoanTerms>('/api/credit/offer', { amount, duration })), duration })
      }),
    [call, run]
  )

  const borrow = useCallback(
    () =>
      run('borrow', async () => {
        if (!terms) throw new Error('Review the terms first')
        await call('/api/credit/loan', { address, amount: terms.loanAmount.amount, duration: terms.duration })
        setTerms(null)
        await refresh()
        void refetchBalance()
      }),
    [address, call, refetchBalance, refresh, run, terms]
  )

  /** Send USDC from the embedded wallet to the repayment address, then have the server verify and report it. */
  const repay = useCallback(
    (amount: string) =>
      run('repay', async () => {
        const to = state?.repaymentAddress
        if (!to) throw new Error('TALA_REPAYMENT_ADDRESS is not configured on the server')
        if (!usdc || !publicClient) throw new Error(`USDC is not configured for chain ${chainId}`)
        if (!/^\d+(\.\d{1,6})?$/.test(amount)) throw new Error('Enter an amount like 5 or 5.25')
        const value = parseUnits(amount, USDC_DECIMALS)
        if (value <= 0n) throw new Error('Enter an amount above zero')

        // A transfer above the balance reverts during gas estimation, which viem
        // reports as a gas error. Say what is actually wrong instead.
        const held = (balanceData as bigint | undefined) ?? 0n
        if (held < value) {
          throw new Error(
            `The wallet holds ${formatUnits(held, USDC_DECIMALS)} USDC. Get Base Sepolia USDC from faucet.circle.com.`
          )
        }

        const hash = await writeContractAsync({
          abi: ERC20_ABI,
          address: usdc,
          functionName: 'transfer',
          args: [to, value],
        })
        await publicClient.waitForTransactionReceipt({ hash })
        void refetchBalance()
        const next = await call<{ loan: Loan | null }>('/api/credit/repay', {
          address,
          txHash: hash,
          phoneNumber: phone,
        })
        setState((prev) => (prev ? { ...prev, loan: next.loan } : prev))
        if (!next.loan) setOffer(await call<Offer>('/api/credit/offer'))
      }),
    [address, balanceData, call, chainId, phone, publicClient, refetchBalance, run, state, usdc, writeContractAsync]
  )

  return {
    state,
    offer,
    terms,
    phone,
    setPhone,
    busy,
    error,
    chainId,
    usdcBalance: balanceData !== undefined ? formatUnits(balanceData as bigint, USDC_DECIMALS) : null,
    enroll,
    quote,
    clearTerms,
    borrow,
    repay,
  }
}
