/**
 * Typed client for the vaults.fyi v2 API using the official SDK.
 *
 * The SDK is configured with `apiBaseUrl` pointing at the Vite dev proxy
 * (/api/vaults-fyi) which adds the x-api-key header server-side.
 * The API key never reaches the browser bundle.
 *
 * Spec: https://docs.vaults.fyi/sdk/reference
 */

import { VaultsSdk } from '@vaultsfyi/sdk'

export const sdk = new VaultsSdk({ apiKey: 'proxied' }, { apiBaseUrl: `${window.location.origin}/api/vaults-fyi` })
