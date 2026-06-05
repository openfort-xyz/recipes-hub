import { address, getBase64Decoder } from '@solana/kit'
import type {
  SignatureBytes,
  SignatureDictionary,
  Transaction,
  TransactionPartialSigner,
} from '@solana/kit'

/** The slice of an Openfort backend Solana account this signer needs. */
export type OpenfortSolanaAccount = {
  address: string
  signTransaction(parameters: { transaction: string }): Promise<string>
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/**
 * Wraps an Openfort backend Solana account as a `@solana/kit` partial signer so
 * `@solana/mpp` can use it to authorize the charge transaction. The account
 * holds the key in Openfort's infrastructure; we only hand it the compiled
 * message bytes and attach the raw Ed25519 signature it returns.
 */
export function openfortSolanaSigner(account: OpenfortSolanaAccount): TransactionPartialSigner {
  const signerAddress = address(account.address)
  return {
    address: signerAddress,
    async signTransactions(
      transactions: readonly Transaction[],
    ): Promise<readonly SignatureDictionary[]> {
      const base64Decoder = getBase64Decoder()
      return Promise.all(
        transactions.map(async (transaction) => {
          // Openfort signs the bytes it is given, so we must hand it the
          // compiled message bytes (not the full wire transaction) — that is
          // exactly what a Solana Ed25519 signature must cover.
          const messageBase64 = base64Decoder.decode(transaction.messageBytes)
          const signatureHex = await account.signTransaction({ transaction: messageBase64 })
          const signature = hexToBytes(signatureHex) as SignatureBytes
          return Object.freeze({ [signerAddress]: signature }) as SignatureDictionary
        }),
      )
    },
  }
}
