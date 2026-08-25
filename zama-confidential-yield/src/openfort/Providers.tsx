import { AccountTypeEnum, OpenfortProvider } from '@openfort/react'
import { OpenfortWagmiBridge } from '@openfort/react/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { CHAIN_ID, RPC_URL } from '../contracts/addresses'
import { wagmiConfig } from './wagmi'

const queryClient = new QueryClient()

/**
 * The embedded wallet is an EIP-7702 **delegated account**: the EOA is delegated
 * to a smart account so an Openfort paymaster can sponsor every transaction.
 * `ethereumFeeSponsorshipId` (a `pol_…` policy id) is what the provider resolves
 * per chain to route writes as sponsored userops. Set it to actually sponsor;
 * without it the delegated account pays its own gas. The signing key stays the
 * embedded EOA key (ECDSA), which is what Zama's `userDecrypt` EIP-712 needs.
 */
const FEE_SPONSORSHIP_ID = import.meta.env.VITE_OPENFORT_FEE_SPONSORSHIP_ID || undefined

export const ACCOUNT_TYPE = AccountTypeEnum.DELEGATED_ACCOUNT

/**
 * Headless Openfort: no `uiConfig`, because this app never opens the Openfort
 * modal. `screens/Auth` drives `useEmailOtpAuth` and `screens/Wallets` drives
 * `useEthereumEmbeddedWallet` itself, the way
 * https://github.com/openfort-xyz/openfort-react/tree/main/examples/quickstarts/headless
 * does — the phone UI is ours end to end.
 *
 * `connectOnLogin: false` is the other half of that: the SDK does not pick or
 * create a wallet behind the login, so `screens/Wallets` stays the only thing
 * that calls `create()` / `setActive()` and the passkey prompt never fires
 * unprompted.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <OpenfortWagmiBridge>
          <OpenfortProvider
            publishableKey={import.meta.env.VITE_OPENFORT_PUBLISHABLE_KEY}
            walletConfig={{
              shieldPublishableKey: import.meta.env.VITE_OPENFORT_SHIELD_KEY,
              connectOnLogin: false,
              ethereum: {
                accountType: ACCOUNT_TYPE,
                ethereumFeeSponsorshipId: FEE_SPONSORSHIP_ID,
                // The SDK memoizes the first provider it builds, including during
                // `create()`, so pass the endpoint here too — otherwise wallet
                // creation runs against the SDK's public defaults.
                rpcUrls: { [CHAIN_ID]: RPC_URL },
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
