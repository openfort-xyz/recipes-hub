import Openfort from '@openfort/openfort-node'

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}. Copy .env.example to .env.local.`)
  }
  return value
}

const openfort = new Openfort(required('OPENFORT_SECRET_KEY'), {
  walletSecret: required('OPENFORT_WALLET_SECRET'),
})

/**
 * Returns the Openfort backend Solana account that will pay for resources.
 * Reuses OPENFORT_SOLANA_ACCOUNT_ID when set; otherwise mints a fresh wallet
 * and prints its id/address so it can be funded and reused.
 */
export async function getSolanaAccount() {
  const id = process.env.OPENFORT_SOLANA_ACCOUNT_ID
  if (id) {
    return await openfort.accounts.solana.backend.get({ id })
  }
  const account = await openfort.accounts.solana.backend.create()
  console.log(`Created backend Solana wallet ${account.id} (${account.address}).`)
  console.log('Fund it, then set OPENFORT_SOLANA_ACCOUNT_ID to reuse it.')
  return account
}
