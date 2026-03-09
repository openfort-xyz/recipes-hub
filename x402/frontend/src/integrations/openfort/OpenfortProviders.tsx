import { AuthProvider, OpenfortProvider, RecoveryMethod } from '@openfort/react'
import { getDefaultConfig, OpenfortWagmiBridge } from '@openfort/react/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { baseSepolia } from 'viem/chains'
import { createConfig, WagmiProvider } from 'wagmi'

const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: 'Openfort x402 demo',
    chains: [baseSepolia],
    walletConnectProjectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID,
  }),
)

export function OpenfortProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <OpenfortWagmiBridge>
          <OpenfortProvider
            debugMode
            publishableKey={import.meta.env.VITE_OPENFORT_PUBLISHABLE_KEY!}
            // Set the wallet configuration. In this example, we will be using the embedded signer.
            walletConfig={{
              shieldPublishableKey: import.meta.env
                .VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY!, // The Shield publishable key from https://dashboard.openfort.io
              ethereum: {
                chainId: baseSepolia.id, // The chain ID for the Ethereum network you want to use
                ethereumProviderPolicyId: import.meta.env
                  .VITE_OPENFORT_POLICY_ID, // The policy ID for sponsoring transactions
              },
              createEncryptedSessionEndpoint: import.meta.env
                .VITE_CREATE_ENCRYPTED_SESSION_ENDPOINT, // The endpoint to create an encryption session for automatic wallet recovery
              connectOnLogin: true, // Automatically connect the wallet on login
            }}
            uiConfig={{
              authProviders: [
                AuthProvider.EMAIL_OTP,
                AuthProvider.GUEST,
                AuthProvider.GOOGLE,
                AuthProvider.WALLET,
              ],
              walletRecovery: {
                defaultMethod: RecoveryMethod.AUTOMATIC,
              },
            }}
          >
            {children}
          </OpenfortProvider>
        </OpenfortWagmiBridge>
      </WagmiProvider>
    </QueryClientProvider>
  )
}
