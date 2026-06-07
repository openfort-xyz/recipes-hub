# AGENTS.md

## Project overview

- MPP (Machine Payments Protocol) agent demo built on Openfort backend wallets.
- An agent gets an Openfort EVM backend wallet, is funded with PathUSD from a treasury, and pays for an HTTP `402` service on the Tempo testnet.
- Single Next.js App-Router app: the UI and the server routes that hold the wallet secret live together. All Openfort calls happen in `app/api/**` route handlers and `lib/**`.

## Setup commands

- `node -v` → ensure Node 18+.
- `pnpm install`
- `cp .env.example .env.local` and fill in `OPENFORT_SECRET_KEY`, `OPENFORT_WALLET_SECRET`, `TREASURY_WALLET_ID`, `MPP_RECIPIENT`, `MPP_SECRET_KEY`.
- `pnpm dev` → http://localhost:3000

## Testing instructions

- `pnpm build` — type-checks and compiles all routes.
- `pnpm lint` / `pnpm check` — Biome lint / lint+format with autofix.
- Manual: `POST /api/agent/create` returns a new wallet address; `GET /api/agent/balance?address=0x..` reads PathUSD from the Tempo RPC. The full fund → pay flow needs a treasury funded with PathUSD on Tempo.

## Code style

- Next.js + TypeScript, Biome for lint/format (single quotes, no semicolons, 120-col), pnpm.
- Keep wallet-secret usage server-side — never import `lib/openfort*.ts` from a client component.
- Openfort signs; viem/mppx broadcast to Tempo. Don't route Tempo transactions through Openfort's broadcast API — Openfort does not index Tempo.

## Key files

- `lib/openfort.ts` — client + agent wallet creation.
- `lib/openfort-account.ts` — Openfort backend wallet → viem account adapter (the core of the port).
- `lib/treasury.ts` — PathUSD funding over Tempo.
- `lib/mpp-client.ts` — MPP payment fetch wrapper.

## PR instructions

- Title format: `[mpp] <summary>`.
- Document any new environment variable in both `README.md` and `.env.example`.
- Run `pnpm build` and `pnpm lint` before requesting review.
