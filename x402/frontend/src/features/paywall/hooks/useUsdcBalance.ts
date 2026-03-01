import { useCallback, useEffect, useState } from 'react'
import { formatUnits } from 'viem'

import {
  type BalanceClient,
  getUSDCBalance,
  type PaymentRequirements,
} from '../../../integrations/x402'

interface UseUsdcBalanceOptions {
  address?: `0x${string}`
  paymentRequirements?: PaymentRequirements
  publicClient: BalanceClient
  refreshIntervalMs: number
}

export function useUsdcBalance({
  address,
  paymentRequirements,
  publicClient,
  refreshIntervalMs,
}: UseUsdcBalanceOptions) {
  const [formattedBalance, setFormattedBalance] = useState('')
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false)

  const refreshBalance = useCallback(
    async (isManual = false) => {
      if (!address || !paymentRequirements) {
        setFormattedBalance('')
        if (isManual) {
          setIsRefreshingBalance(false)
        }
        return
      }

      if (isManual) {
        setIsRefreshingBalance(true)
      }

      try {
        const balance = await getUSDCBalance(
          publicClient as BalanceClient,
          address,
        )
        setFormattedBalance(formatUnits(balance, 6))
      } catch (error) {
        console.error('Failed to check USDC balance', error)
      } finally {
        if (isManual) {
          setIsRefreshingBalance(false)
        }
      }
    },
    [address, paymentRequirements, publicClient],
  )

  useEffect(() => {
    if (!address || !paymentRequirements) {
      setFormattedBalance('')
      return
    }

    void refreshBalance()
  }, [address, paymentRequirements, refreshBalance])

  useEffect(() => {
    if (!address || !paymentRequirements) {
      return
    }

    const intervalId = setInterval(() => {
      void refreshBalance()
    }, refreshIntervalMs)

    return () => clearInterval(intervalId)
  }, [address, paymentRequirements, refreshBalance, refreshIntervalMs])

  return {
    formattedBalance,
    isRefreshingBalance,
    refreshBalance,
  }
}
