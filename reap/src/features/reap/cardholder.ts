// Resolve the Reap user, account and card from the Openfort session — never
// from ids in the request body — so one signed-in user can't fund, reveal or
// spend another user's card.

import {
  createCard,
  createUser,
  findAccount,
  findCard,
  findUser,
  getBalance,
  isSandbox,
  ReapError,
} from '@/features/reap/client'
import type { CardholderState } from '@/features/reap/types'
import type { authenticateRequest } from '@/lib/auth'

type OpenfortUser = Awaited<ReturnType<typeof authenticateRequest>>['user']

export interface CardholderDetails {
  firstName?: string
  lastName?: string
  phoneNumber?: string
}

/**
 * The caller's Reap user, created on first use.
 *
 * Reap needs an email, a phone number (unique per project, used for card OTPs)
 * and a legal name. Openfort email sign-in gives only the email, so until the
 * UI sends the rest this throws 409 and the UI asks for them.
 */
export async function userFor(user: OpenfortUser, details: CardholderDetails = {}) {
  const existing = await findUser(user.id)
  if (existing) return existing

  if (!user.email) throw new ReapError('Reap needs an email for every cardholder — sign in with email', 400)
  const firstName = details.firstName?.trim()
  const lastName = details.lastName?.trim()
  const phoneNumber = details.phoneNumber?.replace(/[\s()-]/g, '')
  if (!firstName || !lastName || !phoneNumber) throw new ReapError('Enter your name and phone number', 409)
  if (!/^\+\d{8,15}$/.test(phoneNumber))
    throw new ReapError('Enter the phone number in international format, like +14155552671', 400)

  return createUser({ openfortUserId: user.id, email: user.email, phoneNumber, firstName, lastName })
}

/** The caller's Reap user, or 404 if they haven't been through `/api/state` yet. */
export async function requireUser(user: OpenfortUser) {
  const found = await findUser(user.id)
  if (!found) throw new ReapError('No cardholder yet', 404)
  return found
}

/** The caller's active card, or 404. */
export async function requireCard(user: OpenfortUser) {
  const reapUser = await requireUser(user)
  const account = await findAccount(reapUser.id)
  const card = account && (await findCard(account.id))
  if (!card) throw new ReapError('No card yet', 404)
  return card
}

/**
 * Everything the UI needs in one call. Issues the virtual card as soon as the
 * account exists, so a card is never missing once onboarding is done.
 */
export async function stateFor(user: OpenfortUser, reapChainId: string, details?: CardholderDetails) {
  const reapUser = await userFor(user, details)
  const state: CardholderState = {
    environment: isSandbox() ? 'sandbox' : 'production',
    kycStatus: reapUser.application.status,
    account: null,
    card: null,
    balance: null,
  }
  if (reapUser.application.status !== 'APPROVED') return state

  const account = await findAccount(reapUser.id)
  if (!account) return state

  state.account = {
    id: account.id,
    depositAddress: account.chainAddresses.find((a) => a.chainId === reapChainId)?.address ?? null,
  }
  state.card = (await findCard(account.id)) ?? (await createCard({ userId: reapUser.id, accountId: account.id }))
  state.balance = await getBalance(account.id)
  return state
}
