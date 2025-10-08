import { useStatus, useUser } from "@openfort/react";
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
  const { isLoading: isStatusLoading, isConnected, isAuthenticated } =
    useStatus();
  const { user } = useUser();
  const { address } = useAccount();
  const chainId = useChainId();

  const walletAddress = address ?? "";
  const isReady = !isStatusLoading && isConnected && !!walletAddress;

  return {
    address: walletAddress,
    chainId,
    isReady,
    isConnected,
    isStatusLoading,
    isAuthenticated,
    playerName:
      user?.player?.name ||
      user?.linkedAccounts?.[0]?.email ||
      user?.linkedAccounts?.[0]?.username,
  };
};
