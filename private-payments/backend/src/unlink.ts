import {
  createUnlinkAdmin,
  createUnlinkAuthRoutes,
  type UnlinkAuthRouteHandlers,
} from '@unlink-xyz/sdk/admin'
import type { Config } from './config.js'
import { authenticateOpenfort, type OpenfortClient } from './openfort.js'

/**
 * Build the Unlink partner routes. The admin handle holds the privileged API key
 * (control plane only): it registers users and issues short-lived authorization
 * tokens. Per-user signing happens in the browser — this never touches keys.
 */
export function createUnlinkRoutes(
  config: Config,
  openfort: OpenfortClient
): UnlinkAuthRouteHandlers {
  const admin = createUnlinkAdmin({
    environment: config.unlink.environment,
    apiKey: config.unlink.apiKey,
  })

  return createUnlinkAuthRoutes({
    admin,
    authenticate: (request) => authenticateOpenfort(openfort, request),
    // Demo: any authenticated user may hold the Unlink address derived from their
    // own embedded EOA. A production integrator checks a stored app-user → address
    // mapping here.
    authorizeUnlinkAddress: async () => true,
  })
}
