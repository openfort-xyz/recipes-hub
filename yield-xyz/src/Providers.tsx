import { OpenfortProvider } from '@openfort/react'
import { embeddedWalletConnector, OpenfortWagmiBridge } from '@openfort/react/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { monad } from 'viem/chains'
import { createConfig, http, WagmiProvider } from 'wagmi'

const queryClient = new QueryClient()

const wagmiConfig = createConfig({
  chains: [monad],
  connectors: [embeddedWalletConnector()],
  transports: {
    [monad.id]: http(),
  },
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
                // Monad isn't in the SDK's built-in chain table, and on the first
                // connect (wallet creation) the wagmi-transport fallback hasn't
                // landed yet - without this the embedded signer has no endpoint
                // for 143 and the chain switch fails.
                rpcUrls: { [monad.id]: monad.rpcUrls.default.http[0] },
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
