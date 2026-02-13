import { baseSepolia } from 'viem/chains'
import { createConfig, http } from 'wagmi'

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  ssr: true,
  transports: {
    [baseSepolia.id]: http(),
  },
})
