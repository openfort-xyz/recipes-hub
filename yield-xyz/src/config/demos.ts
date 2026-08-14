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
  faucetUrl: string
  requiresValidator: boolean
  defaultAmount: string
}

/** MON native staking on Monad Testnet - free faucet, single-step delegate tx, validator picker. */
export const DEMO: DemoConfig = {
  key: 'monad-staking',
  label: 'MON Native Staking',
  protocol: 'StakeKit',
  network: 'monad-testnet',
  chainId: 10_143,
  yieldId: 'monad-testnet-mon-native-staking',
  tokenSymbol: 'MON',
  tokenDecimals: 18,
  explorerUrl: 'https://testnet.monadexplorer.com',
  faucetUrl: 'https://testnet.monad.xyz/',
  requiresValidator: true,
  defaultAmount: '2',
}
