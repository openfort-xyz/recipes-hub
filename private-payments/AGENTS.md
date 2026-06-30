# AGENTS.md — private-payments

## Overview

Pay supplier invoices privately with Openfort + Unlink on Monad testnet. Non-custodial: an Openfort
embedded **EOA** with **passkey** recovery owns an Unlink shielded balance; the backend only registers
the user and issues Unlink authorization tokens (never signs).

- `frontend/` — Vite + React. Openfort provider (Monad + EOA + passkey), browser Unlink client
  (`account.fromMetaMask`), and the payer/supplier UI.
- `backend/` — Express. `createUnlinkAdmin` + `createUnlinkAuthRoutes`, gated by the Openfort session token.

## Setup commands

```bash
cd backend && pnpm i && pnpm dev      # http://localhost:3020
cd frontend && pnpm i && pnpm dev     # http://localhost:5181
```

Copy `backend/.env.local.example` → `backend/.env.local` and `frontend/.env.example` → `frontend/.env`.

## Testing / checks

- Backend: `pnpm build` (tsc). Liveness: `curl localhost:3020/api/health`. The Unlink routes return `401`
  without a valid Openfort bearer token.
- Frontend: `pnpm build` (tsc + vite). Lint/format: `pnpm check` (Biome).

## Key constraints

- **`@openfort/react` is pinned to `1.3.0`** (needs `AccountTypeEnum.EOA`, `useEthereumEmbeddedWallet().provider`,
  and `uiConfig.walletRecovery`). Keep `wagmi` on `3.x` and `viem` on `2.x` to match.
- **`@unlink-xyz/sdk` is pinned to `0.3.0-canary.638`** (published on the `canary` dist-tag).
- **Passkey-only recovery** — no `getEncryptionSession` / automatic-recovery endpoint.
- **`UNLINK_API_KEY` is server-only.** The browser client posts to `/api/unlink/*` with the Openfort bearer;
  `customFetch` attaches it to those calls only. Backend CORS must allow the `Authorization` header.
- **Token is per Unlink project.** Set `VITE_UNLINK_TOKEN` to the Monad-testnet token address from the
  Unlink dashboard (the Engine has no token-list endpoint).
