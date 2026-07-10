# AGENTS.md

## Project overview

- Expo React Native app showcasing perps trading on the Lighter zk L2 DEX with Openfort embedded wallets.
- **Mainnet only** — there is no Lighter testnet in scope. All transactions move real funds/gas.
- `server/` is a separate Node/Express backend that holds the Lighter API key, signs orders via a
  vendored WASM build of `lighter-go`, and exposes a Shield encryption-session endpoint.
- See `docs/lighter-signing-notes.md` for the exact signing mechanics (ChangePubKey vs deposits vs
  orders) and `FRICTION_LOG.md` for everything that was non-obvious building this.

## Setup commands

- App: `pnpm install`, `cp .env.example .env.local`, `pnpm dev` (Expo dev client + tunnel).
- Server: `cd server && pnpm install && cp .env.example .env.local && pnpm dev`.
- Run the server before the app — the app calls it for all Lighter reads/writes.
- `scripts/e2e.md` documents the full manual verification flow with a funded mainnet wallet.

## Environment

- App `.env.local`: `OPENFORT_PUBLISHABLE_KEY`, `SHIELD_PUBLISHABLE_KEY`,
  `OPENFORT_SHIELD_RECOVERY_BASE_URL` (point at the server), `LIGHTER_SERVER_BASE_URL`,
  `LIGHTER_DEPOSIT_CONTRACT_ADDRESS`, `USDC_CONTRACT_ADDRESS`.
- Server `.env.local`: `OPENFORT_SECRET_KEY`, Shield keys, `LIGHTER_API_BASE_URL` (config-only
  Robinhood Chain support — swap to `https://api.rh.lighter.xyz`, no code changes), plus
  `LIGHTER_ACCOUNT_INDEX` / `LIGHTER_API_KEY_PRIVATE_KEY` / `LIGHTER_API_KEY_INDEX`, populated
  after onboarding (the server prints these to its console when registration succeeds).

## Testing instructions

- Server: `cd server && pnpm test` (vitest — signer determinism/sensitivity, tx construction, auth
  tokens) and `npx tsc --noEmit`.
- App: `pnpm run typecheck`, `pnpm run lint`, `npx expo export --platform ios` as a build smoke test.
- Nothing here can be tested end-to-end without a funded mainnet wallet — see `scripts/e2e.md` for
  what a human needs to do and verify manually.

## Code style

- TypeScript strict; server additionally enables `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`, `verbatimModuleSyntax`.
- Server is ESM Express, same shape as `x402/backend` — `config.ts` / `routes.ts` / `server.ts`.
- App follows the `hyperliquid/` recipe's structure (expo-router, `services/` + `hooks/` split,
  `utils/config.ts` env validation via `expo-constants`).
- Never hardcode contract addresses/ABIs without a cited source — this recipe encodes real
  mainnet transactions; see `services/depositFlow.ts` and `FRICTION_LOG.md` for how the deposit
  ABI was verified.

## PR instructions

- Title format: `[lighter] <summary>`.
- Update `.env.example` (both app and server) and this file if new configuration flags are added.
- Append a dated `FRICTION_LOG.md` entry for anything non-obvious you hit.
