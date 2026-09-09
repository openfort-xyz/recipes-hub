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
 * The wallet is a plain **EOA** with **passkey** recovery: it only has to
 * receive the USDC Noah sends, and passkey recovery means no server-side
 * encryption-session endpoint to run.
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
