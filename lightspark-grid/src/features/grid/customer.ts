// Resolve the Grid customer from the Openfort session — never from the request
// body — so one signed-in user can't quote, simulate or read another's money.

import { findOrCreateCustomer, GridError, getQuote } from '@/features/grid/client'
import type { authenticateRequest } from '@/lib/auth'

type OpenfortUser = Awaited<ReturnType<typeof authenticateRequest>>['user']

export function customerFor(user: OpenfortUser) {
  if (!user.email) throw new GridError('Grid needs an email for every customer — sign in with email', 400)
  return findOrCreateCustomer({
    userId: user.id,
    email: user.email,
    fullName: user.name || user.email.split('@')[0],
  })
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
