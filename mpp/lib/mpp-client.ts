import { Mppx, tempo } from 'mppx/client'
import { createOpenfortTempoAccount } from '@/lib/openfort-account'

/**
 * Execute an MPP request, paying with an Openfort-backed agent wallet.
 *
 * The mppx client intercepts a `402 Payment Required` response, signs a payment
 * credential with the agent's wallet, and retries the request. Settlement
 * happens on Tempo.
 *
 * @param accountId - The agent's Openfort backend account id.
 * @param url - The MPP-protected resource to fetch.
 * @param options - Optional fetch init (method, headers, body).
 */
export async function executeMppRequest(accountId: string, url: string, options?: RequestInit): Promise<Response> {
  const account = await createOpenfortTempoAccount(accountId)
  const mppx = Mppx.create({
    polyfill: false,
    methods: [tempo({ account })],
  })

  return mppx.fetch(url, {
    ...options,
    signal: AbortSignal.timeout(30_000),
  })
}
