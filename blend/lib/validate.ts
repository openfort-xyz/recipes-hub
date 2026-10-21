import { timingSafeEqual } from 'node:crypto'

export const USDC_DECIMALS = 6

/**
 * Parse a human USDC amount ("100.50") into its smallest unit ("100500000").
 * Returns null for anything that is not a positive amount with at most 6 decimals.
 */
export function parseUsdcAmount(input: unknown): string | null {
  if (typeof input !== 'string' || !/^\d+(\.\d{1,6})?$/.test(input)) return null
  const [whole, fraction = ''] = input.split('.')
  const units = BigInt(whole) * 10n ** BigInt(USDC_DECIMALS) + BigInt(fraction.padEnd(USDC_DECIMALS, '0'))
  return units > 0n ? units.toString() : null
}

/**
 * Check an `Authorization: Bearer <token>` header against the admin token, in constant time.
 * Returns false when no admin token is configured, so a missing env var never opens the API.
 */
export function isAuthorized(header: string | null, adminToken: string | undefined): boolean {
  if (!adminToken || !header?.startsWith('Bearer ')) return false
  const given = Buffer.from(header.slice('Bearer '.length))
  const expected = Buffer.from(adminToken)
  return given.length === expected.length && timingSafeEqual(given, expected)
}
