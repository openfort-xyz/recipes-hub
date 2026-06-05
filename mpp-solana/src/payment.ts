import { charge } from '@solana/mpp/client'
import { Mppx } from 'mppx/client'
import { getSolanaAccount } from './openfort.js'
import { openfortSolanaSigner } from './signer.js'

const rpcUrl = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'

export type PaymentResult = {
  status: number
  body: unknown
  receipt: unknown
  signature: string | undefined
}

/**
 * Builds a payment-aware client backed by an Openfort backend Solana wallet.
 * `pay(url)` runs the full MPP loop (402 → sign → retry) and returns the
 * unlocked body plus the decoded receipt and on-chain settlement signature.
 */
export async function createPayer() {
  const account = await getSolanaAccount()
  const signer = openfortSolanaSigner(account)
  const mpp = Mppx.create({ polyfill: false, methods: [charge({ signer, rpcUrl })] })

  return {
    address: account.address,
    async pay(resourceUrl: string): Promise<PaymentResult> {
      const response = await mpp.fetch(resourceUrl)
      const body = await response.json().catch(() => null)
      const receiptHeader = response.headers.get('Payment-Receipt')

      let receipt: unknown = null
      let signature: string | undefined
      if (receiptHeader) {
        try {
          receipt = JSON.parse(Buffer.from(receiptHeader, 'base64').toString('utf8'))
          signature = (receipt as { reference?: string }).reference
        } catch {
          // Leave receipt null if the header isn't decodable.
        }
      }
      return { status: response.status, body, receipt, signature }
    },
  }
}
