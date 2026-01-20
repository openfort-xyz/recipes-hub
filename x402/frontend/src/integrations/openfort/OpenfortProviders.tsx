import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { createConfig, WagmiProvider } from 'wagmi';
import { useState } from 'react';
import { AuthProvider, getDefaultConfig, OpenfortProvider, RecoveryMethod } from "@openfort/react";
import { baseSepolia } from 'viem/chains';

const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: 'Openfort x402 demo',
    chains: [baseSepolia],
    walletConnectProjectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID,
  }),
);

export function OpenfortProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OpenfortProvider
          debugMode
          publishableKey={import.meta.env.VITE_OPENFORT_PUBLISHABLE_KEY!}

          // Set the wallet configuration. In this example, we will be using the embedded signer.
          walletConfig={{
            shieldPublishableKey: import.meta.env.VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY!, // The Shield publishable key from https://dashboard.openfort.io
            ethereumProviderPolicyId: import.meta.env.VITE_OPENFORT_POLICY_ID, // The policy ID for sponsoring transactions
            createEncryptedSessionEndpoint: import.meta.env.VITE_CREATE_ENCRYPTED_SESSION_ENDPOINT, // The endpoint to create an encryption session for automatic wallet recovery
          }}

          uiConfig={{
            authProviders: [
              AuthProvider.EMAIL_OTP,
              AuthProvider.GUEST,
              AuthProvider.GOOGLE,
              AuthProvider.WALLET,
            ],
            walletRecovery: {
              defaultMethod: RecoveryMethod.PASSKEY,
            },
          }}
        >
          <>
            {children}
          </>
        </OpenfortProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
