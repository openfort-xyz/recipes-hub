// The subset of Reap's API objects this recipe reads.

export type ApplicationStatus =
  | 'NOT_STARTED'
  | 'AWAITING_DOCUMENTS'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETRY_REQUIRED'

export interface User {
  id: string
  externalId: string | null
  email: string
  firstName: string | null
  lastName: string | null
  application: { status: ApplicationStatus; rejectionReason: string | null }
}

/** Reap's chain identifiers, e.g. `BASE_SEPOLIA`. */
export type ReapChainId = string

export interface Account {
  id: string
  status: 'ACTIVE' | 'RESTRICTED'
  chainAddresses: { chainId: ReapChainId; address: string }[]
}

export interface AuthMessage {
  message: string
  expiresAt: string
}

/** All values in the project's billing currency. */
export interface Balance {
  currency: string
  availableBalance: number
}

export interface Card {
  id: string
  status: 'ACTIVE' | 'FROZEN' | 'BLOCKED' | 'EXPIRED'
  cardholderName: string
  last4: string
}

/**
 * Approved authorizations report `amount` as a breakdown; declines report a
 * scalar `originalAmount` and a `declineReason` instead.
 */
export interface CardTransaction {
  id: string
  status: 'PENDING' | 'CLEARED' | 'DECLINED' | 'VOID'
  currency: string
  merchant: { name?: string }
  amount?: { current?: number; authorized?: number }
  originalAmount?: number | { current?: number }
  declineReason?: string
}

/** What `/api/state` returns: the cardholder's progress through user → KYC → account → card. */
export interface CardholderState {
  environment: 'sandbox' | 'production'
  kycStatus: ApplicationStatus | null
  account: { id: string; depositAddress: string | null } | null
  card: Card | null
  balance: Balance | null
}
