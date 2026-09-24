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
}

export const useOpenfortWallet = (): OpenfortWalletState => {
  const wallet = useEthereumEmbeddedWallet();
  const { isAuthenticated } = useUser();
  const { address, status: accountStatus } = useAccount();
  const chainId = useChainId();

  const walletAddress = address ?? "";
  const isConnected = accountStatus === "connected" && isAuthenticated;
  const isReady = isConnected && !!walletAddress;

  return {
    address: walletAddress,
    chainId,
    isReady,
    isConnected,
    isStatusLoading: wallet.isLoading && !isConnected,
    isAuthenticated,
  };
};
