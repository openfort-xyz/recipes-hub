# Agent Permissions — DCA Demo

## Project Overview

Next.js 15 app demonstrating **Dollar-Cost Averaging (DCA)** via delegated transaction execution with time-limited permissions on **Base Sepolia**. A backend agent autonomously executes DCA swaps using Openfort embedded wallets + Calibur account abstraction (EIP-7702 + EIP-4337).

## Tech Stack

- **Framework**: Next.js 15.3.1, React 19
- **Language**: TypeScript 5.8 (target: `es5` — use `BigInt(0)` not `0n`)
- **Styling**: Tailwind CSS v4 with `@theme inline` syntax, custom CSS variables (no shadcn)
- **Linting/Formatting**: Biome (not ESLint/Prettier) — single quotes, no semicolons, 2-space indent, 120 char width
- **Package Manager**: pnpm 10.28.1
- **Blockchain**: viem 2.45.3 (pinned), wagmi 2.18.2
- **Auth**: Openfort IAM (email OTP + passkey recovery)
- **Persistence**: Upstash Redis (serverless)
- **Deployment**: Vercel with cron job (every minute)

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm check        # Biome check + autofix
pnpm lint         # Biome lint only
pnpm format       # Biome format only
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (force-dynamic, dark mode)
│   ├── page.tsx                # Entry point → <Main />
│   ├── globals.css             # Tailwind v4 + CSS variables + base styles
│   └── api/
│       ├── airdrop/route.ts    # POST — transfer 1 USDC from backend wallet
│       └── dca/
│           ├── route.ts        # GET/POST — read/write DCA config, create agent wallet
│           └── execute/route.ts # GET — cron-triggered DCA execution
├── components/
│   ├── Providers.tsx           # WagmiProvider + QueryClient + OpenfortProvider
│   └── cards/
│       ├── main.tsx            # State machine: loading → auth → wallet → dashboard
│       ├── auth.tsx            # Email OTP login form
│       ├── wallets.tsx         # Wallet creation/recovery (passkey or password)
│       └── balance.tsx         # Dashboard: balances, airdrop, DCA controls, history
└── lib/
    ├── calibur/index.ts        # Calibur smart account: key mgmt, sessions, UserOp signing
    ├── dcaStore.ts             # Upstash Redis store for DCA configs
    ├── auth.ts                 # Openfort IAM session validation (authenticateRequest)
    └── wagmiConfig.ts          # Wagmi config for Base Sepolia
```

## Key Architecture

### User Flow
1. Email OTP auth → 2. Create/recover wallet (passkey or password) → 3. Dashboard (balances + DCA)

### DCA Flow
1. User enables DCA → backend creates agent wallet via Openfort
2. Frontend registers agent as Secp256k1 key on Calibur account with 5-min expiration
3. Vercel cron (`/api/dca/execute`) runs every 60s, executes pending DCA orders
4. Transactions gas-sponsored via Openfort paymaster
5. Agent keys are non-admin and time-limited (revokable)

### Calibur Key Model
- Keys identified by `keccak256(abi.encode(keyType, keccak256(publicKey)))`
- Bit-packed settings: `isAdmin` (bit 200), `expiration` (bits 160-199), `hook` (bits 0-159)
- Calibur address: `0x000000009b1d0af20d8c6d0a44e162d11f9b8f00`

## Environment Variables

```env
# Client-side
NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY    # Openfort SDK public key
NEXT_PUBLIC_SHIELD_PUBLISHABLE_KEY      # Shield for passkey recovery
NEXT_PUBLIC_POLICY_ID                   # Paymaster policy

# Server-side
OPENFORT_SECRET_KEY                     # Backend API key
OPENFORT_WALLET_SECRET_KEY              # Wallet encryption key
OPENFORT_BACKEND_WALLET_ID              # Airdrop wallet ID
CRON_SECRET                             # Vercel cron authorization

# Persistence
UPSTASH_REDIS_REST_URL                  # Redis endpoint
UPSTASH_REDIS_REST_TOKEN                # Redis auth token
```

## Contracts (Base Sepolia)

- **Calibur**: `0x000000009b1d0af20d8c6d0a44e162d11f9b8f00`
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Mock WETH**: `0xbabe0001489722187FbaF0689C47B2f5E97545C5`

## Conventions

- All API routes authenticate via Bearer token using `authenticateRequest()` from `src/lib/auth.ts`
- Openfort Node SDK: lazy-init in API routes to avoid build-time errors
- `@openfort/react` hooks: `useWallets()` returns `createWallet` method (not a separate hook)
- `useSignOut()` returns `signOut` taking optional `OpenfortHookOptions` — wrap in arrow function for onClick
- No middleware file — auth is per-route
- Path alias: `@/*` → `./src/*`
- Webpack fallbacks: `@react-native-async-storage/async-storage` (false), `pino-pretty` (commonjs external)
