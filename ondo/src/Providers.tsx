import { AuthProvider, ChainTypeEnum, OpenfortProvider, RecoveryMethod } from '@openfort/react'
import type { ReactNode } from 'react'

export const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

/**
 * Solana-only: no wagmi, no bridge, and no app-level QueryClientProvider (the
 * provider brings its own). `chainType: SVM` makes login create/recover the
 * Solana wallet; without it the EVM wallet is picked and the Solana hook stays
 * disconnected.
 *
 * Passkey or password recovery keep the recipe backend-free. Switch to Shield
 * automatic recovery (`createEncryptedSessionEndpoint`) for production.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <OpenfortProvider
      publishableKey={import.meta.env.VITE_OPENFORT_PUBLISHABLE_KEY}
      walletConfig={{
        shieldPublishableKey: import.meta.env.VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY,
        chainType: ChainTypeEnum.SVM,
        solana: { cluster: 'mainnet-beta', rpcUrls: { 'mainnet-beta': RPC_URL } },
      }}
      uiConfig={{
        mode: 'auto',
        authProviders: [AuthProvider.EMAIL_OTP, AuthProvider.GOOGLE],
        walletRecovery: {
          allowedMethods: [RecoveryMethod.PASSKEY, RecoveryMethod.PASSWORD],
          defaultMethod: RecoveryMethod.PASSKEY,
        },
      }}
    >
      {children}
    </OpenfortProvider>
  )
}
