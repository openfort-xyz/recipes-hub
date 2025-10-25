import React from "react";
import {
  OpenfortProvider,
  getDefaultConfig,
} from "@openfort/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig } from "wagmi";
import { base } from "viem/chains";
import { getEnvironmentStatus } from "./utils/envValidation";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const envStatus = getEnvironmentStatus();

  // Avoid mounting providers when environment is misconfigured so the modal can surface errors first.
  if (!envStatus.isValid) {
    return <>{children}</>;
  }

  const config = createConfig(
    getDefaultConfig({
      appName: "Openfort Wallet App",
      walletConnectProjectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || "demo",
      chains: [base],
      ssr: false,
    })
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
          <OpenfortProvider
            // Set the publishable key of your Openfort account. This field is required.
            publishableKey={import.meta.env.VITE_OPENFORT_PUBLISHABLE_KEY}
            // Set the wallet configuration. In this example, we will be using the embedded wallet.
            walletConfig={{
              shieldPublishableKey: import.meta.env.VITE_OPENFORT_SHIELD_PUBLIC_KEY,
              createEncryptedSessionEndpoint: `${import.meta.env.VITE_BACKEND_URL}/api/create-encryption-session`,
              ethereumProviderPolicyId: import.meta.env.VITE_OPENFORT_POLICY_ID || undefined,
            }}
          >
            {children}
          </OpenfortProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
