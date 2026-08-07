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
 * The embedded wallet is an EIP-7702 **delegated account**: the EOA is delegated
 * to a smart account so an Openfort paymaster can sponsor every transaction.
 * `ethereumFeeSponsorshipId` (a `pol_…` policy id) is what the provider resolves
 * per chain (`resolveEthereumFeeSponsorship`) to route writes as sponsored
 * userops. Set it to actually sponsor; without it the delegated account pays its
 * own gas. The signing key stays the embedded EOA key (ECDSA), which is what
 * Zama's `userDecrypt` EIP-712 verification needs.
 */
const FEE_SPONSORSHIP_ID = import.meta.env.VITE_OPENFORT_FEE_SPONSORSHIP_ID || undefined

export const ACCOUNT_TYPE = AccountTypeEnum.DELEGATED_ACCOUNT

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
                accountType: ACCOUNT_TYPE,
                ethereumFeeSponsorshipId: FEE_SPONSORSHIP_ID,
              },
            }}
            uiConfig={{
              mode: 'light',
              authProviders: [AuthProvider.EMAIL_OTP, AuthProvider.GOOGLE],
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
