import { chainId, evmAddress, useReserves } from '@aave/react'
import { useUser } from '@openfort/react'
import { useMemo } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { AaveSupplyCard } from './components/AaveSupplyCard'
import { ActionButtons } from './components/ActionButtons'
import { MainLayout } from './components/MainLayout'
import { WalletBalanceCard } from './components/WalletBalanceCard'
import { USDC_ADDRESSES, usdcAbi } from './contracts/usdc'
import { useAaveOperations } from './hooks/useAaveOperations'
import { useAaveSupplies } from './hooks/useAaveSupplies'

function App() {
  const { address, chainId: currentChainId } = useAccount()
  const { isAuthenticated } = useUser()

  const usdcAddress = currentChainId ? USDC_ADDRESSES[currentChainId] : undefined

  // Read USDC balance
  const { data: usdcBalance, refetch: refetchUsdcBalance } = useReadContract({
    address: usdcAddress,
    abi: usdcAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!usdcAddress,
    },
  }) as { data: bigint | undefined; refetch: () => Promise<any> }

  const user = address ? evmAddress(address) : undefined

  // Fetch Aave v4 reserves on the active chain (hub/spoke model).
  const { data: reserves } = useReserves({
    query: { chainIds: currentChainId ? [chainId(currentChainId)] : [] },
    user,
  })

  // Use custom hooks
  const { userSupplyPositions, suppliesLoading, suppliesError } = useAaveSupplies(user, currentChainId)

  // Locate the USDC reserve. In v4 the underlying token lives at
  // reserve.asset.underlying and supply/withdraw key off reserve.id.
  const usdcReserveRaw = useMemo(
    () => reserves?.find((r) => r.asset.underlying.info.symbol === 'USDC') ?? null,
    [reserves]
  )

  const usdcReserve = useMemo(
    () => (usdcReserveRaw ? { id: usdcReserveRaw.id, supplyCapReached: !usdcReserveRaw.canSupply } : null),
    [usdcReserveRaw]
  )

  // USDC supply balance (user position) + market supply APY (hub asset summary).
  const usdcSupplyData = useMemo(() => {
    const apy = usdcReserveRaw ? Number(usdcReserveRaw.asset.summary.supplyApy.value).toFixed(2) : '0.00'
    const position = userSupplyPositions?.find((p) => p.balance.token.info.symbol === 'USDC')
    const rawBalance = position ? String(position.balance.amount.value) : '0'
    return { rawBalance, apy }
  }, [userSupplyPositions, usdcReserveRaw])

  // Use Aave operations hook
  const {
    handleDepositToAave,
    handleWithdrawFromAave,
    isLoading,
    isSupplying,
    isWithdrawing,
    supplying,
    withdrawing,
    supplyError,
    withdrawError,
  } = useAaveOperations(usdcReserve, usdcSupplyData, refetchUsdcBalance)

  return (
    <MainLayout>
      {/* Balance Cards Container */}
      <div className="flex flex-col md:flex-row gap-6 mb-6 justify-center items-center">
        <WalletBalanceCard isConnected={isAuthenticated} address={address} usdcBalance={usdcBalance} />
        <AaveSupplyCard
          isConnected={isAuthenticated}
          address={address}
          suppliesLoading={suppliesLoading}
          usdcSupplyData={usdcSupplyData}
          suppliesError={suppliesError}
        />
      </div>

      <ActionButtons
        isConnected={isAuthenticated}
        isLoading={isLoading}
        usdcReserve={usdcReserve}
        usdcBalance={usdcBalance}
        usdcSupplyData={usdcSupplyData}
        isSupplying={isSupplying}
        supplyingLoading={supplying.loading}
        isWithdrawing={isWithdrawing}
        withdrawingLoading={withdrawing.loading}
        onDepositToAave={handleDepositToAave}
        onWithdrawFromAave={handleWithdrawFromAave}
        supplyError={supplyError}
        withdrawError={withdrawError}
      />
    </MainLayout>
  )
}

export default App
