export interface Config {
  port: number
  allowedOrigins: string[]
  openfort: {
    secretKey: string
    publishableKey: string
  }
  unlink: {
    apiKey: string
    environment: string
  }
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
  return {
    port: Number.parseInt(process.env.PORT ?? '3020', 10),
    allowedOrigins: parseOrigins(process.env.CORS_ORIGINS),
    openfort: {
      // Validates the user's session token only — the backend never signs.
      secretKey: required('OPENFORT_SECRET_KEY'),
      // Required so iam.getSession can fetch the project JWKS to verify tokens.
      publishableKey: required('OPENFORT_PUBLISHABLE_KEY'),
    },
    unlink: {
      // Server-only admin key: register users + issue authorization tokens.
      apiKey: required('UNLINK_API_KEY'),
      environment: process.env.UNLINK_ENVIRONMENT ?? 'monad-testnet',
    },
  }
}
