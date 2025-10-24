# Openfort x402 Modular Demo

A structured, end-to-end reference that showcases how Openfort smart accounts power an x402 paywall. The project is split into clear server, integration, and UI layers so it is easy to lift pieces into your own stack.

## Directory Overview

```
openfort_x402/
├─ frontend/                     # React + Vite client application
│  ├─ src/
│  │  ├─ App.tsx                 # Mounts the paywall experience
│  │  ├─ features/paywall/       # All paywall UI + hooks
│  │  │  ├─ PaywallExperience.tsx # Orchestrates authentication → payment → unlock
│  │  │  ├─ components/          # Auth, wallet, payment, success views
│  │  │  └─ hooks/usePaymentRequirements.ts
│  │  ├─ integrations/openfort/  # React providers & config helpers
│  │  ├─ integrations/x402/      # Protocol helpers (types, encoding, balance)
│  │  └─ types/                  # Global ambient types (window.x402, …)
│  ├─ index.html
│  ├─ vite.config.ts
│  └─ package.json
├─ backend/                      # Node.js API server
│  ├─ server/                    # API broken into config, routes, services
│  │  ├─ app.js                  # Assembles middleware + routes
│  │  ├─ config/environment.js   # Environment parsing & payment defaults
│  │  ├─ integrations/openfort...# Openfort Node client creator
│  │  └─ routes/…                # /api/protected-content, /shield-session, /health
│  ├─ server.js                  # Node entry that boots the HTTP server
│  └─ package.json
├─ README.md
└─ AGENTS.md
```

## Quick Start

### Install dependencies

```bash
# Install frontend dependencies
cd frontend
pnpm install

# Install backend dependencies
cd ../backend
pnpm install
```

### Run the application

```bash
# From the backend directory
cd backend
pnpm dev              # Runs server on http://localhost:3007

# From the frontend directory (in a separate terminal)
cd frontend
pnpm dev              # Runs Vite on http://localhost:5173
```

## Environment Setup

### Frontend Configuration

Create `frontend/.env.local`:

```env
# Openfort Configuration
VITE_OPENFORT_PUBLISHABLE_KEY=pk_test_...
VITE_SHIELD_PUBLISHABLE_KEY=shpk_test_...
VITE_WALLET_CONNECT_PROJECT_ID=your-wallet-connect-project-id
VITE_POLICY_ID=pol_...
VITE_CREATE_ENCRYPTED_SESSION_ENDPOINT=http://localhost:3007/api/shield-session

# Client-side X402 Defaults
VITE_X402_RESOURCE_URL=http://localhost:3007/api/protected-content
VITE_X402_DEFAULT_AMOUNT=0.1        # Default payment amount in USDC
```

### Backend Configuration

Create `backend/.env.local`:

```env
# Server Configuration
PORT=3007

# Server-side Openfort Keys
OPENFORT_SECRET_KEY=sk_test_...
OPENFORT_SHIELD_PUBLISHABLE_KEY=...
OPENFORT_SHIELD_SECRET_KEY=shsk_test_...
OPENFORT_SHIELD_ENCRYPTION_SHARE=shield_encryption_share

# Payment Configuration
PAY_TO_ADDRESS=0x...
X402_NETWORK=base-sepolia           # or base
X402_RESOURCE=http://localhost:3007/api/protected-content
X402_DESCRIPTION=Access to premium content
X402_MIME_TYPE=application/json
X402_MAX_AMOUNT=100000              # base units (6 decimals for USDC)
X402_TIMEOUT=300
X402_ASSET_ADDRESS=0x...            # token address for your network
X402_ASSET_NAME=USDC
X402_ASSET_VERSION=1

# CORS Configuration
CORS_ORIGINS=http://localhost:5173,http://localhost:3007
```

`backend/server/config/environment.js` centralises all parsing and validation so you only touch a single file to adjust networks, amounts, or destination addresses.

## Integration Recipe

1. **Configure the backend**
   - Update `backend/.env.local` and/or `backend/server/config/environment.js` with your network, pay-to address, and custom messaging.
   - The server exposes:
     - `/api/protected-content` – returns a 402 response with x402 payment requirements or unlocks content after payment/on-chain proof.
     - `/api/shield-session` – issues Openfort Shield recovery sessions.
     - `/api/health` – quick readiness probe.

2. **Embed providers once**
   - `frontend/src/integrations/openfort/OpenfortProviders.tsx` wraps Wagmi, React Query, and the Openfort React SDK. Wrap your application root with `<OpenfortProviders>` so any page can opt into smart account flows.

3. **Use the paywall experience**
   - `frontend/src/features/paywall/PaywallExperience.tsx` orchestrates:
     1. Fetching x402 requirements via `usePaymentRequirements`.
     2. Openfort authentication + wallet activation.
     3. On-chain USDC transfer (viem/wagmi) and monitoring the receipt.
     4. Unlocking protected content once payment is final.
   - Swap out any UI states by editing the components inside `frontend/src/features/paywall/components/`.

4. **Share protocol helpers**
   - `frontend/src/integrations/x402` exposes utilities for selecting requirements, encoding payloads, and reading USDC balances. Reuse these helpers inside other flows (e.g., a dashboard) without touching UI code.

5. **Adjust business rules**
   - Change the demo content response in `backend/server/routes/protectedContent.js`.
   - Modify payment fallback values in `backend/server/services/paymentRequirements.js`.
   - Add custom authentication/authorisation before creating Shield sessions in `backend/server/routes/shieldSession.js`.

## Feature Highlights

- Modular Node.js server with environment-driven configuration.
- Dedicated x402 helpers for payload selection and encoding.
- Smart-account UX using the Openfort React SDK (providers, wallet creation, recovery flows).
- React feature module for the entire paywall journey with explicit loading/error/auth/payment states.
- Automatic USDC balance polling and Base/Base-Sepolia network switching.

## Tooling

- React 18 + Vite + TypeScript
- Wagmi & viem for blockchain interaction
- Openfort React + Node SDKs
- Node.js built-in http module for lightweight HTTP APIs
- Biome for formatting/linting (`pnpm check`, `pnpm format`)

## Useful Scripts

### Frontend

```bash
cd frontend
pnpm dev         # Start Vite dev server
pnpm build       # Production build
pnpm preview     # Preview production build
pnpm check       # Run Biome linter/formatter check
pnpm format      # Format code with Biome
```

### Backend

```bash
cd backend
pnpm start       # Start production server
pnpm dev         # Start with nodemon (auto-reload)
```
