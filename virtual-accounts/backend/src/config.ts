export type NoahEnvironment = 'sandbox' | 'production'

export interface Config {
  port: number
  allowedOrigins: string[]
  /** HTTPS URL Noah's hosted KYC redirects back to. Use a tunnel locally. */
  appUrl: string
  openfort: {
    secretKey: string
    publishableKey: string
  }
  noah: {
    environment: NoahEnvironment
    apiKey: string
    baseUrl: string
    /** ES384 PEM. Optional in sandbox, required in production. */
    signingPrivateKey?: string
    /** Noah's webhook public key for this environment (PEM). */
    webhookPublicKey?: string
    /** Sandbox tokens carry a _TEST suffix. */
    cryptoCurrency: string
    network: string
    /**
     * Currencies hosted onboarding asks the customer to sign up for. Each one
     * adds its entity's agreements to the flow — USD brings Noah's US banking
     * partner — so onboarding a customer to an entity that cannot serve their
     * country fails there, before any customer record exists.
     */
    fiatOptions: ('USD' | 'EUR')[]
  }
}

function parseFiatOptions(raw?: string): ('USD' | 'EUR')[] {
  const parsed = (raw ?? 'USD,EUR')
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter((code): code is 'USD' | 'EUR' => code === 'USD' || code === 'EUR')
  if (parsed.length === 0) {
    throw new Error('NOAH_FIAT_OPTIONS must list at least one of USD, EUR.')
  }
  return parsed
}

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Copy .env.local.example to .env.local and fill it in.`
    )
  }
  return value
}

function parseOrigins(raw?: string): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function loadConfig(): Config {
  const environment: NoahEnvironment =
    process.env.NOAH_ENVIRONMENT === 'production' ? 'production' : 'sandbox'
  const isSandbox = environment === 'sandbox'

  const signingPrivateKey = process.env.NOAH_SIGNING_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!isSandbox && !signingPrivateKey) {
    throw new Error(
      'NOAH_SIGNING_PRIVATE_KEY is required in production — Noah signs every request.'
    )
  }

  return {
    port: Number.parseInt(process.env.PORT ?? '3021', 10),
    allowedOrigins: parseOrigins(process.env.CORS_ORIGINS),
    appUrl: required('PUBLIC_APP_URL'),
    openfort: {
      // Validates the user's session token only — the backend never signs transactions.
      secretKey: required('OPENFORT_SECRET_KEY'),
      // Required so iam.getSession can fetch the project JWKS to verify tokens.
      publishableKey: required('OPENFORT_PUBLISHABLE_KEY'),
    },
    noah: {
      environment,
      // Server-only. Issues virtual accounts and reads customer state.
      apiKey: required('NOAH_API_KEY'),
      baseUrl: isSandbox ? 'https://api.sandbox.noah.com' : 'https://api.noah.com',
      signingPrivateKey,
      webhookPublicKey: process.env.NOAH_WEBHOOK_PUBLIC_KEY?.replace(/\\n/g, '\n'),
      cryptoCurrency: isSandbox ? 'USDC_TEST' : 'USDC',
      network: isSandbox ? 'PolygonTestAmoy' : 'Polygon',
      fiatOptions: parseFiatOptions(process.env.NOAH_FIAT_OPTIONS),
    },
  }
}
