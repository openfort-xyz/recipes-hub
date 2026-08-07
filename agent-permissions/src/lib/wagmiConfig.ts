import { embeddedWalletConnector } from '@openfort/react/wagmi'
import { baseSepolia } from 'viem/chains'
import { createConfig, http } from 'wagmi'

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [embeddedWalletConnector()],
  ssr: true,
  transports: { [baseSepolia.id]: http() },
})
