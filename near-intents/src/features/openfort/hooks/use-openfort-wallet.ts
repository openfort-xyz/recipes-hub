import { useUser } from "@openfort/react";
import { useEthereumEmbeddedWallet } from "@openfort/react/ethereum";
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
  const wallet = useEthereumEmbeddedWallet();
  const { user, isAuthenticated } = useUser();
  const { address } = useAccount();
  const chainId = useChainId();

  const walletAddress = address ?? "";
  const isConnected = wallet.status === "connected" && isAuthenticated;
  const isReady = !wallet.isLoading && isConnected && !!walletAddress;

  return {
    address: walletAddress,
    chainId,
    isReady,
    isConnected,
    isStatusLoading: wallet.isLoading,
    isAuthenticated,
    playerName:
      user?.name ||
      user?.email ||
      user?.id,
  };
};
