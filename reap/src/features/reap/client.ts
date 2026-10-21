// Server-only Reap client.
//
// The API key never reaches the browser: every call in this file runs inside a
// route handler that has already verified the caller's Openfort session.
// Sandbox and production have different base URLs, and a key works on one only.

import type { Account, AuthMessage, Balance, Card, CardTransaction, User } from '@/features/reap/types'

const API_VERSION = '2025-02-14'

export class ReapError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ReapError'
    this.status = status
  }
}

function baseUrl() {
  return process.env.REAP_API_URL || 'https://sg.sandbox.api.reap.global'
}

export function isSandbox(): boolean {
  return baseUrl().includes('sandbox')
}

async function request<T>(path: string, init: { method: 'GET' | 'POST'; body?: unknown } = { method: 'GET' }) {
  const key = process.env.REAP_API_KEY
  if (!key) throw new ReapError('REAP_API_KEY is not configured. Reap issues sandbox keys on request.', 500)

  const res = await fetch(`${baseUrl()}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Reap-Version': API_VERSION,
      'Content-Type': 'application/json',
      // Required on every create call. The find-before-create in cardholder.ts
      // is what prevents duplicates; this only makes a single retry safe.
      ...(init.method === 'POST' ? { 'Idempotency-Key': crypto.randomUUID() } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  })

  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!res.ok) {
    // Reap answers errors with { error: { code, message } }. Surface both: the
    // code is what the Failure modes table in AGENTS.md matches on.
    let reason = `Reap returned ${res.status} for ${init.method} ${path}`
    try {
      const body = JSON.parse(text) as { error?: { code?: string; message?: string } }
      if (body.error?.message) reason = `${body.error.code}: ${body.error.message}`
    } catch {}
    throw new ReapError(reason, res.status >= 500 ? 502 : res.status)
  }
  return JSON.parse(text) as T
}

/** `externalId` is the Openfort user id, so Reap holds the mapping and this app needs no database. */
export async function findUser(openfortUserId: string) {
  const res = await request<{ items: User[] }>(`/users?externalId=${encodeURIComponent(openfortUserId)}`)
  return res.items[0] ?? null
}

export function createUser(input: {
  openfortUserId: string
  email: string
  phoneNumber: string
  firstName: string
  lastName: string
}) {
  return request<User>('/users', {
    method: 'POST',
    body: {
      externalId: input.openfortUserId,
      email: input.email,
      phoneNumber: input.phoneNumber,
      firstName: input.firstName,
      lastName: input.lastName,
    },
  })
}

/** Sandbox only: Reap processes this asynchronously, so poll the user afterwards. */
export function simulateKycApproval(userId: string) {
  if (!isSandbox()) throw new ReapError('KYC simulation only exists in the Reap sandbox', 400)
  return request<void>(`/simulation/users/${encodeURIComponent(userId)}/application`, {
    method: 'POST',
    body: { status: 'APPROVED' },
  })
}

export async function findAccount(userId: string) {
  const res = await request<{ items: Account[] }>(`/accounts?ownerType=USER&ownerId=${encodeURIComponent(userId)}`)
  return res.items[0] ?? null
}

/** A time-limited message the wallet signs to become the account's signer. Expires after 15 minutes. */
export function getAuthMessage() {
  return request<AuthMessage>('/accounts/auth-message')
}

/**
 * User-Funded accounts are self-custodial: Reap provisions deposit addresses
 * on every enabled chain, and the EVM signer registered here is the key that
 * authorizes withdrawals. That signer is the user's Openfort wallet.
 */
export function createAccount(input: {
  userId: string
  signer: { address: string; message: string; signature: string }
}) {
  return request<Account>('/accounts', {
    method: 'POST',
    body: { ownerType: 'USER', ownerId: input.userId, signers: { evm: input.signer } },
  })
}

export function getBalance(accountId: string) {
  return request<Balance>(`/accounts/${encodeURIComponent(accountId)}/balance`)
}

export async function findCard(accountId: string) {
  const res = await request<{ items: Card[] }>(`/cards?accountId=${encodeURIComponent(accountId)}`)
  return res.items.find((c) => c.status === 'ACTIVE') ?? res.items[0] ?? null
}

export function createCard(input: { userId: string; accountId: string }) {
  return request<Card>('/cards', {
    method: 'POST',
    body: { userId: input.userId, accountId: input.accountId, type: 'VIRTUAL' },
  })
}

/** Single-use URL, valid 5 minutes. Load it straight into an iframe so the PAN never touches this server. */
export function revealCard(cardId: string) {
  return request<{ revealUrl: string; expiresAt: string }>(`/cards/${encodeURIComponent(cardId)}/reveal`, {
    method: 'POST',
    body: {},
  })
}

/** Sandbox only: a card purchase, authorized against the account's available balance. */
export function simulatePurchase(input: { cardId: string; amount: number; merchant: string }) {
  if (!isSandbox()) throw new ReapError('Simulated purchases only exist in the Reap sandbox', 400)
  return request<CardTransaction>('/simulation/card-transactions/authorization', {
    method: 'POST',
    body: { cardId: input.cardId, amount: input.amount, merchant: { name: input.merchant } },
  })
}
