import { useUser, useWallets } from "@openfort/react";
import { useAccount, useChainId } from "wagmi";

export interface OpenfortWalletState {
  address: string;
  chainId?: number;
  isReady: boolean;
  isConnected: boolean;
  isStatusLoading: boolean;
  isAuthenticated: boolean;
  playerName?: string;
}

export const useOpenfortWallet = (): OpenfortWalletState => {
  const { isLoadingWallets, activeWallet } = useWallets();
  const { user, isAuthenticated } = useUser();
  const { address } = useAccount();
  const chainId = useChainId();

  const walletAddress = address ?? "";
  const isConnected = !!activeWallet && isAuthenticated;
  const isReady = !isLoadingWallets && isConnected && !!walletAddress;

  return {
    address: walletAddress,
    chainId,
    isReady,
    isConnected,
    isStatusLoading: isLoadingWallets,
    isAuthenticated,
    playerName:
      user?.name ||
      user?.email ||
      user?.id,
  };
};
