import { OpenfortProvider, RecoveryMethod } from '@openfort/react'
import { getDefaultConfig, OpenfortWagmiBridge } from '@openfort/react/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type React from 'react'
import { arbitrum, base, mainnet, optimism, polygon } from 'viem/chains'
import { createConfig, WagmiProvider } from 'wagmi'

const queryClient = new QueryClient()

const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: 'Openfort + WalletConnect Pay',
    walletConnectProjectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || 'demo',
    chains: [base, mainnet, polygon, arbitrum, optimism],
    ssr: false,
  })
)

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <OpenfortWagmiBridge>
          <OpenfortProvider
            publishableKey={import.meta.env.VITE_OPENFORT_PUBLISHABLE_KEY}
            walletConfig={{
              shieldPublishableKey: import.meta.env.VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY,
              ethereum: {
                ethereumFeeSponsorshipId: import.meta.env.VITE_OPENFORT_FEE_SPONSORSHIP_ID || undefined,
              },
            }}
            uiConfig={{
              // Passkey recovery keeps Shield but needs no backend encryption-session endpoint.
              walletRecovery: {
                allowedMethods: [RecoveryMethod.PASSKEY],
                defaultMethod: RecoveryMethod.PASSKEY,
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
