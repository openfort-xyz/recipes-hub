import { sepolia } from 'viem/chains'
import { createConfig, http } from 'wagmi'

// Configure the chains you want to use
export const wagmiConfig = createConfig({
  chains: [sepolia],
  ssr: true,
  transports: {
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
  },
})
