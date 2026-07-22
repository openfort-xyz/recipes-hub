import 'dotenv/config'

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Copy .env.example to .env and fill it in (see README).`)
  }
  return value
}

export const config = {
  openfortSecretKey: required('OPENFORT_SECRET_KEY'),
  openfortWalletSecret: required('OPENFORT_WALLET_SECRET'),
  gasPolicyId: required('OPENFORT_GAS_POLICY_ID'),
  // biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket access
  telegramBotToken: process.env['TELEGRAM_BOT_TOKEN'],
}

export const CHAIN_ID = 84532 // Base Sepolia
export const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const
export const USDC_DECIMALS = 6
export const EXPLORER_URL = 'https://sepolia.basescan.org'
