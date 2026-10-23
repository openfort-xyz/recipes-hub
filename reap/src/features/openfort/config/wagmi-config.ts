import { embeddedWalletConnector } from '@openfort/react/wagmi'
import { createConfig, http } from 'wagmi'
import { polygon, polygonAmoy } from 'wagmi/chains'

// Reap's sandbox credits RUSDC on Polygon Amoy; production credits USDC on Polygon.
const chains = [polygonAmoy, polygon] as const

/**
 * Embedded wallet only, deliberately — hence the hand-built config rather than
 * `getDefaultConfig`, which also registers Safe, Coinbase and injected
 * connectors.
 *
 * The wallet is registered with Reap as the account's signer, and the server
 * proves ownership by listing the Openfort accounts on the session. An
 * externally connected wallet is not one of those, so offering "Connect
 * Wallet" would sign people into a flow that then refuses them.
 */
export const wagmiConfig = createConfig({
  chains,
  connectors: [embeddedWalletConnector()],
  transports: {
    [polygonAmoy.id]: http(),
    [polygon.id]: http(),
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
