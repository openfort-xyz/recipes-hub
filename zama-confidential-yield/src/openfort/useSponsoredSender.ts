import { use7702Authorization, useOpenfort } from '@openfort/react'
import { useCallback, useRef } from 'react'
import type { Address, Hex, PublicClient } from 'viem'
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
 */
export function useSponsoredSender(publicClient: PublicClient | undefined, address?: Address) {
  const { client } = useOpenfort()
  const { signAuthorization } = use7702Authorization()
  const senderRef = useRef<SponsoredSender | null>(null)

  return useCallback(
    async (calls: Call[]): Promise<Hex> => {
      if (!publicClient || !address) throw new Error('Wallet is not connected yet.')
      if (!FEE_SPONSORSHIP_ID) {
        throw new Error('VITE_OPENFORT_FEE_SPONSORSHIP_ID is required to sponsor transactions.')
      }

      if (!senderRef.current) {
        const account = await toCaliburSmartAccount({
          client: publicClient,
          address,
          // Calibur's root key verifies a raw ECDSA signature over the userOpHash,
          // so sign the digest itself — no EIP-191 prefix, no re-hashing.
          signHash: (hash) =>
            client.embeddedWallet.signMessage(hash, {
              hashMessage: false,
              arrayifyMessage: false,
            }) as Promise<Hex>,
        })
        senderRef.current = createSponsoredSender({
          account,
          client: publicClient,
          publishableKey: import.meta.env.VITE_OPENFORT_PUBLISHABLE_KEY,
          feeSponsorshipId: FEE_SPONSORSHIP_ID,
        })
      }

      const code = await publicClient.getCode({ address })
      if (code && code !== '0x') return senderRef.current.send(calls)

      const nonce = await publicClient.getTransactionCount({ address })
      const result = await signAuthorization({
        contractAddress: caliburImplementation(),
        chainId: CHAIN_ID,
        nonce,
      })
      if (result.status === 'error') throw new Error(result.error.shortMessage)
      return senderRef.current.send(calls, result.authorization)
    },
    [client, publicClient, address, signAuthorization]
  )
}
