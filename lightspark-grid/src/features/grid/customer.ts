// Resolve the Grid customer from the Openfort session — never from the request
// body — so one signed-in user can't quote, simulate or read another's money.

import { createCustomer, findCustomer, GridError, getQuote } from '@/features/grid/client'
import type { authenticateRequest } from '@/lib/auth'

type OpenfortUser = Awaited<ReturnType<typeof authenticateRequest>>['user']

/**
 * The caller's Grid customer, created on first use.
 *
 * Grid needs a legal first and last name. Email sign-in often leaves the
 * Openfort user without a name, so the first call can pass one in; without a
 * usable name this throws 409 and the UI asks for it.
 */
export async function customerFor(user: OpenfortUser, fullName?: string) {
  const existing = await findCustomer(user.id)
  if (existing) return existing

  if (!user.email) throw new GridError('Grid needs an email for every customer — sign in with email', 400)
  const name = (fullName || user.name || '').trim().replace(/\s+/g, ' ')
  if (name.split(' ').length < 2) throw new GridError('Enter your first and last name', 409)

  return createCustomer({ userId: user.id, email: user.email, fullName: name })
}

/**
 * `POST /quotes` echoes `source.customerId` as `Customer:<uuid>`, but
 * `GET /quotes/{id}` returns the bare `<uuid>` — compare without the prefix.
 */
const bareId = (id?: string) => id?.replace(/^Customer:/, '')

/** Load a quote and refuse it unless it was created for this customer. */
export async function ownedQuote(quoteId: string, customerId: string) {
  const quote = await getQuote(quoteId)
  if (!quote.source.customerId || bareId(quote.source.customerId) !== bareId(customerId)) {
    throw new GridError('Quote not found', 404)
  }
  return quote
}
