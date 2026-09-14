// Server-only Bridge API client.
//
// The API key never reaches the browser: every call in this file runs inside a
// route handler that has already verified the caller's Openfort session.

import { createHash } from 'node:crypto'
import type {
  ExternalAccount,
  IbanAccountInput,
  KycLink,
  LiquidationAddress,
  PostalAddress,
  UsBankAccountInput,
} from '@/features/bridge/types'

const SANDBOX_BASE_URL = 'https://api.sandbox.bridge.xyz/v0'
const PRODUCTION_BASE_URL = 'https://api.bridge.xyz/v0'

export function isSandbox(): boolean {
  return (process.env.BRIDGE_ENVIRONMENT ?? 'sandbox') !== 'production'
}

function baseUrl(): string {
  return isSandbox() ? SANDBOX_BASE_URL : PRODUCTION_BASE_URL
}

function apiKey(): string {
  const key = process.env.BRIDGE_API_KEY
  if (!key) {
    throw new BridgeError(
      'BRIDGE_API_KEY is not configured. Sandbox keys are not self-serve — email support@bridge.xyz.',
      500
    )
  }
  return key
}

export class BridgeError extends Error {
  status: number
  /** Bridge's own error payload, when it sent one. */
  detail?: unknown

  constructor(message: string, status: number, detail?: unknown) {
    super(message)
    this.name = 'BridgeError'
    this.status = status
    this.detail = detail
  }
}

/**
 * Bridge requires an Idempotency-Key on every POST. Deriving it from the
 * operation and the Openfort user id (rather than a random UUID) means a
 * double-clicked button re-sends the *same* key, so Bridge returns the original
 * resource instead of minting a second bank account or cash-out address.
 */
export function idempotencyKey(operation: string, userId: string, salt = ''): string {
  return createHash('sha256').update(`${operation}:${userId}:${salt}`).digest('hex').slice(0, 36)
}

async function request<T>(
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown; idempotencyKey?: string }
): Promise<T> {
  const headers: Record<string, string> = {
    'Api-Key': apiKey(),
    'Content-Type': 'application/json',
  }
  if (init.idempotencyKey) headers['Idempotency-Key'] = init.idempotencyKey

  const res = await fetch(`${baseUrl()}${path}`, {
    method: init.method,
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  })

  const text = await res.text()
  const payload = text ? safeJson(text) : null

  if (!res.ok) {
    // Bridge returns { code, message, source } — surface its message rather
    // than a bare status, since the useful part is usually in `source`.
    const message = (payload as { message?: string } | null)?.message ?? `Bridge returned ${res.status} for ${path}`
    throw new BridgeError(message, res.status, payload)
  }

  return payload as T
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

/**
 * Start KYC. The hosted flow is where the user actually submits documents; the
 * customer record only exists once Bridge approves them.
 */
export function createKycLink(input: {
  fullName: string
  email: string
  userId: string
  redirectUri?: string
  /** e.g. ['sepa'] to collect proof of address for non-EEA customers. */
  endorsements?: string[]
}): Promise<KycLink> {
  return request<KycLink>('/kyc_links', {
    method: 'POST',
    idempotencyKey: idempotencyKey('kyc_link', input.userId),
    body: {
      full_name: input.fullName,
      email: input.email,
      type: 'individual',
      redirect_uri: input.redirectUri,
      endorsements: input.endorsements,
    },
  })
}

export function getKycLink(kycLinkId: string): Promise<KycLink> {
  return request<KycLink>(`/kyc_links/${kycLinkId}`, { method: 'GET' })
}

/** Sandbox only. Moves a customer straight to `approved`. */
export function simulateKycApproval(customerId: string): Promise<unknown> {
  if (!isSandbox()) throw new BridgeError('simulate_kyc_approval is a sandbox-only endpoint', 400)
  return request(`/customers/${customerId}/simulate_kyc_approval`, {
    method: 'POST',
    idempotencyKey: idempotencyKey('simulate_kyc', customerId),
  })
}

export function createExternalAccount(input: {
  customerId: string
  userId: string
  bankName: string
  accountOwnerName: string
  address: PostalAddress
  us?: UsBankAccountInput
  iban?: IbanAccountInput
  firstName?: string
  lastName?: string
}): Promise<ExternalAccount> {
  const isIban = Boolean(input.iban)

  return request<ExternalAccount>(`/customers/${input.customerId}/external_accounts`, {
    method: 'POST',
    idempotencyKey: idempotencyKey('external_account', input.userId, isIban ? 'eur' : 'usd'),
    body: {
      currency: isIban ? 'eur' : 'usd',
      bank_name: input.bankName,
      account_owner_name: input.accountOwnerName,
      account_type: isIban ? 'iban' : 'us',
      ...(isIban
        ? {
            iban: input.iban,
            // Bridge requires the owner split into parts for IBAN accounts.
            account_owner_type: 'individual',
            first_name: input.firstName,
            last_name: input.lastName,
          }
        : { account: input.us }),
      address: input.address,
    },
  })
}

/**
 * The cash-out address. Anything sent to it is converted and paid out to the
 * linked bank account, for as long as the address stays active.
 */
export function createLiquidationAddress(input: {
  customerId: string
  userId: string
  externalAccountId: string
  chain: string
  rail: 'ach' | 'wire' | 'sepa'
  destinationCurrency: 'usd' | 'eur'
  /** Where funds go back if a payout fails. Bridge flags this as critical. */
  returnAddress: string
  reference?: string
}): Promise<LiquidationAddress> {
  const reference =
    input.rail === 'sepa'
      ? { destination_sepa_reference: input.reference ?? 'Wallet cash out' }
      : input.rail === 'wire'
        ? { destination_wire_message: input.reference ?? 'Wallet cash out' }
        : { destination_ach_reference: (input.reference ?? 'CASHOUT').slice(0, 10) }

  return request<LiquidationAddress>(`/customers/${input.customerId}/liquidation_addresses`, {
    method: 'POST',
    idempotencyKey: idempotencyKey('liquidation_address', input.userId, `${input.rail}:${input.chain}`),
    body: {
      chain: input.chain,
      currency: 'usdc',
      external_account_id: input.externalAccountId,
      destination_payment_rail: input.rail,
      destination_currency: input.destinationCurrency,
      // The API reference calls this `return_instructions`; the offramp guide
      // page still calls it `return_address`. This follows the reference.
      return_instructions: { address: input.returnAddress },
      ...reference,
    },
  })
}

export function listDrains(customerId: string, liquidationAddressId: string): Promise<{ data: unknown[] }> {
  return request<{ data: unknown[] }>(`/customers/${customerId}/liquidation_addresses/${liquidationAddressId}/drains`, {
    method: 'GET',
  })
}
