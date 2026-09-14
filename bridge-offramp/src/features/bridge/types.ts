// Bridge API shapes, narrowed to what this recipe uses.
// Reference: https://apidocs.bridge.xyz/api-reference

/** Source token. Bridge also supports usdb, usdt, pyusd, eurc. */
export type BridgeCurrency = 'usdc'

/**
 * Source chain. Bridge has no testnet chains at all — sandbox returns dummy
 * data on mainnet chain names rather than exposing Sepolia or devnets.
 */
export type BridgeChain = 'base' | 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'solana'

/** The fiat rails this recipe offers. Bridge supports many more. */
export type PaymentRail = 'ach' | 'wire' | 'sepa'

export type FiatCurrency = 'usd' | 'eur'

export type KycStatus =
  | 'not_started'
  | 'incomplete'
  | 'awaiting_questionnaire'
  | 'awaiting_ubo'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'paused'
  | 'offboarded'

export interface KycLink {
  id: string
  /** Hosted KYC flow the user completes. */
  kyc_link: string
  /** Bridge's terms of service — must be accepted before approval. */
  tos_link: string
  kyc_status: KycStatus
  tos_status: 'pending' | 'approved'
  /** Only present once the link has been approved. */
  customer_id?: string
  created_at: string
}

export interface UsBankAccountInput {
  account_number: string
  routing_number: string
  checking_or_savings: 'checking' | 'savings'
}

export interface IbanAccountInput {
  account_number: string
  bic: string
  /** ISO 3166-1 alpha-3, e.g. NLD. */
  country: string
}

export interface PostalAddress {
  street_line_1: string
  street_line_2?: string
  city: string
  /** Required for US addresses. */
  state?: string
  postal_code: string
  country: string
}

export interface ExternalAccount {
  id: string
  account_type: 'us' | 'iban'
  currency: FiatCurrency
  customer_id: string
  account_owner_name: string
  bank_name: string
  account?: { last_4: string; routing_number: string; checking_or_savings: string }
  iban?: { last_4: string; bic: string; country: string }
  active: boolean
  created_at: string
}

export interface LiquidationAddress {
  id: string
  customer_id: string
  /** The blockchain address the user sends USDC to. */
  address: string
  chain: BridgeChain
  currency: BridgeCurrency
  external_account_id?: string
  destination_payment_rail: PaymentRail
  destination_currency: FiatCurrency
  state: 'active' | 'deactivated'
  created_at: string
}

/**
 * Drains move forward only, and never backward. `payment_processed` is the
 * terminal success state; the rest of the failure states are terminal too.
 */
export type DrainState =
  | 'in_review'
  | 'funds_received'
  | 'payment_submitted'
  | 'payment_processed'
  | 'undeliverable'
  | 'returned'
  | 'error'
  | 'canceled'

export interface Drain {
  id: string
  state: DrainState
  amount: string
  currency: string
  destination_currency?: string
  /** On-chain hash of the deposit that triggered this drain. */
  deposit_tx_hash?: string
  created_at: string
  updated_at: string
  /** Set by this app, never by Bridge — see features/bridge/drains.ts. */
  simulated?: boolean
}
