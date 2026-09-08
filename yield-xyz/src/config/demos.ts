export interface DemoConfig {
  key: string
  label: string
  protocol: string
  network: string
  chainId: number
  yieldId: string
  tokenSymbol: string
  tokenDecimals: number
  explorerUrl: string
  requiresValidator: boolean
  defaultAmount: string
}

/** MON native staking on Monad mainnet - single-step delegate tx, 209 validators. */
export const DEMO: DemoConfig = {
  key: 'monad-staking',
  label: 'MON Native Staking',
  protocol: 'StakeKit',
  network: 'monad',
  chainId: 143,
  yieldId: 'monad-mon-native-staking',
  tokenSymbol: 'MON',
  tokenDecimals: 18,
  explorerUrl: 'https://monadscan.com',
  requiresValidator: true,
  defaultAmount: '2',
}
