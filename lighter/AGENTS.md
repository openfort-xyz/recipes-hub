# AGENTS.md

## Project overview

- Expo React Native app showcasing perps trading on the Lighter zk L2 DEX with Openfort embedded wallets.
- **Defaults to Lighter testnet** (free, faucet-funded) — mainnet is fully supported and
  config-switchable (see Environment below), but every transaction there moves real funds/gas.
- `server/` is a separate Node/Express backend that holds the Lighter API key, signs orders via a
  vendored WASM build of `lighter-go`, and exposes a Shield encryption-session endpoint.
- See `docs/lighter-signing-notes.md` for the exact signing mechanics (ChangePubKey vs deposits vs
  orders) and `FRICTION_LOG.md` for everything that was non-obvious building this.

## iOS builds: never disable code signing

Building with `CODE_SIGNING_ALLOWED=NO` (a common simulator-only speed-up) produces an app that
launches fine and only fails on the FIRST auth call, with a misleading `OpenfortError
INVALID_CONFIGURATION ("Storage is not accessible...")` — an unsigned binary can't reach the
simulator's Keychain, which `expo-secure-store`/`@openfort/openfort-js` need for session storage.
Cost a debugging round to trace back. Always build normally (signed, even for the simulator) with
Openfort or any other keychain-dependent SDK. See `FRICTION_LOG.md` for the full trace.

## Setup commands

- App: `pnpm install`, `cp .env.example .env.local`, `pnpm dev` (Expo dev client + tunnel).
- Server: `cd server && pnpm install && cp .env.example .env.local && pnpm dev`.
- Run the server before the app — the app calls it for all Lighter reads/writes.
- `scripts/e2e.md` documents the full manual verification flow with a funded mainnet wallet.

## Environment

- App `.env.local`: `OPENFORT_PUBLISHABLE_KEY`, `OPENFORT_SHIELD_PUBLISHABLE_KEY`,
  `OPENFORT_SHIELD_RECOVERY_BASE_URL` (point at the server), `OPENFORT_ETHEREUM_PROVIDER_POLICY_ID`
  (optional gas sponsorship — only spent on the mainnet deposit path), `LIGHTER_SERVER_BASE_URL`,
  `LIGHTER_DEPOSIT_CONTRACT_ADDRESS` / `USDC_CONTRACT_ADDRESS` (mainnet-only, unused by default),
  `LIGHTER_L1_CHAIN_ID` / `LIGHTER_L1_CHAIN_NAME` / `LIGHTER_L1_NATIVE_SYMBOL` /
  `LIGHTER_L1_RPC_URLS` (the embedded wallet's L1 chain — stays Ethereum mainnet even in testnet
  mode, see `constants/network.ts`).
- Server `.env.local`: `OPENFORT_SECRET_KEY`, Shield keys, `LIGHTER_API_BASE_URL` (defaults to
  Lighter testnet; config-only switch to mainnet or Robinhood Chain — see
  `docs/lighter-signing-notes.md` for the exact URLs/chain-ids of all four), `LIGHTER_CHAIN_ID`
  (the L2 signing domain — MUST match `LIGHTER_API_BASE_URL`, wrong value = every signature
  silently invalid), plus `LIGHTER_ACCOUNT_INDEX` / `LIGHTER_API_KEY_PRIVATE_KEY` /
  `LIGHTER_API_KEY_INDEX` — no manual setup needed for these three: a successful ChangePubKey
  submit makes the server adopt and persist them into this file itself (see
  `server/src/orders.ts`'s `adoptServerKey`). Only relevant if bootstrapping from a completely
  empty file or hand-recovering from a broken state.
- `@openfort/react-native`'s `walletConfig` gas-sponsorship key is **`feeSponsorshipId`** (renamed
  from `ethereumProviderPolicyId`, verified against the installed 1.1.7 types) — same
  `OPENFORT_ETHEREUM_PROVIDER_POLICY_ID` value, new field name. See `app/_layout.tsx`.
- Testnet onboarding needs zero wallet signatures for funding — `POST /api/lighter/faucet`
  (server-gated to testnet only) creates AND credits the Lighter account in one call. Mainnet
  keeps the real `approve` + `deposit` flow in `services/depositFlow.ts` untouched.
- Login is explicit-only, no cold-launch auto-restore: `app/index.tsx` signs out any session the
  SDK silently restored from storage before ever rendering (see `hooks/authGate.ts`'s
  `deriveAuthScreen`), so every launch lands on `LoginScreen`. Guest is ephemeral (a fresh
  `signUpGuest` mints a brand-new, unrecoverable account + wallet every run — the automatic demo
  path). Email is the persistent path — Shield recovers the SAME embedded wallet on re-login, no
  re-onboarding needed unless the server's trading key genuinely rotated (the existing
  `WALLET_SETTLE_MS` debounce in `UserScreen.tsx` still guards this path's wallet-restore race).

## Testing instructions

- Server: `cd server && pnpm test` (vitest — signer determinism/sensitivity, tx construction, auth
  tokens) and `npx tsc --noEmit`.
- App: `pnpm run typecheck`, `pnpm run lint`, `npx expo export --platform ios` as a build smoke test.
- The default testnet flow CAN be tested end-to-end for free (guest login, faucet, ChangePubKey,
  a real order) — no funded wallet needed, just gas-free testnet signatures. The mainnet variant
  still needs a funded wallet. See `scripts/e2e.md` for both, testnet first.

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
