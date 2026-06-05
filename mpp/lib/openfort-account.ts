import { SignatureEnvelope } from 'ox/tempo'
import { keccak256 } from 'viem'
import { type LocalAccount, toAccount } from 'viem/accounts'
import { getOpenfortClient } from '@/lib/openfort'

/**
 * Wrap an Openfort EVM backend wallet as a viem account that delegates every
 * signing operation to Openfort.
 *
 * Tempo transactions use a custom format with a `calls` array instead of the
 * standard EVM `to`/`data` fields, so viem hands `signTransaction` a Tempo
 * `serializer`. We serialize the unsigned transaction, hash it, sign the hash
 * via Openfort's raw secp256k1 endpoint, then re-serialize with the signature
 * attached. Openfort never broadcasts here — it only signs.
 *
 * @param accountId - The Openfort backend account id (e.g. `acc_...`).
 * @returns A viem `LocalAccount` whose signatures come from Openfort.
 */
export async function createOpenfortTempoAccount(accountId: string): Promise<LocalAccount> {
  const account = await getOpenfortClient().accounts.evm.backend.get({ id: accountId })

  return toAccount({
    address: account.address as `0x${string}`,
    signMessage({ message }) {
      return account.signMessage({ message })
    },
    async signTransaction(transaction, options) {
      const serializer = options?.serializer
      if (!serializer) {
        throw new Error('Standard EVM signTransaction is not supported — a Tempo chain serializer is required')
      }

      const unsignedSerialized = await serializer(transaction)
      const hash = keccak256(unsignedSerialized)
      const signature = await account.sign({ hash })
      const envelope = SignatureEnvelope.from(signature)

      // biome-ignore lint/suspicious/noExplicitAny: viem's serializer type does not expose the Tempo envelope parameter.
      return (await serializer(transaction, envelope as any)) as `0x${string}`
    },
    signTypedData(typedData) {
      return account.signTypedData(typedData)
    },
  })
}
