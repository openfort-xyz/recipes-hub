// components/UserScreen.tsx
import { useCallback, useEffect, useState } from "react";
import { CreateWalletsScreen } from "./onboarding/CreateWalletsScreen";
import { FaucetScreen } from "./onboarding/FaucetScreen";
import { WaitingForFundsScreen } from "./onboarding/WaitingForFundsScreen";
import { MainAppScreen } from "./MainAppScreen";
import { WalletData } from "@/types/wallet";
import { USDC_CONTRACT_ADDRESS, ERC20_BALANCE_TIMEOUT_MS } from "../constants/erc20";
import { getErc20Balance } from "../utils/erc20";
import { useEmbeddedEthereumWallet, useSignOut, useUser } from "@openfort/react-native";

export const UserScreen = () => {
  type Screen = 'create-wallets' | 'faucet' | 'waiting-for-funds' | 'main-app';
  const { activeWallet, setActive: setActiveWallet, create: createWallet } = useEmbeddedEthereumWallet();
  const { user } = useUser();
  const { signOut: logout } = useSignOut();
  const isCreating = false;
  
  const [currentScreen, setCurrentScreen] = useState<Screen>('create-wallets');
  const [walletA, setWalletA] = useState<WalletData | null>(null);
  const [walletB, setWalletB] = useState<WalletData | null>(null);
  const [transferAmount, setTransferAmount] = useState("1");
  const [isTransferring, setIsTransferring] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [ethBalances, setEthBalances] = useState<{[key: string]: string}>({});

  const getETHBalance = useCallback(async (walletData: WalletData): Promise<string> => {
    try {
      if (!walletData.wallet) return "0";
      const provider = await walletData.wallet.getProvider();
      
      const result = await provider.request({
        method: "eth_getBalance",
        params: [walletData.address, "latest"],
      });
      
      // Convert from hex to decimal and format (ETH has 18 decimals)
      const balance = parseInt(result as string, 16);
      return (balance / 1e18).toFixed(6);
    } catch (error) {
      console.error("Error fetching ETH balance:", error);
      return "0";
    }
  }, []);

  const getUSDCBalance = useCallback(async (walletData: WalletData): Promise<string> => {
    try {
      if (!walletData.wallet) return "0";
      const provider = await walletData.wallet.getProvider();
      const result = await getErc20Balance(provider, USDC_CONTRACT_ADDRESS, walletData.address, 6, ERC20_BALANCE_TIMEOUT_MS);
      return (result ?? null) as any;
    } catch (error) {
      console.error("Error fetching USDC balance:", error);
      return null as any;
    }
  }, []);

  const updateBalances = useCallback(async () => {
    if (!walletA || !walletB) return;

    try {
      const [balanceA, balanceB, ethA, ethB] = await Promise.all([
        getUSDCBalance(walletA),
        getUSDCBalance(walletB),
        getETHBalance(walletA),
        getETHBalance(walletB)
      ]);

      // Only update if we got valid balances (not null from timeout)
      if (balanceA !== null) {
        setWalletA(prev => prev ? { ...prev, balance: balanceA } : null);
      }
      if (balanceB !== null) {
        setWalletB(prev => prev ? { ...prev, balance: balanceB } : null);
      }
      
      // Update ETH balances
      setEthBalances({
        [walletA.address]: ethA,
        [walletB.address]: ethB
      });
      
      // Mark initial load as complete after first successful update
      if (isInitialLoad && (balanceA !== null || balanceB !== null)) {
        setIsInitialLoad(false);
      }
    } catch (error) {
      console.error("Error updating balances:", error);
    }
  }, [JSON.stringify(walletA), JSON.stringify(walletB), getUSDCBalance, getETHBalance, isInitialLoad]);

  useEffect(() => {
    if (currentScreen === 'main-app' && walletA && walletB) {
      // Initial balance fetch only
      updateBalances();
    }
  }, [currentScreen, JSON.stringify(walletA), JSON.stringify(walletB), updateBalances]);

  if (!user) return null;

  switch (currentScreen) {
    case 'create-wallets':
      return (
        <CreateWalletsScreen
          walletA={walletA}
          walletB={walletB}
          onWalletACreated={setWalletA}
          onWalletBCreated={setWalletB}
          onNext={() => setCurrentScreen('faucet')}
          createWallet={createWallet}
          isCreating={isCreating}
        />
      );
    case 'faucet':
      return (
        <FaucetScreen
          walletB={walletB}
          onNext={() => setCurrentScreen('waiting-for-funds')}
        />
      );
    case 'waiting-for-funds':
      return (
        <WaitingForFundsScreen
          walletB={walletB}
          onNext={() => setCurrentScreen('main-app')}
          onBack={() => setCurrentScreen('faucet')}
          onUpdateBalance={(balance) => {
            setWalletB(prev => prev ? { ...prev, balance } : null);
          }}
          activeWallet={activeWallet}
        />
      );
    case 'main-app':
      return (
        <MainAppScreen
          walletA={walletA}
          walletB={walletB}
          transferAmount={transferAmount}
          setTransferAmount={setTransferAmount}
          isTransferring={isTransferring}
          setIsTransferring={setIsTransferring}
          isInitialLoad={isInitialLoad}
          updateBalances={updateBalances}
          logout={logout}
          ethBalances={ethBalances}
          activeWallet={activeWallet}
          setActiveWallet={setActiveWallet}
        />
      );
    default:
      return (
        <CreateWalletsScreen
          walletA={walletA}
          walletB={walletB}
          onWalletACreated={setWalletA}
          onWalletBCreated={setWalletB}
          onNext={() => setCurrentScreen('faucet')}
          createWallet={createWallet}
          isCreating={isCreating}
        />
      );
  }
};
