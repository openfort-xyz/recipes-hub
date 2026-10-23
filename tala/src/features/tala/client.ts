// Server-only Tala CaaS client.
//
// Tala underwrites the user and books the loan; the partner (this app) owns
// the user relationship and the money rails. The OAuth client credentials
// never reach the browser: every call here runs inside a route handler that
// has already verified the caller's Openfort session.
//
// Without TALA_BASE_URL the calls go to an in-memory stand-in (`mock.ts`), so
// the recipe runs before Tala has issued partner credentials.

import { mockTala } from '@/features/tala/mock'
import type { Envelope, Loan, LoanOffer, LoanTerms, Money } from '@/features/tala/types'

export class TalaError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'TalaError'
    this.status = status
  }
}

export function isMock(): boolean {
  return !process.env.TALA_BASE_URL
}

/** The currency configured on your Tala partner account. USDC settles 1:1 against it. */
export function currency(): string {
  return process.env.TALA_CURRENCY ?? 'USD'
}

let cachedToken: { value: string; expiresAt: number } | null = null

/** OAuth2 client_credentials, sent as HTTP Basic auth. Tokens last ~15 minutes. */
async function accessToken(baseUrl: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value

  const id = process.env.TALA_CLIENT_ID
  const secret = process.env.TALA_CLIENT_SECRET
  if (!id || !secret) throw new TalaError('TALA_CLIENT_ID and TALA_CLIENT_SECRET are not configured', 500)

  const res = await fetch(`${baseUrl}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })
  if (!res.ok) throw new TalaError(`Tala rejected the client credentials (${res.status})`, 502)
  const body = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1_000 }
  return body.access_token
}

async function request<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<T> {
  const baseUrl = process.env.TALA_BASE_URL
  if (!baseUrl) return mockTala(method, path, body) as T

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await accessToken(baseUrl)}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const payload = (await res.json().catch(() => null)) as Envelope<T> | null
  if (!res.ok || !payload?.data) {
    // metadata.errors names the problem; the requestId is what Tala support asks for.
    const reason = payload?.metadata?.errors?.join('; ') ?? `Tala returned ${res.status} for ${method} ${path}`
    const requestId = payload?.metadata?.requestId
    throw new TalaError(requestId ? `${reason} (request ${requestId})` : reason, res.status === 200 ? 502 : res.status)
  }
  return payload.data
}

const user = (partnerUserId: string) => `/users/${encodeURIComponent(partnerUserId)}`

/** Enrol the user. Tala starts underwriting; the offer can take a moment to appear. */
export function optIn(partnerUserId: string, phoneNumber: string) {
  return request<{ status: string; message?: string }>('POST', '/api/v1/users/opt-in', {
    phoneNumber,
    customerId: partnerUserId,
  })
}

export function getOffer(partnerUserId: string) {
  return request<LoanOffer>('GET', `/api/v1${user(partnerUserId)}/loan/offer`)
}

/** Fee breakdown and due date for an amount and duration inside the offer. */
export async function getTerms(partnerUserId: string, amount: number, duration: number) {
  const res = await request<{ loanTerms: LoanTerms }>('POST', `/api/v1${user(partnerUserId)}/loan/terms`, {
    amount: { amount, isoCode: currency() },
    duration,
  })
  return res.loanTerms
}

/** Book the loan. `partnerLoanId` is our own reference, unique per partner. */
export function acceptOffer(partnerUserId: string, input: { amount: number; dueDate: string; partnerLoanId: string }) {
  return request<{ loanId: string; status: string; partnerLoanId: string }>(
    'PUT',
    `/api/v2${user(partnerUserId)}/loan/offer`,
    {
      amount: { amount: input.amount, isoCode: currency() },
      dueDate: input.dueDate,
      action: 'Accept',
      partnerLoanId: input.partnerLoanId,
    }
  )
}

/**
 * Ask Tala to pay the loan out to the user's wallet. The disbursement endpoint
 * takes minor units and a minor-unit currency code (KES → KEs, USD → USd).
 */
export function requestDisbursement(partnerUserId: string, amount: number, walletAddress: string) {
  const code = currency()
  const decimals = new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions()
    .maximumFractionDigits as number
  return request<{ disbursementId: number; status: string }>(
    'POST',
    `/api/v1${user(partnerUserId)}/disbursement/request`,
    {
      amount: {
        amount: Math.round(amount * 10 ** decimals),
        isoCode: code.slice(0, -1) + code.slice(-1).toLowerCase(),
      },
      destination: { accountIdentifier: walletAddress, network: process.env.TALA_DISBURSEMENT_NETWORK ?? 'base' },
    }
  )
}

/** The user's current loan, or null when they have none. */
export async function getLoan(partnerUserId: string): Promise<Loan | null> {
  try {
    return await request<Loan>('GET', `/api/v1${user(partnerUserId)}/loan`)
  } catch (err) {
    if (err instanceof TalaError && err.status === 404) return null
    throw err
  }
}

/** Tell Tala a repayment landed on our rails: here, a USDC transfer we verified on-chain. */
export function notifyRepayment(
  partnerUserId: string,
  input: { msisdn: string; amount: Money; txHash: string; transactionTime: string; loanId: string }
) {
  // Tala caps both references at 64 characters; a tx hash without 0x is exactly 64.
  const ref = input.txHash.replace(/^0x/, '')
  return request<unknown>('POST', `/api/v1${user(partnerUserId)}/repayment/notification`, {
    msisdn: input.msisdn,
    transactionAmount: input.amount,
    externalTransactionId: ref,
    transactionTime: input.transactionTime,
    transactionReceipt: ref,
    billRefNumber: input.msisdn,
    loanId: input.loanId,
    repaymentType: 'CUSTOMER_INITIATED',
  })
}
