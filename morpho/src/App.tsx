import { useEffect } from 'react';
import { OpenfortButton, useUser } from "@openfort/react";
import { BalanceCard } from './components/BalanceCard';
import { ActionButtons } from './components/ActionButtons';
import { useVaultOperations } from './hooks/useVaultOperations';
import { useVaultApy } from './hooks/useVaultApy';

function App() {
  const { isAuthenticated } = useUser();
  const {
    isSupplying,
    isWithdrawing,
    walletBalance,
    userVaultBalance,
    handleSupply,
    handleWithdraw,
    fetchVaultBalance
  } = useVaultOperations();
  const vaultApy = useVaultApy();

  useEffect(() => {
    fetchVaultBalance();
  }, [fetchVaultBalance]);

  return (
    <div className="min-h-screen bg-black/95 flex items-center justify-center p-4 font-figtree">
      <div className="w-full max-w-4xl mx-auto text-center flex flex-col items-center justify-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-12 tracking-tight">
          Openfort Wallet <br /> + Morpho
        </h1>

        <div className="flex flex-col md:flex-row gap-6 mb-6 justify-center items-center">
          <BalanceCard
            title="Wallet Balance"
            balance={walletBalance}
            currency="USDC"
            isConnected={isAuthenticated}
          />
          <BalanceCard
            title="Morpho Vault"
            balance={userVaultBalance}
            currency="USDC"
            apy={vaultApy}
            isConnected={isAuthenticated}
          />
        </div>

        <div className="bg-neutral-900 rounded-2xl border border-neutral-700 shadow-xl p-8 mb-6 flex flex-col items-center justify-center space-y-4">
          <OpenfortButton />
          {isAuthenticated && (
            <ActionButtons
              isSupplying={isSupplying}
              isWithdrawing={isWithdrawing}
              onSupply={handleSupply}
              onWithdraw={handleWithdraw}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
