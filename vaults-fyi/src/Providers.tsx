import { OpenfortProvider } from '@openfort/react'
import { embeddedWalletConnector, OpenfortWagmiBridge } from '@openfort/react/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { base } from 'viem/chains'
import { createConfig, http, WagmiProvider } from 'wagmi'
import { injected, walletConnect } from 'wagmi/connectors'

const queryClient = new QueryClient()

const walletConnectProjectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID
const connectors = [embeddedWalletConnector(), injected()]
if (walletConnectProjectId) connectors.push(walletConnect({ projectId: walletConnectProjectId }))

const wagmiConfig = createConfig({
  chains: [base],
  connectors,
  transports: { [base.id]: http() },
})

export function Providers({ children }: { children: ReactNode }) {
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
                ethereumFeeSponsorshipId: import.meta.env.VITE_OPENFORT_FEE_SPONSORSHIP_ID || undefined,
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
