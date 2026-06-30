import { account, createUnlinkClient, evm, type UnlinkClient } from '@unlink-xyz/sdk/browser'

/** Hosted Unlink environment (chain). Monad testnet, chain id 10143. */
export const UNLINK_ENVIRONMENT = import.meta.env.VITE_UNLINK_ENVIRONMENT ?? 'monad-testnet'

export const MONAD_CHAIN_ID = 10143

/**
 * Client-side derivation namespace. `account.fromMetaMask` mixes this into the
 * BIP-32 path so the same EOA yields a stable Unlink address. It is a label, not
 * a server credential.
 */
export const UNLINK_APP_ID = 'openfort-private-invoices'

/** Unlink-configured token on Monad testnet (from the Unlink dashboard → Tokens). */
export const UNLINK_TOKEN = (import.meta.env.VITE_UNLINK_TOKEN ?? '') as `0x${string}`

export const MONAD_RPC_URL = import.meta.env.VITE_MONAD_RPC_URL ?? 'https://testnet-rpc.monad.xyz'

export const MONAD_EXPLORER = 'https://testnet.monadexplorer.com'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3020'

type Eip1193 = { request(args: { method: string; params?: unknown[] }): Promise<unknown> }

/**
 * Build a per-user Unlink client bound to the Openfort embedded EOA (non-custodial:
 * the EOA signs a derivation message and its spending key never leaves the browser).
 *
 * Registration + authorization-token requests go to this recipe's backend; the
 * `customFetch` attaches the Openfort bearer token to those calls only, leaving the
 * Engine requests (which carry their own authorization token) untouched.
 */
export async function buildUnlinkClient(opts: {
  provider: Eip1193
  getAccessToken: () => Promise<string | null | undefined>
}): Promise<{ client: UnlinkClient; eoaAddress: string }> {
  const { provider, getAccessToken } = opts

  const { account: unlinkAccount, address: eoaAddress } = await account.fromMetaMask({
    provider,
    appId: UNLINK_APP_ID,
    chainId: MONAD_CHAIN_ID,
  })

  const customFetch: typeof globalThis.fetch = async (input, init) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    if (!url.includes('/api/unlink/')) return fetch(input, init)

    const token = await getAccessToken()
    const headers = new Headers(init?.headers)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return fetch(input, { ...init, headers })
  }

  const client = createUnlinkClient({
    environment: UNLINK_ENVIRONMENT,
    account: unlinkAccount,
    evm: evm.fromEip1193({ provider, address: eoaAddress }),
    registerUrl: `${API_BASE_URL}/api/unlink/register`,
    authorizationToken: { url: `${API_BASE_URL}/api/unlink/authorization-token` },
    customFetch,
  })

  return { client, eoaAddress }
}
