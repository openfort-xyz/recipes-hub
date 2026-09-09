import { createVerify } from 'node:crypto'
import { importPKCS8, SignJWT } from 'jose'
import type { Config } from './config.js'

/**
 * The whole Noah integration: signed HTTP client, the two endpoints this recipe
 * needs, webhook verification, and the mapping into a rail-neutral shape.
 *
 * @see https://docs.noah.com/products/bank-onramp/
 */

// ── Noah wire types (PascalCase, as the API returns them) ───────────────────

interface NoahCustomer {
  Verifications?: { Status: 'Pending' | 'Approved' | 'Declined' }
}

interface NoahFee {
  FiatCurrencyCode: string
  TotalFeeBase: string
  TotalFeePct: string
}

interface NoahVirtualAccount {
  AccountHolderName: string
  /** Account number on ACH/Fedwire/SWIFT, IBAN on SEPA. */
  AccountNumber: string
  /** Routing number on ACH/Fedwire, BIC on SWIFT/SEPA. */
  BankCode: string
  BankName: string
  PaymentMethodID: string
  PaymentMethodType: string
  Fee?: NoahFee
  /**
   * Other ways to pay the same account. A USD account comes back as SWIFT with
   * ACH and Fedwire in here — same account number, different bank code and fee.
   */
  RelatedPaymentMethods?: {
    Details: { AccountNumber: string; BankCode: string }
    Fee?: NoahFee
    PaymentMethodID: string
    PaymentMethodType: string
  }[]
  VirtualAccountID?: string
}

// ── Rail-neutral shapes the frontend consumes ──────────────────────────────

export type KycStatus = 'not_started' | 'pending' | 'approved' | 'declined'
export type FiatCurrency = 'USD' | 'EUR'
export type Rail = 'ach' | 'fedwire' | 'swift' | 'sepa'

/** One way to pay into the account. `bankCode` means something different on each rail. */
export interface BankMethod {
  rail: Rail
  /** IBAN on `sepa`, account number everywhere else. */
  accountNumber: string
  /** Routing number on `ach`/`fedwire`, BIC on `swift`/`sepa`. */
  bankCode: string
  feeBase?: string
  feePct?: string
}

export interface VirtualAccount {
  currency: FiatCurrency
  accountHolderName: string
  bankName: string
  /** Primary method first — the one the sandbox deposit simulation uses. */
  methods: BankMethod[]
  paymentMethodId: string
}

export class NoahError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: string
  ) {
    super(message)
    this.name = 'NoahError'
  }
}

function mapStatus(status?: string): KycStatus {
  if (status === 'Approved') return 'approved'
  if (status === 'Declined') return 'declined'
  return 'pending'
}

/**
 * `BankCode` is a routing number on ACH/Fedwire and a BIC on SWIFT/SEPA, so
 * the type is what decides how a field may be labeled. Never infer it from
 * the currency you asked for: USD comes back as SWIFT, not ACH.
 */
function mapRail(paymentMethodType: string): Rail {
  switch (paymentMethodType) {
    case 'BankSepa':
      return 'sepa'
    case 'BankAch':
      return 'ach'
    case 'BankFedwire':
      return 'fedwire'
    default:
      return 'swift'
  }
}

export function mapVirtualAccount(va: NoahVirtualAccount, currency: FiatCurrency): VirtualAccount {
  const methods: BankMethod[] = [
    {
      rail: mapRail(va.PaymentMethodType),
      accountNumber: va.AccountNumber,
      bankCode: va.BankCode,
      feeBase: va.Fee?.TotalFeeBase,
      feePct: va.Fee?.TotalFeePct,
    },
    ...(va.RelatedPaymentMethods ?? []).map((m) => ({
      rail: mapRail(m.PaymentMethodType),
      accountNumber: m.Details.AccountNumber,
      bankCode: m.Details.BankCode,
      feeBase: m.Fee?.TotalFeeBase,
      feePct: m.Fee?.TotalFeePct,
    })),
  ]
  return {
    currency,
    accountHolderName: va.AccountHolderName,
    bankName: va.BankName,
    methods,
    paymentMethodId: va.PaymentMethodID,
  }
}

export function createNoahClient(config: Config) {
  const { apiKey, baseUrl, signingPrivateKey, cryptoCurrency, network } = config.noah
  let cachedKey: CryptoKey | null = null

  /**
   * Noah verifies an ES384 JWT in the `Api-Signature` header. It is mandatory in
   * production; in sandbox a key created without a registered public key
   * authenticates on `X-Api-Key` alone, and sending an unregistered signature
   * fails with 401 "public key not found".
   */
  async function sign(method: string, path: string, body?: string): Promise<string> {
    if (!signingPrivateKey) throw new Error('NOAH_SIGNING_PRIVATE_KEY is not set')
    if (!cachedKey) cachedKey = await importPKCS8(signingPrivateKey, 'ES384')

    const url = new URL(`${baseUrl}${path}`)
    const queryParams = url.search ? Object.fromEntries(url.searchParams.entries()) : undefined
    let bodyHash: string | undefined
    if (body) {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body))
      bodyHash = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    }

    return new SignJWT({
      method: method.toUpperCase(),
      path: url.pathname,
      ...(queryParams && { queryParams }),
      ...(bodyHash && { bodyHash }),
    })
      .setProtectedHeader({ alg: 'ES384' })
      .setAudience('https://api.noah.com')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(cachedKey)
  }

  async function request<T>(path: string, init: { method?: string; body?: unknown } = {}) {
    const method = init.method ?? 'GET'
    const body = init.body === undefined ? undefined : JSON.stringify(init.body)
    const headers: Record<string, string> = {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    if (signingPrivateKey) headers['Api-Signature'] = await sign(method, path, body)

    const response = await fetch(`${baseUrl}${path}`, { method, headers, body })
    const text = await response.text()
    if (!response.ok) {
      throw new NoahError(`Noah ${response.status} on ${method} ${path}`, response.status, text)
    }
    return (text ? JSON.parse(text) : {}) as T
  }

  return {
    /** Current KYC status, or `null` when Noah has never seen this customer. */
    async getCustomer(customerId: string): Promise<KycStatus | null> {
      try {
        const customer = await request<NoahCustomer>(
          `/v1/customers/${encodeURIComponent(customerId)}`
        )
        return mapStatus(customer.Verifications?.Status)
      } catch (error) {
        if (error instanceof NoahError && error.status === 404) return null
        throw error
      }
    },

    /** Hosted KYC. Request both fiat options so either rail can be issued later. */
    async startOnboarding(customerId: string, returnUrl: string) {
      const session = await request<{ HostedURL: string }>(
        `/v1/onboarding/${encodeURIComponent(customerId)}`,
        {
          method: 'POST',
          body: {
            ReturnURL: returnUrl,
            FiatOptions: [{ FiatCurrencyCode: 'USD' }, { FiatCurrencyCode: 'EUR' }],
          },
        }
      )
      return { hostedUrl: session.HostedURL }
    },

    /**
     * Bind a bank account to a wallet address. `USD` comes back as a SWIFT
     * method with ACH and Fedwire alongside it; `EUR` as a single SEPA IBAN.
     * Every deposit is converted to `cryptoCurrency` and sent to the address.
     */
    async createVirtualAccount(args: {
      customerId: string
      walletAddress: string
      fiatCurrency: FiatCurrency
    }) {
      const account = await request<NoahVirtualAccount>(
        '/v1/workflows/bank-deposit-to-onchain-address',
        {
          method: 'POST',
          body: {
            CustomerID: args.customerId,
            FiatCurrency: args.fiatCurrency,
            CryptoCurrency: cryptoCurrency,
            Network: network,
            DestinationAddress: { Address: args.walletAddress },
          },
        }
      )
      return mapVirtualAccount(account, args.fiatCurrency)
    },

    /** Sandbox only: pretend a bank transfer arrived, so the rest of the flow runs. */
    async simulateDeposit(args: {
      paymentMethodId: string
      fiatAmount: string
      fiatCurrency: FiatCurrency
    }) {
      await request('/v1/sandbox/fiat-deposit/simulate', {
        method: 'POST',
        body: {
          PaymentMethodID: args.paymentMethodId,
          FiatAmount: args.fiatAmount,
          FiatCurrency: args.fiatCurrency,
        },
      })
    },

    /**
     * Noah signs the raw body with ECDSA SHA-384 and sends the base64 signature
     * in the `Webhook-Signature` header. Verify before parsing.
     *
     * @see https://docs.noah.com/api-concepts/webhooks/configuration/
     */
    verifyWebhook(rawBody: string, signature: string): boolean {
      const key = config.noah.webhookPublicKey
      if (!key || !signature) return false
      try {
        const verifier = createVerify('SHA384')
        verifier.update(rawBody)
        return verifier.verify(normalizePem(key), Buffer.from(signature, 'base64'))
      } catch {
        return false
      }
    },
  }
}

export type NoahClient = ReturnType<typeof createNoahClient>

/** Accepts a PEM pasted as a single line (as env vars usually are). */
function normalizePem(key: string): string {
  const body = key
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '')
  const lines = body.match(/.{1,64}/g)?.join('\n') ?? body
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`
}
