// Env vars required for the app to function. Missing values are surfaced in the UI rather
// than failing with an opaque runtime error inside the Openfort or Pay SDK.
const REQUIRED_ENV = {
  VITE_OPENFORT_PUBLISHABLE_KEY: 'Openfort publishable key',
  VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY: 'Openfort Shield publishable key',
  VITE_WALLETCONNECT_PAY_API_KEY: 'WalletConnect Pay API key',
} as const

export function missingEnv(): string[] {
  return Object.entries(REQUIRED_ENV)
    .filter(([key]) => !import.meta.env[key as keyof ImportMetaEnv])
    .map(([key, label]) => `${key} (${label})`)
}
