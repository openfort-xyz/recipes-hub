import { baseSepolia } from 'viem/chains'
import { createConfig, http } from 'wagmi'

// Configure the chains you want to use
export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  ssr: true,
  transports: {
    [baseSepolia.id]: http(),
  },
})
