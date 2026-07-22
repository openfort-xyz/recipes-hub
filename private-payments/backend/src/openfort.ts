import Openfort from '@openfort/openfort-node'
import type { Config } from './config.js'

export type OpenfortClient = InstanceType<typeof Openfort>

export function createOpenfortClient(config: Config): OpenfortClient {
  // The publishable key is required so `iam.getSession` can fetch the project's
  // JWKS and verify the user's access token. Without it, valid tokens fail with 401.
  return new Openfort(config.openfort.secretKey, {
    publishableKey: config.openfort.publishableKey,
  })
}

/**
 * Validate the Openfort access token carried on the Authorization header. The
 * browser Unlink client attaches it to every `/api/unlink/*` request. Throws on
 * a missing or invalid token (the Unlink route kit maps a throw to a 401).
 *
 * This is the only thing the backend authenticates — it then registers the user
 * or issues an authorization token through the admin API key. It never signs.
 */
export async function authenticateOpenfort(client: OpenfortClient, request: Request) {
  const header = request.headers.get('authorization')
  const token = header?.replace('Bearer ', '')
  if (!token) throw new Error('Missing authorization token')
  const { user } = await client.iam.getSession({ accessToken: token })
  return user
}
