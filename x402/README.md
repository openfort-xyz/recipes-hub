# Openfort x402 Modular Demo

A structured, end-to-end reference that showcases how Openfort smart accounts power an x402 paywall. The project is split into clear server, integration, and UI layers so it is easy to lift pieces into your own stack.

## Directory Overview

```
openfort_x402/
├─ server/                       # Hono API broken into config, routes, services
│  ├─ app.js                     # Assembles middleware + routes
│  ├─ config/environment.js      # Environment parsing & payment defaults
│  ├─ integrations/openfort...   # Openfort Node client creator
│  └─ routes/…                   # /api/protected-content, /shield-session, /health
├─ src/
│  ├─ App.tsx                    # Mounts the paywall experience
│  ├─ features/paywall/          # All paywall UI + hooks
│  │  ├─ PaywallExperience.tsx   # Orchestrates authentication → payment → unlock
│  │  ├─ components/             # Auth, wallet, payment, success views
│  │  └─ hooks/usePaymentRequirements.ts
│  ├─ integrations/openfort/     # React providers & config helpers
│  ├─ integrations/x402/         # Protocol helpers (types, encoding, balance)
│  └─ types/                     # Global ambient types (window.x402, …)
└─ server.js                     # Node entry that boots the Hono server
```

## Quick Start

```bash
pnpm install
pnpm dev:all          # Runs server (http://localhost:3007) + Vite (http://localhost:5173)
```

To run individually:

```bash
pnpm server
pnpm dev
```

## Environment Setup

Create `.env.local` (used by both server & client):

```env
# Openfort Configuration
VITE_OPENFORT_PUBLISHABLE_KEY=pk_test_...
VITE_SHIELD_PUBLISHABLE_KEY=shpk_test_...
VITE_WALLET_CONNECT_PROJECT_ID=your-wallet-connect-project-id
VITE_POLICY_ID=pol_...
VITE_CREATE_ENCRYPTED_SESSION_ENDPOINT=http://localhost:3007/api/shield-session

# Server-side Openfort Keys
OPENFORT_SECRET_KEY=sk_test_...
OPENFORT_SHIELD_SECRET_KEY=shsk_test_...
OPENFORT_SHIELD_ENCRYPTION_SHARE=shield_encryption_share

# Client-side X402 Defaults
VITE_X402_RESOURCE_URL=http://localhost:3007/api/protected-content
VITE_X402_DEFAULT_AMOUNT=0.1        # Default payment amount in USDC

# Server X402 Configuration (optional overrides - fallbacks are provided)
PAY_TO_ADDRESS=0x...
X402_NETWORK=base-sepolia           # or base
X402_MAX_AMOUNT=100000              # base units (6 decimals for USDC)
X402_ASSET_ADDRESS=0x...            # token address for your network
```

`server/config/environment.js` centralises all parsing and validation so you only touch a single file to adjust networks, amounts, or destination addresses.

## Integration Recipe

1. **Configure the server**
   - Update `.env.local` and/or `server/config/environment.js` with your network, pay-to address, and custom messaging.
   - The server exposes:
     - `/api/protected-content` – returns a 402 response with x402 payment requirements or unlocks content after payment/on-chain proof.
     - `/api/shield-session` – issues Openfort Shield recovery sessions.
     - `/api/health` – quick readiness probe.

2. **Embed providers once**
   - `src/integrations/openfort/OpenfortProviders.tsx` wraps Wagmi, React Query, and the Openfort React SDK. Wrap your application root with `<OpenfortProviders>` so any page can opt into smart account flows.

3. **Use the paywall experience**
   - `src/features/paywall/PaywallExperience.tsx` orchestrates:
     1. Fetching x402 requirements via `usePaymentRequirements`.
     2. Openfort authentication + wallet activation.
     3. On-chain USDC transfer (viem/wagmi) and monitoring the receipt.
     4. Unlocking protected content once payment is final.
   - Swap out any UI states by editing the components inside `src/features/paywall/components/`.

4. **Share protocol helpers**
   - `src/integrations/x402` exposes utilities for selecting requirements, encoding payloads, and reading USDC balances. Reuse these helpers inside other flows (e.g., a dashboard) without touching UI code.

5. **Adjust business rules**
   - Change the demo content response in `server/routes/protectedContent.js`.
   - Modify payment fallback values in `server/services/paymentRequirements.js`.
   - Add custom authentication/authorisation before creating Shield sessions in `server/routes/shieldSession.js`.

## Feature Highlights

- Modular Hono server with environment-driven configuration.
- Dedicated x402 helpers for payload selection and encoding.
- Smart-account UX using the Openfort React SDK (providers, wallet creation, recovery flows).
- React feature module for the entire paywall journey with explicit loading/error/auth/payment states.
- Automatic USDC balance polling and Base/Base-Sepolia network switching.

## Tooling

- React 18 + Vite + TypeScript
- Wagmi & viem for blockchain interaction
- Openfort React + Node SDKs
- Hono for lightweight HTTP APIs
- Biome for formatting/linting (`pnpm check`, `pnpm format`)

## Useful Scripts

```bash
pnpm dev         # Frontend only
pnpm server      # API only
pnpm dev:all     # Run both concurrently
pnpm tsc -b      # Type-check client + config
pnpm build       # Production build (client bundle)
```
