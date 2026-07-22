import {
  AccountTypeEnum,
  AuthProvider,
  ChainTypeEnum,
  OpenfortProvider,
  RecoveryMethod,
} from '@openfort/react'
import { OpenfortWagmiBridge } from '@openfort/react/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { wagmiConfig } from './wagmi'

const queryClient = new QueryClient()

/**
 * Openfort provider stack for the payer. The embedded wallet is a plain **EOA**
 * (not a smart/delegated account) with **passkey** recovery, so the wallet can
 * own and sign for an Unlink shielded balance on Monad testnet. No automatic
 * recovery, so no server-side encryption-session endpoint is needed.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <OpenfortWagmiBridge>
          <OpenfortProvider
            publishableKey={import.meta.env.VITE_OPENFORT_PUBLISHABLE_KEY}
            walletConfig={{
              chainType: ChainTypeEnum.EVM,
              shieldPublishableKey: import.meta.env.VITE_OPENFORT_SHIELD_KEY,
              ethereum: {
                accountType: AccountTypeEnum.EOA,
              },
            }}
            uiConfig={{
              mode: 'light',
              authProviders: [AuthProvider.EMAIL_OTP],
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
