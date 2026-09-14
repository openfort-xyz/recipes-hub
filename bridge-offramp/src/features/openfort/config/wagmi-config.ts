import { embeddedWalletConnector } from '@openfort/react/wagmi'
import { createConfig, http } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'

// Bridge settles USDC from Base in production. Base Sepolia is here for the
// wallet half of the demo only — Bridge has no testnet, so a sandbox cash-out
// address is dummy data regardless of which chain the wallet is on.
const chains = [baseSepolia, base] as const

/**
 * Embedded wallet only, deliberately — hence the hand-built config rather than
 * `getDefaultConfig`, which also registers Safe, Coinbase and injected
 * connectors.
 *
 * The cash-out address is created with the user's wallet as its return address,
 * and the server proves ownership by listing the Openfort accounts on the
 * session. An externally connected wallet is not one of those, so offering
 * "Connect Wallet" would sign people into a flow that then refuses them.
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
