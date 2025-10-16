'use client'

import { AccountTypeEnum, AuthProvider, OpenfortProvider } from '@openfort/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { WagmiProvider } from 'wagmi'
import { wagmiConfig } from '@/lib/wagmiConfig'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OpenfortProvider
          publishableKey={process.env.NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY!}
          // Set the wallet configuration. In this example, we will be using the embedded signer.
          walletConfig={{
            shieldPublishableKey: process.env.NEXT_PUBLIC_SHIELD_PUBLISHABLE_KEY!, // The public key for your Openfort Shield account get it from https://dashboard.openfort.io
            ethereumProviderPolicyId: process.env.NEXT_PUBLIC_OPENFORT_POLICY_ID, // The policy ID for sponsoring transactions
            createEncryptedSessionEndpoint: process.env.NEXT_PUBLIC_CREATE_ENCRYPTED_SESSION_ENDPOINT, // The endpoint to create an encryption session for automatic wallet recovery
            accountType: AccountTypeEnum.EOA,
          }}
          uiConfig={{
            authProviders: [AuthProvider.EMAIL, AuthProvider.GUEST, AuthProvider.GOOGLE],
          }}
        >
          {children}
        </OpenfortProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
