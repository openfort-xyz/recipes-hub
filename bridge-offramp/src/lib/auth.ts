// Session verification for every route handler.
//
// Nothing in this app trusts a customer id, a wallet address or an email from
// the request body. The Openfort session token is the only identity input, and
// everything else is looked up from it — otherwise one signed-in user could
// point another user's cash-outs at their own bank account.

import Openfort from '@openfort/openfort-node'
import { getAddress } from 'viem'

function getOpenfort() {
  const key = process.env.OPENFORT_SECRET_KEY
  if (!key) throw new Error('OPENFORT_SECRET_KEY is not configured')
  return new Openfort(key, {
    publishableKey: process.env.NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY,
  })
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

/** Validate the bearer token on the request and return the Openfort user. */
export async function authenticateRequest(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new AuthError('Missing authorization token', 401)

  let result: Awaited<ReturnType<ReturnType<typeof getOpenfort>['iam']['getSession']>> | null = null
  try {
    result = await getOpenfort().iam.getSession({ accessToken: token })
  } catch (err) {
    // A thrown error here is the transport failing, not the token being bad.
    console.error('[auth] iam.getSession threw:', err)
    throw new AuthError('Invalid or expired session', 401)
  }

  // openfort-node 0.12 resolves to null for a token it can't validate rather
  // than rejecting, so destructuring the result straight away turns an ordinary
  // expired session into a TypeError.
  if (!result?.user) throw new AuthError('Invalid or expired session', 401)

  return { session: result.session, user: result.user }
}

/**
 * Authenticate, then confirm the caller actually owns `address`.
 *
 * The cash-out address is created with this wallet as its return address, so an
 * unchecked value would send failed payouts to a stranger's wallet.
 */
export async function authorizeAddress(req: Request, address: string) {
  const { session, user } = await authenticateRequest(req)

  const { data: accounts } = await getOpenfort().accounts.list({ user: user.id })
  const normalized = getAddress(address)
  if (!accounts.some((account) => getAddress(account.address) === normalized)) {
    throw new AuthError('Address not owned by authenticated user', 403)
  }

  return { session, user }
}

/** Turn an AuthError or BridgeError into a Response; rethrow anything unexpected. */
export function errorResponse(err: unknown): Response {
  const status = (err as { status?: number })?.status
  const message = err instanceof Error ? err.message : 'Unexpected error'
  if (typeof status === 'number') {
    return Response.json({ error: message }, { status })
  }
  console.error('[route] unhandled error:', err)
  return Response.json({ error: 'Unexpected error' }, { status: 500 })
}
