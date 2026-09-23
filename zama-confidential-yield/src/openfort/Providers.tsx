import { AccountTypeEnum, OpenfortProvider } from '@openfort/react'
import { OpenfortWagmiBridge } from '@openfort/react/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { CHAIN_ID, RPC_URL } from '../contracts/addresses'
import { wagmiConfig } from './wagmi'

const queryClient = new QueryClient()

/**
 * The signer is an **EOA** key — Zama's `userDecrypt` EIP-712 permit is verified
 * with `ecrecover` against the user address, so it has to be a plain ECDSA key
 * (a 4337 smart account with its own address would decrypt nothing).
 *
 * The account type is EIP-7702 **delegated**: same address, same key, plus
 * Calibur code so an Openfort paymaster can sponsor every write. All writes go
 * through `useSponsoredSender`, which needs `VITE_OPENFORT_FEE_SPONSORSHIP_ID`
 * (a `pol_…` id); `App` refuses to start without it.
 */
export const FEE_SPONSORSHIP_ID: string | undefined =
  import.meta.env.VITE_OPENFORT_FEE_SPONSORSHIP_ID || undefined

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
              shieldPublishableKey: import.meta.env.VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY,
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
