'use client'

import { AccountTypeEnum, AuthProvider, OpenfortProvider } from '@openfort/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getDefaultConfig, OpenfortWagmiBridge } from '@openfort/react/wagmi'
import { useState } from 'react'
import { baseSepolia } from 'viem/chains'
import { createConfig, WagmiProvider } from 'wagmi'

const config = createConfig(
  getDefaultConfig({
    appName: 'Openfort Next.js demo',
    chains: [baseSepolia], // The chains you want to support
  }),
)

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
     <QueryClientProvider client={queryClient}>
    <WagmiProvider config={config}>
     <OpenfortWagmiBridge>
        <OpenfortProvider
          publishableKey={process.env.NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY!}
          // Set the wallet configuration. In this example, we will be using the embedded signer.
          walletConfig={{
            shieldPublishableKey: process.env.NEXT_PUBLIC_OPENFORT_SHIELD_PUBLISHABLE_KEY!, // The Shield publishable key from https://dashboard.openfort.io
            ethereum: {
              accountType: AccountTypeEnum.EOA,
              ethereumFeeSponsorshipId: process.env.NEXT_PUBLIC_OPENFORT_FEE_SPONSORSHIP_ID, // The fee sponsorship ID for sponsoring transactions
            },
            createEncryptedSessionEndpoint: process.env.NEXT_PUBLIC_CREATE_ENCRYPTED_SESSION_ENDPOINT, // The endpoint to create an encryption session for automatic wallet recovery
          }}
          uiConfig={{
            authProviders: [AuthProvider.EMAIL_OTP, AuthProvider.GUEST, AuthProvider.GOOGLE],
          }}
        >
          {children}
        </OpenfortProvider>
        </OpenfortWagmiBridge>
         </WagmiProvider>
      </QueryClientProvider>
   
  )
}
