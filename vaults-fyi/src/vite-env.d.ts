/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENFORT_PUBLISHABLE_KEY: string
  readonly VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY: string
  readonly VITE_OPENFORT_FEE_SPONSORSHIP_ID?: string
  readonly VITE_WALLET_CONNECT_PROJECT_ID?: string
  readonly VITE_BACKEND_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
