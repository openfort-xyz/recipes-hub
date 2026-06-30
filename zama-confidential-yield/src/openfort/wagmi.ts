import { getDefaultConfig } from '@openfort/react/wagmi'
import { createConfig, http } from 'wagmi'
import { CHAIN } from '../contracts/addresses'

const RPC_URL = import.meta.env.VITE_RPC_URL

export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: 'Openfort · Confidential USDC',
    chains: [CHAIN],
    walletConnectProjectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID,
    transports: {
      // Falls back to the chain's default RPC if VITE_RPC_URL is unset, but the
      // Zama relayer SDK is flaky on public RPCs — set your own.
      [CHAIN.id]: http(RPC_URL),
    },
  })
)
