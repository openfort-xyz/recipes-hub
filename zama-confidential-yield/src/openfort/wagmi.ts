import { getDefaultConfig } from '@openfort/react/wagmi'
import { createConfig, http } from 'wagmi'
import { CHAIN, RPC_URL } from '../contracts/addresses'

/**
 * `getDefaultConfig` registers Openfort's embedded-wallet connector, which is the
 * only connector this app uses — `OpenfortWagmiBridge` connects it after the
 * wallet is unlocked, and every read/write below goes through wagmi's viem
 * clients. No WalletConnect project id: there is no connector picker to show it in.
 */
export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: 'Openfort · Confidential USDC',
    chains: [CHAIN],
    transports: { [CHAIN.id]: http(RPC_URL) },
  })
)
