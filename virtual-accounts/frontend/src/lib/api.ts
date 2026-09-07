const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3021'

export type KycStatus = 'not_started' | 'pending' | 'approved' | 'declined'
export type FiatCurrency = 'USD' | 'EUR'

/** Rail-neutral account, as the backend maps it out of Noah's response. */
export interface VirtualAccount {
  rail: 'ach' | 'sepa'
  currency: FiatCurrency
  accountHolderName: string
  /** IBAN when `rail` is `sepa`. */
  accountNumber: string
  /** BIC when `rail` is `sepa`. */
  bankCode: string
  bankName: string
  bankCity?: string
  bankCountry?: string
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
    call<{ status: KycStatus }>('/api/banking/customer', getAccessToken),

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

/** What each field is called on the rail the account was issued on. */
export function railLabels(account: VirtualAccount) {
  return account.rail === 'sepa'
    ? { number: 'IBAN', code: 'BIC', rail: 'SEPA credit transfer' }
    : { number: 'Account number', code: 'Routing number', rail: 'ACH or domestic wire' }
}
