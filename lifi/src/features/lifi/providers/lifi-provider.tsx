"use client";

import { useSyncWagmiConfig } from "@lifi/wallet-management";
import { useQuery } from "@tanstack/react-query";
import { type FC, type PropsWithChildren, useEffect, useState } from "react";
import type { Config, CreateConnectorFn } from "wagmi";
import { initializeLiFiConfig, loadSupportedChains } from "../services/lifi-config";
import { useStatus } from "@openfort/react";

interface LiFiProviderProps extends PropsWithChildren {
  wagmiConfig: Config;
  connectors: CreateConnectorFn[];
}

export const LiFiProvider: FC<LiFiProviderProps> = ({
  children,
  wagmiConfig,
  connectors,
}) => {
  const { isLoading: isStatusLoading } = useStatus();
  const [isInitialized, setIsInitialized] = useState(false);
  const isReady = !isStatusLoading;

  const {
    data: chains,
    error: chainsError,
    isLoading: chainsLoading,
  } = useQuery({
    queryKey: ["lifi-chains"],
    queryFn: loadSupportedChains,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: 1000,
    enabled: isReady,
  });

  useEffect(() => {
    if (isReady && !isInitialized) {
      try {
        initializeLiFiConfig(wagmiConfig);
        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize LiFi config", error);
        setIsInitialized(false);
      }
    }
  }, [isReady, isInitialized, wagmiConfig]);

  useSyncWagmiConfig(wagmiConfig, connectors, chains);

  if (!isReady || chainsLoading || !isInitialized) {
    const message = !isReady
      ? "Loading Openfort session..."
      : chainsLoading
      ? "Loading LiFi chains..."
      : "Configuring LiFi...";

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
