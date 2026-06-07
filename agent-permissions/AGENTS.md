# Agent Permissions Sample - Agent Guide

## Project Overview
Next.js 15 app demonstrating Dollar-Cost Averaging (DCA) via delegated transaction execution with time-limited permissions on Base Sepolia. A backend agent autonomously executes DCA swaps using Openfort embedded wallets + Calibur account abstraction (EIP-7702 + EIP-4337).

## Setup Commands

### Prerequisites
- Node.js 18+ (check with `node -v`)
- pnpm 10.28.1+ (managed via packageManager field)

### Install Dependencies
```bash
cd agent-permissions
pnpm install
```

### Environment Variables
Copy `.env.example` to `.env.local` and fill in real values:
```bash
cp .env.example .env.local
```

Required variables:
```
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

### Development
```bash
pnpm dev
```

### Build
```bash
pnpm build
```

## Testing Instructions

### Linting & Formatting
```bash
# Run biome check (format + lint + organize imports)
pnpm check

# Run biome lint only
pnpm lint

# Run biome format only
pnpm format
```

### Manual Testing
1. Start the dev server: `pnpm dev`
2. Open http://localhost:3000
3. Authenticate via email OTP
4. Create or recover wallet (passkey or password)
5. Use the dashboard to set up DCA and test airdrop functionality
6. Verify DCA execution via Vercel cron (`/api/dca/execute`)

## Code Style

- Next.js 15 with TypeScript 5.8 (target `es5` — use `BigInt(0)` not `0n`)
- Biome for formatting and linting (not ESLint/Prettier)
- Single quotes, no semicolons, 2-space indent, 120 char width
- Tailwind CSS v4 with `@theme inline` syntax and custom CSS variables
- pnpm for package management
- Organize imports automatically via Biome

### Key Patterns
- Functional React components with hooks
- Openfort React SDK for embedded wallets (`@openfort/react`)
- Openfort Node SDK for backend operations (`@openfort/openfort-node`)
- viem 2.52.2 (pinned) for blockchain interactions
- wagmi for Ethereum wallet hooks
- Upstash Redis for DCA config persistence
- All API routes authenticate via Bearer token using `authenticateRequest()` from `src/lib/auth.ts`
- Lazy-init Openfort Node SDK in API routes to avoid build-time errors

## Project Structure

```
agent-permissions/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── airdrop/route.ts        # POST — transfer USDC from backend wallet
│   │   │   └── dca/
│   │   │       ├── route.ts            # GET/POST — read/write DCA config
│   │   │       └── execute/route.ts    # GET — cron-triggered DCA execution
│   │   ├── globals.css                 # Tailwind v4 + CSS variables
│   │   ├── layout.tsx                  # Root layout (force-dynamic, dark mode)
│   │   └── page.tsx                    # Entry point
│   ├── components/
│   │   ├── Providers.tsx               # WagmiProvider + QueryClient + OpenfortProvider
│   │   └── cards/
│   │       ├── main.tsx                # State machine: loading → auth → wallet → dashboard
│   │       ├── auth.tsx                # Email OTP login form
│   │       ├── wallets.tsx             # Wallet creation/recovery
│   │       └── balance.tsx             # Dashboard: balances, airdrop, DCA controls
│   └── lib/
│       ├── auth.ts                     # Openfort IAM session validation
│       ├── calibur/index.ts            # Calibur smart account: key mgmt, sessions, UserOp signing
│       ├── dcaStore.ts                 # Upstash Redis store for DCA configs
│       └── wagmiConfig.ts              # Wagmi config for Base Sepolia
├── biome.json                          # Biome configuration
├── next.config.js                      # Webpack fallbacks for async-storage and pino-pretty
├── vercel.json                         # Cron job: /api/dca/execute every minute
├── package.json                        # Dependencies and scripts
└── tsconfig.json                       # TypeScript configuration
```

## Key Architecture

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

### Contracts (Base Sepolia)
- **Calibur**: `0x000000009b1d0af20d8c6d0a44e162d11f9b8f00`
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Mock WETH**: `0xbabe0001489722187FbaF0689C47B2f5E97545C5`

## Conventions
- No middleware file — auth is per-route
- Path alias: `@/*` → `./src/*`
- Webpack fallbacks: `@react-native-async-storage/async-storage` (false), `pino-pretty` (commonjs external)
- `@openfort/react` hooks: `useWallets()` returns `createWallet` method
- `useSignOut()` returns `signOut` taking optional `OpenfortHookOptions`

## Upgrade notes (June 2026)
- `@openfort/react` `walletConfig` nests the account type under `ethereum: { accountType: AccountTypeEnum.EOA, ethereumFeeSponsorshipId }` (it is no longer a top-level field). `Providers.tsx` was migrated accordingly.
- Stays on Next.js **15** (the webpack walletconnect shim is incompatible with Next 16 Turbopack). `app/layout.tsx` keeps `force-dynamic`.
- Keep `wagmi` on `^2` — `@openfort/react` peer-caps it at 2.x. Biome 2.4 config uses `files.includes` + `css.parser.tailwindDirectives`.

## PR Instructions
- Title format: `[agent-permissions] <summary>`
- Run `pnpm check` before committing to ensure code style compliance
- Document any environment variable changes in README.md and this file
- Test the DCA flow end-to-end before requesting review
