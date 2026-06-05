function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}. Copy .env.example to .env.local.`)
  }
  return value
}

/** Server (merchant) config. Only PAY_TO and MPP_SECRET_KEY are required. */
export const config = {
  port: Number(process.env.PORT ?? 3010),
  network: (process.env.SOLANA_NETWORK ?? 'devnet') as 'devnet' | 'mainnet-beta' | 'localnet',
  rpcUrl: process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
  payTo: required('PAY_TO'),
  currency: process.env.CURRENCY ?? 'sol',
  decimals: process.env.DECIMALS ? Number(process.env.DECIMALS) : undefined,
  priceBaseUnits: process.env.PRICE_BASE_UNITS ?? '1000000',
  mppSecretKey: required('MPP_SECRET_KEY'),
}
