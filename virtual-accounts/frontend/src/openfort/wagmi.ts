import { getDefaultConfig } from '@openfort/react/wagmi'
import { polygon, polygonAmoy } from 'viem/chains'
import { createConfig, http } from 'wagmi'

/** Noah settles sandbox deposits on Polygon Amoy and production ones on Polygon. */
export const IS_SANDBOX = (import.meta.env.VITE_NOAH_ENVIRONMENT ?? 'sandbox') !== 'production'

export const chain = IS_SANDBOX ? polygonAmoy : polygon

/** The token Noah delivers: its USDC_TEST on Amoy, canonical USDC on Polygon. */
export const USDC_ADDRESS = (
  IS_SANDBOX
    ? '0xae1d7d8b36e9aba7d95a75c69d50b38e7e02a9dd'
    : '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'
) as `0x${string}`

export const USDC_DECIMALS = 6

export const EXPLORER_URL = IS_SANDBOX ? 'https://amoy.polygonscan.com' : 'https://polygonscan.com'

export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: 'Openfort Virtual Accounts',
    chains: [chain],
    transports: {
      [chain.id]: http(import.meta.env.VITE_RPC_URL || undefined),
    },
  })
)
