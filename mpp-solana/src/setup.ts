// Convenience: mint a payer + merchant backend Solana wallet and print their
// ids/addresses. Run once with `pnpm setup`, then put the payer id in .env.local
// (OPENFORT_SOLANA_ACCOUNT_ID) and the merchant address in PAY_TO. Fund the payer
// before paying.
import Openfort from '@openfort/openfort-node'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing env var ${name}`)
  return value
}

const openfort = new Openfort(required('OPENFORT_SECRET_KEY'), {
  walletSecret: required('OPENFORT_WALLET_SECRET'),
})

const payer = await openfort.accounts.solana.backend.create()
const merchant = await openfort.accounts.solana.backend.create()

console.log('PAYER_ID=', payer.id)
console.log('PAYER_ADDRESS=', payer.address)
console.log('MERCHANT_ID=', merchant.id)
console.log('MERCHANT_ADDRESS=', merchant.address)
