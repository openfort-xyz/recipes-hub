import { useEthereumEmbeddedWallet } from '@openfort/react/ethereum'
import { useEffect, useState } from 'react'
import { createWalletClient, custom, type EIP1193Provider } from 'viem'
import { CHAIN } from '../contracts/addresses'
import type { EmbeddedWalletClient } from '../zama/sdk'

/**
 * A viem wallet client on the *active wallet's own* provider.
 *
 * Not `useWalletClient()` from wagmi: the embedded provider pins itself to the
 * address it was built for and rejects every later request once the active
 * wallet moves on, so a connector-held provider from earlier in the session
 * fails with "The active wallet changed before the operation could run" —
 * surfacing from inside whatever happened to need a signature. Asking the active
 * wallet for its provider keeps the pin and the address we sign for together.
 */
export function useEmbeddedWalletClient(): EmbeddedWalletClient | null {
  const wallet = useEthereumEmbeddedWallet()
  const address = wallet.status === 'connected' ? wallet.address : undefined
  const [client, setClient] = useState<EmbeddedWalletClient | null>(null)

  useEffect(() => {
    if (!address) {
      setClient(null)
      return
    }
    let cancelled = false
    const activeWallet = wallet.activeWallet
    if (!activeWallet) return

    activeWallet
      .getProvider()
      .then((provider) => {
        if (cancelled) return
        setClient(
          createWalletClient({
            account: address,
            chain: CHAIN,
            transport: custom(provider as EIP1193Provider),
          })
        )
      })
      .catch(() => {
        if (!cancelled) setClient(null)
      })

    return () => {
      cancelled = true
    }
    // `activeWallet` is a fresh object every render; the address is what changes.
  }, [address, wallet.activeWallet])

  return client
}
