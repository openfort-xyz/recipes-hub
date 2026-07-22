import { getDefaultConfig } from '@openfort/react/wagmi'
import { monadTestnet } from 'viem/chains'
import { createConfig, http } from 'wagmi'

const MONAD_RPC_URL = import.meta.env.VITE_MONAD_RPC_URL ?? 'https://testnet-rpc.monad.xyz'

export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: 'Openfort Private Payments',
    chains: [monadTestnet],
    transports: {
      [monadTestnet.id]: http(MONAD_RPC_URL),
    },
  })
)
