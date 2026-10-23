import type { OpenfortEmbeddedSolanaWalletProvider } from '@openfort/react/solana'
import {
  address,
  createSolanaRpc,
  getBase58Encoder,
  getBase64EncodedWireTransaction,
  getBase64Encoder,
  getTransactionDecoder,
  type SignatureBytes,
} from '@solana/kit'

/** Base58 signature → 64 Ed25519 bytes; the signer may append a recovery byte, which Solana rejects. */
export function toEd25519Signature(base58: string) {
  const raw = new Uint8Array(getBase58Encoder().encode(base58))
  const bytes = raw.length === 65 ? raw.slice(0, 64) : raw
  if (bytes.length !== 64) throw new Error(`Invalid Ed25519 signature: ${bytes.length} bytes`)
  return bytes as SignatureBytes
}

/** Signs a base64 transaction with the embedded wallet, sends it, and waits for confirmation. */
export async function signAndSend(
  provider: OpenfortEmbeddedSolanaWalletProvider,
  rpcUrl: string,
  base64Transaction: string
) {
  const transaction = getTransactionDecoder().decode(getBase64Encoder().encode(base64Transaction))
  const signer = address(provider.publicKey)
  if (!(signer in transaction.signatures))
    throw new Error('Transaction does not need this wallet to sign')

  const { signature } = await provider.signTransaction({
    messageBytes: new Uint8Array(transaction.messageBytes),
  })
  const signed = {
    ...transaction,
    signatures: { ...transaction.signatures, [signer]: toEd25519Signature(signature) },
  }

  const rpc = createSolanaRpc(rpcUrl)
  const txSignature = await rpc
    .sendTransaction(getBase64EncodedWireTransaction(signed), { encoding: 'base64' })
    .send()

  // Jupiter's blockhash expires after ~60s, so a transaction not confirmed by then never lands.
  for (let i = 0; i < 60; i++) {
    const { value } = await rpc.getSignatureStatuses([txSignature]).send()
    const status = value[0]
    if (status?.err) throw new Error(`Swap failed on-chain: ${JSON.stringify(status.err)}`)
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
      return txSignature
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error(`Swap not confirmed in time: ${txSignature}`)
}
