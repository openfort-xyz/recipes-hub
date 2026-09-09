const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3021'

export type KycStatus = 'not_started' | 'pending' | 'approved' | 'declined'
export type FiatCurrency = 'USD' | 'EUR'

export type Rail = 'ach' | 'fedwire' | 'swift' | 'sepa'

/** One way to pay into the account. USD accounts come back with three. */
export interface BankMethod {
  rail: Rail
  accountNumber: string
  bankCode: string
  feeBase?: string
  feePct?: string
}

/** Rail-neutral account, as the backend maps it out of Noah's response. */
export interface VirtualAccount {
  currency: FiatCurrency
  accountHolderName: string
  bankName: string
  methods: BankMethod[]
  paymentMethodId: string
}

export type GetAccessToken = () => Promise<string | null | undefined>

async function call<T>(
  path: string,
  getAccessToken: GetAccessToken,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  const token = await getAccessToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const data = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`)
  return data
}

export const api = {
  getCustomer: (getAccessToken: GetAccessToken) =>
    call<{ status: KycStatus; fiatOptions: FiatCurrency[] }>(
      '/api/banking/customer',
      getAccessToken
    ),

  startOnboarding: (getAccessToken: GetAccessToken) =>
    call<{ status: KycStatus; hostedUrl?: string }>('/api/banking/customer', getAccessToken, {
      method: 'POST',
    }),

  createVirtualAccount: (
    getAccessToken: GetAccessToken,
    body: { walletAddress: string; fiatCurrency: FiatCurrency }
  ) =>
    call<{ account: VirtualAccount }>('/api/banking/virtual-account', getAccessToken, {
      method: 'POST',
      body,
    }),

  simulateDeposit: (
    getAccessToken: GetAccessToken,
    body: { paymentMethodId: string; fiatAmount: string; fiatCurrency: FiatCurrency }
  ) =>
    call<{ simulated: true }>('/api/banking/simulate-deposit', getAccessToken, {
      method: 'POST',
      body,
    }),
}

/**
 * What each field is called on a given rail. `bankCode` is a routing number on
 * ACH and Fedwire but a BIC on SWIFT and SEPA — labeling it wrong sends a
 * payer's money nowhere.
 */
export const RAIL_LABELS: Record<Rail, { title: string; number: string; code: string }> = {
  ach: { title: 'ACH', number: 'Account number', code: 'Routing number' },
  fedwire: { title: 'Domestic wire (Fedwire)', number: 'Account number', code: 'Routing number' },
  swift: { title: 'International wire (SWIFT)', number: 'Account number', code: 'SWIFT / BIC' },
  sepa: { title: 'SEPA credit transfer', number: 'IBAN', code: 'BIC' },
}

/** "$2.19 + 0.15%" — the difference between a cheap ACH and a $25 wire. */
export function formatFee(method: BankMethod, currency: FiatCurrency) {
  if (!method.feeBase) return undefined
  const symbol = currency === 'EUR' ? '€' : '$'
  const pct = method.feePct && method.feePct !== '0' ? ` + ${method.feePct}%` : ''
  return `${symbol}${method.feeBase}${pct}`
}
