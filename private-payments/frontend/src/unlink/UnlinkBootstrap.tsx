import { useUser } from '@openfort/react'
import { useEthereumEmbeddedWallet } from '@openfort/react/ethereum'
import { type UnlinkClient, UnlinkProvider } from '@unlink-xyz/sdk/react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { buildUnlinkClient, MONAD_CHAIN_ID } from './unlink'

/**
 * Builds the Unlink client once the Openfort embedded EOA is connected, then
 * mounts `<UnlinkProvider>` so descendants can call `useUnlink()`. Building asks
 * the EOA to sign a one-time derivation message that binds the shielded balance
 * to the wallet.
 */
export function UnlinkBootstrap({
  children,
  fallback,
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  const wallet = useEthereumEmbeddedWallet({ chainId: MONAD_CHAIN_ID })
  const { getAccessToken } = useUser()

  const [client, setClient] = useState<UnlinkClient | null>(null)
  const [eoa, setEoa] = useState<string | null>(null)
  const buildingRef = useRef(false)

  // `provider` is only present on the 'connected' member of the wallet-state union.
  const provider = 'provider' in wallet ? wallet.provider : undefined

  useEffect(() => {
    if (client || buildingRef.current) return
    if (wallet.status !== 'connected' || !provider) return

    buildingRef.current = true
    buildUnlinkClient({ provider, getAccessToken })
      .then(({ client: built, eoaAddress }) => {
        setClient(built)
        setEoa(eoaAddress)
      })
      .catch((error: unknown) => {
        buildingRef.current = false
        console.error('[private-payments] Unlink client build failed:', error)
      })
  }, [client, wallet.status, provider, getAccessToken])

  if (!client) return <>{fallback ?? null}</>

  return (
    <UnlinkProvider client={client} key={eoa ?? 'unlink'}>
      {children}
    </UnlinkProvider>
  )
}
