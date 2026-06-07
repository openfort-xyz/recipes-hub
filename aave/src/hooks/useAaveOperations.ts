import type { ReserveId } from '@aave/graphql'
import { bigDecimal, evmAddress, useSupply, useWithdraw } from '@aave/react'
import { useSendTransaction, useSignTypedData } from '@aave/react/viem'
import { useState } from 'react'
import { usePublicClient, useWalletClient } from 'wagmi'

type UsdcReserve = { id: ReserveId; supplyCapReached: boolean }
type UsdcSupplyData = { rawBalance: string; apy: string }

/**
 * Supply/withdraw USDC on Aave v4.
 *
 * v4 replaces the v3 market/currency/chainId request with a single `reserve`
 * id, and drives execution through a plan handler passed to `useSupply` /
 * `useWithdraw`. The handler sends each step (approval, optional permit
 * signature, main transaction) through the connected viem wallet. The supply
 * list is refreshed declaratively by `useUserSupplies`, so only the wallet
 * balance needs an explicit refetch here.
 */
export function useAaveOperations(
  usdcReserve: UsdcReserve | null,
  usdcSupplyData: UsdcSupplyData,
  refetchUsdcBalance: () => Promise<unknown>
) {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const [sendTransaction, sending] = useSendTransaction(walletClient)
  const [signTypedData] = useSignTypedData(walletClient)

  const [supply, supplying] = useSupply((plan) => {
    switch (plan.__typename) {
      case 'TransactionRequest':
        return sendTransaction(plan)
      case 'Erc20Approval':
        return plan.bySignature ? signTypedData(plan.bySignature) : sendTransaction(plan.byTransaction)
      case 'PreContractActionRequired':
        return sendTransaction(plan.transaction)
    }
  })

  const [withdraw, withdrawing] = useWithdraw((plan) => {
    switch (plan.__typename) {
      case 'TransactionRequest':
        return sendTransaction(plan)
      case 'PreContractActionRequired':
        return sendTransaction(plan.transaction)
    }
  })

  const [isSupplying, setIsSupplying] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [supplyError, setSupplyError] = useState<string | null>(null)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)

  const settle = async (hash: `0x${string}`) => {
    try {
      await publicClient?.waitForTransactionReceipt({ hash })
    } catch (receiptError) {
      console.error('Waiting for transaction receipt failed:', receiptError)
    }
    await refetchUsdcBalance()
  }

  const parseError = (error: unknown) => {
    const msg = error instanceof Error ? error.message : String(error)
    const match = msg.match(/\[GraphQL\] Bad user input - (.+)/)
    return match ? match[1] : msg
  }

  const handleDepositToAave = async () => {
    if (!walletClient?.account?.address || !usdcReserve) return
    setIsSupplying(true)
    setSupplyError(null)
    try {
      const result = await supply({
        reserve: usdcReserve.id,
        amount: { erc20: { value: bigDecimal(0.1) } },
        sender: evmAddress(walletClient.account.address),
      })
      if (result.isErr()) {
        setSupplyError(parseError(result.error))
        return
      }
      await settle(result.value.txHash as `0x${string}`)
    } catch (error) {
      setSupplyError(parseError(error))
    } finally {
      setIsSupplying(false)
    }
  }

  const handleWithdrawFromAave = async () => {
    if (!walletClient?.account?.address || !usdcReserve) return
    if (!usdcSupplyData.rawBalance || Number.parseFloat(usdcSupplyData.rawBalance) === 0) return
    setIsWithdrawing(true)
    setWithdrawError(null)
    try {
      const result = await withdraw({
        reserve: usdcReserve.id,
        amount: { erc20: { max: true } },
        sender: evmAddress(walletClient.account.address),
      })
      if (result.isErr()) {
        setWithdrawError(parseError(result.error))
        return
      }
      await settle(result.value.txHash as `0x${string}`)
    } catch (error) {
      setWithdrawError(parseError(error))
    } finally {
      setIsWithdrawing(false)
    }
  }

  const isLoading = supplying.loading || sending.loading || isSupplying || withdrawing.loading || isWithdrawing

  return {
    handleDepositToAave,
    handleWithdrawFromAave,
    isLoading,
    isSupplying,
    isWithdrawing,
    supplying,
    withdrawing,
    supplyError,
    withdrawError,
  }
}
