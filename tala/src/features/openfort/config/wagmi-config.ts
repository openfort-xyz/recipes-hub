import { embeddedWalletConnector } from '@openfort/react/wagmi'
import { createConfig, http } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'

// Base Sepolia by default; Base mainnet for production loans.
const chains = [baseSepolia, base] as const

/**
 * Embedded wallet only, deliberately — hence the hand-built config rather than
 * `getDefaultConfig`, which also registers Safe, Coinbase and injected
 * connectors.
 *
 * Loans are paid out to this wallet, and the server proves ownership by listing
 * the Openfort accounts on the session. An externally connected wallet is not
 * one of those, so offering "Connect Wallet" would sign people into a flow that
 * then refuses them.
 */
export const wagmiConfig = createConfig({
  chains,
  connectors: [embeddedWalletConnector()],
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
  // Defer browser-only storage (indexedDB) hydration to the client so server
  // rendering doesn't touch it.
  ssr: true,
})

export type WagmiConfigType = typeof wagmiConfig

declare module 'wagmi' {
  interface Register {
    config: WagmiConfigType
  }
}
