"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { wagmiConfig } from "@/features/openfort/config/wagmi-config";
import { OpenfortProviderBoundary } from "@/features/openfort/providers/openfort-provider-boundary";
import { LiFiProvider } from "@/features/lifi/providers/lifi-provider";
import { OpenfortWagmiBridge } from "@openfort/react/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type { PropsWithChildren } from "react";
import type { CreateConnectorFn } from "wagmi";
import { WagmiProvider } from "wagmi";

const connectors: CreateConnectorFn[] = [];

export const AppProviders = ({ children }: PropsWithChildren) => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <OpenfortWagmiBridge>
            <OpenfortProviderBoundary>
              <LiFiProvider wagmiConfig={wagmiConfig} connectors={connectors}>
                {children}
              </LiFiProvider>
            </OpenfortProviderBoundary>
          </OpenfortWagmiBridge>
        </WagmiProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default AppProviders;
