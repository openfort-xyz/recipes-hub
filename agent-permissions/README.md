# Agent Permissions

Delegated transaction execution via time-limited permissions. A backend agent autonomously executes DCA (Dollar-Cost Averaging) token swaps on behalf of users, demonstrating Openfort's embedded wallet + account abstraction stack on Base Sepolia.

## How it works

1. User authenticates via **email OTP** and creates an embedded wallet with **passkey recovery**
2. User enables DCA — backend provisions an agent wallet via Openfort
3. Frontend registers the agent's address as a **Secp256k1 key** on the user's Calibur account with a **5-minute expiration**
4. A **Vercel cron job** (every minute) picks up active agents and submits **ERC-4337 UserOperations** signed by the agent's session key
5. Each DCA execution transfers USDC from the user's account and mints mock WETH back (simulated swap)
6. All transactions are **gas-sponsored** via Openfort's paymaster

The agent key is non-admin and time-limited — it can only operate within its permission window and the user can revoke it at any time.

## Architecture

```
┌──────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   Frontend   │────▶│  Next.js API      │────▶│  Openfort SDK   │
│  (React 19)  │     │  Routes           │     │  (Node)         │
└──────┬───────┘     └────────┬──────────┘     └────────┬────────┘
       │                      │                         │
       │ sendTransaction      │ Cron: /api/dca/execute  │ Backend wallets
       ▼                      ▼                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Smart Account (EIP-7702 + EIP-4337)                 │
│  - Key registration, expiration, revocation                  │
│  - Session key signing via bundler + paymaster               │
└──────────────────────────────────────────────────────────────┘
```

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── airdrop/route.ts        POST — transfer 1 USDC from backend wallet to user
│   │   └── dca/
│   │       ├── route.ts            GET/POST — read/write DCA config, create agent wallet
│   │       └── execute/route.ts    GET (cron) — execute pending DCA swaps as UserOps
│   ├── page.tsx                    Client entry point
│   └── layout.tsx                  Root layout (force-dynamic)
├── components/
│   ├── Providers.tsx               Wagmi + OpenfortProvider + React Query
│   └── cards/
│       ├── auth.tsx                Email OTP login
│       ├── wallets.tsx             Wallet creation/selection
│       ├── balance.tsx             Dashboard: balances, airdrop, DCA controls
│       └── main.tsx                Step state machine (loading → auth → wallet → dashboard)
└── lib/
    ├── calibur/index.ts            Calibur smart account: key mgmt, session accounts, UserOp signing
    ├── dcaStore.ts                 Upstash Redis store for DCA configs
    └── wagmiConfig.ts              Wagmi config (Base Sepolia)
```

## API endpoints

| Endpoint           | Method | Description                                                    |
| ------------------ | ------ | -------------------------------------------------------------- |
| `/api/airdrop`     | POST   | Sends 1 USDC to `{ address }` from backend wallet              |
| `/api/dca`         | GET    | Returns DCA config + verifies onchain agent key status         |
| `/api/dca`         | POST   | Enables/disables DCA — creates agent wallet on enable          |
| `/api/dca/execute` | GET    | Cron-triggered: executes DCA for all active agents via UserOps |

## Calibur key model

Keys are registered on the user's Calibur account and identified by `keccak256(abi.encode(keyType, keccak256(publicKey)))`.

**Key settings** (bit-packed `uint256`):
- `isAdmin` (bit 200) — full account control
- `expiration` (bits 160-199) — unix timestamp, 0 = never
- `hook` (bits 0-159) — optional validator contract

The DCA agent uses a `Secp256k1` key with `isAdmin: false` and a 5-minute expiration.

## Contracts (Base Sepolia)

| Contract  | Address                                      |
| --------- | -------------------------------------------- |
| Calibur   | `0x000000009b1d0af20d8c6d0a44e162d11f9b8f00` |
| USDC      | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Mock WETH | `0xbabe0001489722187FbaF0689C47B2f5E97545C5` |

## Setup

```bash
pnpx gitpick openfort-xyz/recipes-hub/tree/main/agent-permissions openfort-agent-permissions && cd openfort-agent-permissions
```

```bash
pnpm i
cp .env.example .env.local
```

Fill in `.env.local`:

```env
# From https://dashboard.openfort.io
NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY=
NEXT_PUBLIC_SHIELD_PUBLISHABLE_KEY=
NEXT_PUBLIC_POLICY_ID=

# Server-side
OPENFORT_SECRET_KEY=
OPENFORT_WALLET_SECRET_KEY=
OPENFORT_BACKEND_WALLET_ID=

# Vercel Cron
CRON_SECRET=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

```bash
pnpm dev
```

## Resources

- [Openfort Documentation](https://www.openfort.io/docs)
- [Embedded Wallet React Docs](https://www.openfort.io/docs/products/embedded-wallet/react)
