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
  const { address, status: accountStatus } = useAccount();
  const chainId = useChainId();

  const walletAddress = address ?? "";
  // Sign-in can use an Openfort embedded wallet or an external wallet (SIWE).
  // Both surface through wagmi, so the wagmi account is the connection source
  // of truth — the embedded-wallet status alone would never report external
  // wallets as connected.
  const isConnected = accountStatus === "connected" && isAuthenticated;
  const isReady = isConnected && !!walletAddress;

  return {
    address: walletAddress,
    chainId,
    isReady,
    isConnected,
    isStatusLoading: wallet.isLoading && !isConnected,
    isAuthenticated,
    playerName:
      user?.name ||
      user?.email ||
      user?.id,
  };
};
