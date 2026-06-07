"use client";

import { useQuery } from "@tanstack/react-query";
import { type FC, type PropsWithChildren, useState } from "react";
import type { Config } from "wagmi";
import { initializeLiFiConfig, loadSupportedChains } from "../services/lifi-config";
import { useEthereumEmbeddedWallet } from "@openfort/react/ethereum";

interface LiFiProviderProps extends PropsWithChildren {
  wagmiConfig: Config;
}

export const LiFiProvider: FC<LiFiProviderProps> = ({ children, wagmiConfig }) => {
  const { isLoading: isLoadingWallets } = useEthereumEmbeddedWallet();
  const isReady = !isLoadingWallets;

  // v4's createClient is synchronous, so initialize once before any action
  // (loadSupportedChains and the swap hooks all read the shared client).
  const [isInitialized] = useState(() => {
    initializeLiFiConfig(wagmiConfig);
    return true;
  });

  const { error: chainsError, isLoading: chainsLoading } = useQuery({
    queryKey: ["lifi-chains"],
    queryFn: loadSupportedChains,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: 1000,
    enabled: isReady && isInitialized,
  });

  if (!isReady || chainsLoading) {
    const message = !isReady ? "Loading Openfort session..." : "Loading LiFi chains...";

    return (
      <div className="flex justify-center items-center h-[100px] text-sm opacity-70">
        {message}
      </div>
    );
  }

  if (chainsError) {
    return (
      <div className="flex justify-center items-center h-[100px] text-sm text-red-500">
        Failed to load LiFi chains. Please refresh and try again.
      </div>
    );
  }

  return <>{children}</>;
};
