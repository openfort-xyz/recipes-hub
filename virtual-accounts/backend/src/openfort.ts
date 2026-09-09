import Openfort from '@openfort/openfort-node'
import type { Request } from 'express'
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
 * Validate the Openfort access token on the Authorization header and return the
 * user id. That id is used verbatim as the Noah `CustomerID`, so there is no
 * user table to keep in sync — the wallet owner and the bank customer are one.
 */
export async function authenticate(
  client: OpenfortClient,
  request: Request
): Promise<string | null> {
  const token = request.headers.authorization?.replace('Bearer ', '')
  if (!token) return null
  try {
    const { user } = await client.iam.getSession({ accessToken: token })
    return user.id
  } catch {
    return null
  }
}
