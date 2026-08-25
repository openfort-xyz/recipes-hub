import { use7702Authorization, useOpenfort } from '@openfort/react'
import { useEthereumEmbeddedWallet } from '@openfort/react/ethereum'
import { useCallback, useRef } from 'react'
import type { Hex, PublicClient } from 'viem'
import { recoverAddress } from 'viem'
import { CHAIN_ID } from '../contracts/addresses'
import {
  type Call,
  caliburImplementation,
  createSponsoredSender,
  type SponsoredSender,
  toCaliburSmartAccount,
} from './calibur'
import { FEE_SPONSORSHIP_ID } from './Providers'

/**
 * Returns `send(calls)`, which submits the calls as one sponsored UserOperation.
 *
 * The EIP-7702 authorization is attached only while the account still has no
 * code on-chain; after the first operation the delegation is installed and every
 * later one skips it. Openfort's own SDK checks the same thing, so its native
 * send path starts working from that point too.
 *
 * The address comes from the embedded wallet rather than from wagmi, because it
 * has to be the account the embedded signer will actually sign with. Sourcing it
 * anywhere else lets `sender` and the signing key drift apart, which the
 * EntryPoint reports only as the uninformative `AA24 signature error`.
 */
export function useSponsoredSender(publicClient: PublicClient | undefined) {
  const { client } = useOpenfort()
  const wallet = useEthereumEmbeddedWallet()
  const { signAuthorization } = use7702Authorization()
  const senderRef = useRef<{ address: Hex; sender: SponsoredSender } | null>(null)

  const address = wallet.status === 'connected' ? wallet.address : undefined

  return useCallback(
    async (calls: Call[]): Promise<Hex> => {
      if (!publicClient || !address) throw new Error('Wallet is not connected yet.')
      if (!FEE_SPONSORSHIP_ID) {
        throw new Error('VITE_OPENFORT_FEE_SPONSORSHIP_ID is required to sponsor transactions.')
      }

      const signHash = async (hash: Hex): Promise<Hex> => {
        // Calibur's root key verifies a raw ECDSA signature over the userOpHash,
        // so sign the digest itself — no EIP-191 prefix, no re-hashing.
        const signature = (await client.embeddedWallet.signMessage(hash, {
          hashMessage: false,
          arrayifyMessage: false,
        })) as Hex
        // The signer uses whichever wallet is active now, while `sender` was
        // fixed when the operation was built. If a wallet switch slipped in
        // between, say so here rather than letting the bundler reject it.
        const signer = await recoverAddress({ hash, signature })
        if (signer.toLowerCase() !== address.toLowerCase()) {
          throw new Error(
            `Signed with ${signer} but the operation is for ${address}. The active wallet changed — reconnect and try again.`
          )
        }
        return signature
      }

      // Rebuild whenever the active wallet changes: a cached account keeps
      // carrying the previous address as `sender`.
      if (senderRef.current?.address !== address) {
        const account = await toCaliburSmartAccount({ client: publicClient, address, signHash })
        senderRef.current = {
          address,
          sender: createSponsoredSender({
            account,
            client: publicClient,
            publishableKey: import.meta.env.VITE_OPENFORT_PUBLISHABLE_KEY,
            feeSponsorshipId: FEE_SPONSORSHIP_ID,
          }),
        }
      }
      const { sender } = senderRef.current

      const code = await publicClient.getCode({ address })
      if (code && code !== '0x') return sender.send(calls)

      const nonce = await publicClient.getTransactionCount({ address })
      const result = await signAuthorization({
        contractAddress: caliburImplementation(),
        chainId: CHAIN_ID,
        nonce,
      })
      if (result.status === 'error') throw new Error(result.error.shortMessage)
      return sender.send(calls, result.authorization)
    },
    [client, publicClient, address, signAuthorization]
  )
}
