import { useUser } from "@openfort/react";
import { useMemo } from 'react';
import { useAccount, useReadContract } from "wagmi";
import { usdcAbi, USDC_ADDRESSES } from './contracts/usdc';
import { evmAddress, useAaveMarkets, chainId } from "@aave/react";
import { MainLayout } from './components/MainLayout';
import { WalletBalanceCard } from './components/WalletBalanceCard';
import { AaveSupplyCard } from './components/AaveSupplyCard';
import { ActionButtons } from './components/ActionButtons';
import { useAaveSupplies } from './hooks/useAaveSupplies';
import { useAaveOperations } from './hooks/useAaveOperations';

function App() {
  const { address, chainId: currentChainId } = useAccount();
  const { isAuthenticated } = useUser();


  const usdcAddress = currentChainId ? USDC_ADDRESSES[currentChainId] : undefined;

  // Read USDC balance
  const { data: usdcBalance, refetch: refetchUsdcBalance } = useReadContract({
    address: usdcAddress,
    abi: usdcAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!usdcAddress,
    },
  }) as { data: bigint | undefined; refetch: () => Promise<any> };

  const user = address ? evmAddress(address) : undefined;

  // Fetch all Aave markets
  const { data: markets } = useAaveMarkets({
    chainIds: currentChainId ? [chainId(currentChainId)] : [],
    user,
  });

  // Use custom hooks
  const { userSupplyPositions, suppliesLoading, suppliesError, refreshUserSupplies } = useAaveSupplies(user, markets);

  // Find USDC supply balance and APY
  const usdcSupplyData = useMemo(() => {
    if (!userSupplyPositions || userSupplyPositions.length === 0) {
      return { rawBalance: "0", apy: "0.00" };
    }
    const usdcSupply = userSupplyPositions.find((supply) =>
      supply.currency?.symbol === 'USDC'
    );
    if (usdcSupply?.balance?.amount?.value && usdcSupply?.apy) {
      return {
        rawBalance: usdcSupply.balance.amount.value,
        apy: usdcSupply.apy.formatted
      };
    }
    return { rawBalance: "0", apy: "0.00" };
  }, [userSupplyPositions]);


  // Get USDC reserve for operations
  const usdcReserve = useMemo(() => {
    if (!markets || markets.length === 0) return null;
    const market = markets[0];
    const usdcSupplyReserve = market.supplyReserves.find(reserve =>
      reserve.underlyingToken.symbol === 'USDC'
    );
    if (usdcSupplyReserve) {
      return {
        marketAddress: market.address,
        currencyAddress: usdcSupplyReserve.underlyingToken.address,
        chainId: market.chain.chainId,
        supplyCapReached: usdcSupplyReserve.supplyInfo?.supplyCapReached ?? false,
      };
    }
    return null;
  }, [markets]);

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
  } = useAaveOperations(usdcReserve, usdcSupplyData, refetchUsdcBalance, refreshUserSupplies);

  return (
    <MainLayout>
      {/* Balance Cards Container */}
      <div className="flex flex-col md:flex-row gap-6 mb-6 justify-center items-center">
        <WalletBalanceCard
          isConnected={isAuthenticated}
          address={address}
          usdcBalance={usdcBalance}
        />
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
  );
}

export default App;
