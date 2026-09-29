// Server-only Lightspark Grid client.
//
// The credentials never reach the browser: every call in this file runs inside
// a route handler that has already verified the caller's Openfort session.
// Sandbox and production share one base URL — the API token decides which
// environment a call lands in.

import type { Customer, ExternalAccount, Quote, Transaction, UsBankForm } from '@/features/grid/types'

const BASE_URL = 'https://api.lightspark.com/grid/2025-10-13'

export class GridError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'GridError'
    this.status = status
  }
}

export function isSandbox(): boolean {
  return (process.env.GRID_ENVIRONMENT ?? 'sandbox') !== 'production'
}

function authHeader(): string {
  const id = process.env.GRID_CLIENT_ID
  const secret = process.env.GRID_CLIENT_SECRET
  if (!id || !secret) {
    throw new GridError(
      'GRID_CLIENT_ID and GRID_CLIENT_SECRET are not configured. Create an API key at app.lightspark.com → Settings → API Keys.',
      500
    )
  }
  return `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`
}

async function request<T>(path: string, init: { method: 'GET' | 'POST'; body?: unknown } = { method: 'GET' }) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: init.method,
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  })

  const text = await res.text()
  if (!res.ok) {
    // Grid answers bad credentials with an HTML page, everything else with
    // { code, reason }. Surface the reason: it names the missing field.
    let reason = `Grid returned ${res.status} for ${init.method} ${path}`
    try {
      const body = JSON.parse(text) as { code?: string; reason?: string }
      if (body.reason) reason = `${body.code}: ${body.reason}`
    } catch {
      if (res.status === 401)
        reason = 'Grid rejected the API credentials — check GRID_CLIENT_ID is the key ID, not the platform ID'
    }
    throw new GridError(reason, res.status)
  }
  return JSON.parse(text) as T
}

/**
 * The Grid customer for an Openfort user, created on first use.
 *
 * `platformCustomerId` is the Openfort user id, so Grid itself holds the
 * mapping and this app needs no database. Sandbox platforms configured as a
 * regulated institution approve customers at creation; elsewhere the customer
 * starts unverified and needs `/customers/{id}/kyc-link` first.
 */
export async function findOrCreateCustomer(input: { userId: string; email: string; fullName: string }) {
  const found = await request<{ data: Customer[] }>(`/customers?platformCustomerId=${encodeURIComponent(input.userId)}`)
  if (found.data[0]) return found.data[0]

  return request<Customer>('/customers', {
    method: 'POST',
    body: {
      customerType: 'INDIVIDUAL',
      platformCustomerId: input.userId,
      fullName: input.fullName,
      email: input.email,
    },
  })
}

export async function listExternalAccounts(customerId: string) {
  const res = await request<{ data: ExternalAccount[] }>(
    `/customers/external-accounts?customerId=${encodeURIComponent(customerId)}`
  )
  return res.data
}

/** Register the user's Openfort wallet as the place bought USDC is sent. */
export async function findOrCreateWalletAccount(customerId: string, address: string) {
  const accounts = await listExternalAccounts(customerId)
  const existing = accounts.find(
    (a) => a.accountInfo.accountType === 'BASE_WALLET' && a.accountInfo.address?.toLowerCase() === address.toLowerCase()
  )
  if (existing) return existing

  return request<ExternalAccount>('/customers/external-accounts', {
    method: 'POST',
    body: { customerId, currency: 'USDC', accountInfo: { accountType: 'BASE_WALLET', address } },
  })
}

/** A US bank account for cash-outs. Grid needs the account holder as a full beneficiary. */
export function createBankAccount(customerId: string, form: UsBankForm) {
  return request<ExternalAccount>('/customers/external-accounts', {
    method: 'POST',
    body: {
      customerId,
      currency: 'USD',
      accountInfo: {
        accountType: 'USD_ACCOUNT',
        accountNumber: form.accountNumber,
        routingNumber: form.routingNumber,
        bankAccountType: form.bankAccountType,
        bankName: form.bankName,
        beneficiary: {
          beneficiaryType: 'INDIVIDUAL',
          fullName: form.fullName,
          birthDate: form.birthDate,
          nationality: form.address.country,
          address: form.address,
        },
      },
    },
  })
}

/**
 * Money in: the user pays dollars by bank transfer, Grid sends USDC to the
 * wallet. The receiving side is locked so the wallet gets exactly `usdcAmount`.
 */
export function createOnRampQuote(input: { customerId: string; walletAccountId: string; usdcAmount: bigint }) {
  return request<Quote>('/quotes', {
    method: 'POST',
    body: {
      source: { sourceType: 'REALTIME_FUNDING', customerId: input.customerId, currency: 'USD' },
      destination: { destinationType: 'ACCOUNT', accountId: input.walletAccountId },
      lockedCurrencySide: 'RECEIVING',
      lockedCurrencyAmount: Number(input.usdcAmount),
      description: 'Add money to wallet',
    },
  })
}

/**
 * Money out: the wallet sends USDC on Base to the deposit address in the
 * quote's payment instructions, Grid pays dollars to the bank. The sending
 * side is locked so the wallet sends exactly `usdcAmount`.
 */
export function createOffRampQuote(input: { customerId: string; bankAccountId: string; usdcAmount: bigint }) {
  return request<Quote>('/quotes', {
    method: 'POST',
    body: {
      source: { sourceType: 'REALTIME_FUNDING', customerId: input.customerId, currency: 'USDC', cryptoNetwork: 'BASE' },
      destination: { destinationType: 'ACCOUNT', accountId: input.bankAccountId },
      lockedCurrencySide: 'SENDING',
      lockedCurrencyAmount: Number(input.usdcAmount),
      description: 'Cash out to bank',
    },
  })
}

export function getQuote(quoteId: string) {
  return request<Quote>(`/quotes/${encodeURIComponent(quoteId)}`)
}

export function getTransaction(transactionId: string) {
  return request<Transaction>(`/transactions/${encodeURIComponent(transactionId)}`)
}

/**
 * Sandbox only: pretend the funding payment for a quote arrived — the bank
 * transfer for money in, the USDC deposit for money out.
 */
export function simulateFunding(quote: Quote) {
  if (!isSandbox()) throw new GridError('Simulated funding only exists in the Grid sandbox', 400)
  return request<Transaction>('/sandbox/send', {
    method: 'POST',
    body: { quoteId: quote.id, currencyCode: quote.sendingCurrency.code },
  })
}
