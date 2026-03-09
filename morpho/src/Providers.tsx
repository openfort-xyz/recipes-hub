import React from "react";
import { OpenfortProvider } from "@openfort/react";
import { getDefaultConfig, OpenfortWagmiBridge } from "@openfort/react/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig } from "wagmi";
import { base } from "viem/chains";
import { getEnvironmentStatus } from "./utils/envValidation";

const queryClient = new QueryClient();

const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "Openfort Wallet App",
    walletConnectProjectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || "demo",
    chains: [base],
    ssr: false,
  })
);

export function Providers({ children }: { children: React.ReactNode }) {
  const envStatus = getEnvironmentStatus();

  // Avoid mounting providers when environment is misconfigured so the modal can surface errors first.
  if (!envStatus.isValid) {
    return <>{children}</>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <OpenfortWagmiBridge>
          <OpenfortProvider
            publishableKey={import.meta.env.VITE_OPENFORT_PUBLISHABLE_KEY}
            walletConfig={{
              shieldPublishableKey: import.meta.env.VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY,
              createEncryptedSessionEndpoint: `${import.meta.env.VITE_BACKEND_URL}/api/protected-create-encryption-session`,
              ethereum: {
                ethereumProviderPolicyId: import.meta.env.VITE_OPENFORT_POLICY_ID || undefined,
              }
            }}
          >
            {children}
          </OpenfortProvider>
        </OpenfortWagmiBridge>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
