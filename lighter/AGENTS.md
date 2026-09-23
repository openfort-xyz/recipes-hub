# AGENTS.md

## Project overview

- Expo React Native app showcasing perps trading on the Lighter zk L2 DEX with Openfort embedded wallets
  (`@openfort/react-native` 2.1.2, Expo 57 / RN 0.86).
- **Defaults to Lighter testnet** (free, faucet-funded). The embedded wallet's L1 chain is Ethereum
  mainnet, used only by the mainnet deposit path. Mainnet trading is config-switchable (see
  Environment below), and every transaction there moves real funds/gas.
- `server/` is a separate Node/Express backend (`@openfort/openfort-node` 0.12.2) that holds the
  Lighter API key, signs orders via a vendored WASM build of `lighter-go`, and exposes a Shield
  encryption-session endpoint.
- See `docs/lighter-signing-notes.md` for the exact signing mechanics (ChangePubKey vs deposits vs
  orders).

## Setup commands

- App: `pnpm install`, `cp .env.example .env.local`, `pnpm dev` (Expo dev client + tunnel).
- Server: `cd server && pnpm install && cp .env.example .env.local && pnpm dev`.
- Run the server before the app — the app calls it for all Lighter reads/writes.
- `scripts/e2e.md` documents the full manual verification flow with a funded mainnet wallet.

## Environment

- App `.env.local`: `OPENFORT_PUBLISHABLE_KEY`, `OPENFORT_SHIELD_PUBLISHABLE_KEY`,
  `OPENFORT_SHIELD_RECOVERY_BASE_URL` (point at the server), `OPENFORT_FEE_SPONSORSHIP_ID`
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
- `@openfort/react-native`'s `walletConfig` gas-sponsorship key is **`feeSponsorshipId`**, read from
  `OPENFORT_FEE_SPONSORSHIP_ID`. See `app/_layout.tsx`.
- Testnet onboarding needs zero wallet signatures for funding — `POST /api/lighter/faucet`
  (server-gated to testnet only) creates AND credits the Lighter account in one call. Mainnet
  keeps the real `approve` + `deposit` flow in `services/depositFlow.ts` untouched. The call
  returns before the credit lands, so `OnboardingStatusScreen` holds a spinner until the poll
  advances the step — don't "simplify" that back into the button's own `loading` prop.
- **App-side env changes require a native rebuild.** `Constants.expoConfig.extra` is read from
  `EXConstants.bundle/app.config`, a snapshot generated into the `.app` at build time — the Metro
  manifest is ignored for `extra`. Editing `lighter/.env.local` and restarting Metro silently
  leaves the app on the old values (this cost a full debug cycle chasing a Shield 401 that was
  really a stale publishable key). Rebuild + reinstall. `server/.env.local` needs only a restart.
- A market being `status: "active"` does NOT mean it can be traded. Testnet lists 176 active
  markets and ~3 have a two-sided book; the rest reject orders with "order book is empty".
  `server/src/markets.ts` resolves this into a `hasLiquidity` flag and the app lists only those.
  Note what does NOT work as a shortcut: `daily_quote_token_volume` is 0 for every testnet market
  (so there is nothing to rank by), and `last_trade_price > 0` over-selects — LIT and ZORA both
  report a last trade yet hold no resting orders. Only the order book itself is authoritative, so
  the cheap fields are used purely to prefilter which books are worth probing.
- Login is explicit-only, no cold-launch auto-restore: `app/index.tsx` signs out any session the
  SDK silently restored from storage before ever rendering (see `hooks/authGate.ts`'s
  `deriveAuthScreen`), so every launch lands on `LoginScreen`. Guest is ephemeral (a fresh
  `signUpGuest` mints a brand-new, unrecoverable account + wallet every run — the automatic demo
  path). Email is the persistent path — Shield recovers the SAME embedded wallet on re-login, no
  re-onboarding needed unless the server's trading key genuinely rotated (the existing
  `WALLET_SETTLE_MS` debounce in `UserScreen.tsx` still guards this path's wallet-restore race).

## Testing instructions

- `pnpm verify` in `lighter/` runs ESLint, `tsc --noEmit` (the app tsconfig excludes `server/`, so it
  passes without the server's `node_modules`) and vitest over the onboarding/auth gate logic in
  `hooks/`.
- `pnpm verify` in `lighter/server/` runs `tsc` and vitest (signer determinism/sensitivity, tx
  construction, auth tokens, markets, fill confirmation, env-file rewriting).
- `npx expo export --platform ios` is a bundle smoke test (checked after the 2.1.2 upgrade on
  2026-09-23).
- Not covered by `verify`, manual only: native build, guest/email login, Shield automatic recovery,
  wallet creation, faucet, ChangePubKey `personal_sign`, a real order. The testnet flow can be run
  end-to-end for free (no funded wallet needed); the mainnet variant needs a funded wallet. See
  `scripts/e2e.md` for both, testnet first. The 2.1.2 / 0.12.2 upgrade has NOT been runtime-tested yet.

## Add this to your app

For an existing Expo app that wants an Openfort embedded wallet to fund a Lighter account and
authorize a server-held Lighter API key.

**Dashboard setup**
1. Openfort project: copy the publishable key and secret key (API Keys).
2. Shield: create Shield keys and copy the Shield publishable key, secret key and encryption share
   (API Keys > Shield). Needed for automatic recovery.
3. Enable the auth methods you use (this recipe: guest and email OTP).
4. Optional, mainnet deposit only: a gas sponsorship policy on Ethereum mainnet; its ID goes in
   `OPENFORT_FEE_SPONSORSHIP_ID`.

**Packages**
- App: `npx expo install @openfort/react-native@2.1.2 expo-apple-authentication expo-application expo-crypto expo-linking expo-secure-store expo-web-browser react-native-webview react-native-get-random-values`
  (the `expo-*` and `react-native-webview` packages are SDK peer dependencies).
- Server: `npm install @openfort/openfort-node@0.12.2`.

**Files that carry the integration**
| File | Role |
|------|------|
| `app/_layout.tsx` | `OpenfortProvider` with `shieldPublishableKey`, `feeSponsorshipId`, `recoveryMethod: "automatic"`, `getEncryptionSession`, and the L1 chain from `constants/network.ts` |
| `services/walletRecovery.ts` | `getEncryptionSession` callback: POSTs to the server's `/api/protected-create-encryption-session` |
| `server/src/openfort.ts` + `handleShieldSession` in `server/src/routes.ts` | Calls `openfort.createEncryptionSession(shieldPublishableKey, shieldSecretKey, encryptionShare)` and returns `{ session }` |
| `components/UserScreen.tsx` | Create-vs-reconnect logic on `useEmbeddedEthereumWallet`, gated on `embeddedState` plus a settle window |
| `hooks/useLighterOnboarding.ts` (`registerLighterApiKey`) and `services/depositFlow.ts` | Use the wallet's EIP-1193 `provider` for the ChangePubKey `personal_sign` and the mainnet `approve` + `deposit` |

**Steps**
1. Load the polyfills before `expo-router/entry` (`entrypoint.ts`, `polyfills.ts`; set `"main"` in `package.json`).
2. Add the encryption-session route to your backend (server files above) and set the Shield env vars there.
3. Wrap the app in `OpenfortProvider` as in `app/_layout.tsx`.
4. Log users in with `useGuestAuth` / `useEmailAuthOtp` (`components/LoginScreen.tsx`).
5. Create or activate the embedded wallet as in `components/UserScreen.tsx`; do not create a wallet
   on the first `disconnected` + empty `wallets` render (see Failure modes).
6. Pass `ethereum.provider` to your Lighter funding and key-registration code.

**Check it works**: after login the wallet reaches `status === "connected"` with an address;
re-logging in with the same email shows the same address; the ChangePubKey step returns a
`personal_sign` signature the server accepts.

## Openfort primitives

| Primitive | Where in code | Dashboard setup | Docs |
|-----------|---------------|-----------------|------|
| `OpenfortProvider` (`walletConfig.shieldPublishableKey`, `recoveryMethod: "automatic"`, `getEncryptionSession`, `supportedChains`) | `app/_layout.tsx`, `constants/network.ts` | Publishable key, Shield keys | https://www.openfort.io/docs/products/embedded-wallet/react-native |
| `walletConfig.feeSponsorshipId` | `app/_layout.tsx` | Gas sponsorship policy (optional, mainnet deposit only) | https://www.openfort.io/docs/configuration/gas-sponsorship |
| `useGuestAuth` (`signUpGuest`) | `components/LoginScreen.tsx` | Guest auth enabled | https://www.openfort.io/docs/products/embedded-wallet/react-native/hooks/useGuestAuth |
| `useEmailAuthOtp` (`requestEmailOtp`, `signInEmailOtp`) | `components/LoginScreen.tsx` | Email auth enabled | https://www.openfort.io/docs/products/embedded-wallet/react-native/hooks/useEmailAuthOtp |
| `useOpenfortContext` (`user`, `isReady`, `logout`, `embeddedState`), `EmbeddedState` | `app/index.tsx`, `components/UserScreen.tsx` | None | https://www.openfort.io/docs/products/embedded-wallet/react-native/hooks/useOpenfort |
| `useEmbeddedEthereumWallet` (`create`, `setActive`, `status`, `wallets`, `activeWallet`, `provider`) | `components/UserScreen.tsx` | None | https://www.openfort.io/docs/products/embedded-wallet/react-native/hooks/useEmbeddedEthereumWallet |
| EIP-1193 `provider.request` (`personal_sign`, `eth_sendTransaction`, `eth_call`) | `hooks/useLighterOnboarding.ts`, `services/depositFlow.ts` | None | https://www.openfort.io/docs/products/embedded-wallet/react-native/wallet/actions/sign-message |
| Shield automatic recovery (encryption session) | `services/walletRecovery.ts` | Shield keys + encryption share | https://www.openfort.io/docs/products/embedded-wallet/react-native/quickstart/automatic |
| `openfort.createEncryptionSession` (`@openfort/openfort-node`) | `server/src/openfort.ts`, `server/src/routes.ts` | Secret key, Shield secret key, encryption share | https://www.openfort.io/docs/products/embedded-wallet/server/automatic-recovery-session |

## Failure modes

| Error | Cause | Fix |
|-------|-------|-----|
| `OpenfortError INVALID_CONFIGURATION ("Storage is not accessible...")` on the first auth call | iOS app built with `CODE_SIGNING_ALLOWED=NO`; the unsigned binary can't reach the Keychain | Build normally (signed), even for the simulator |
| Shield `401` after changing a key in `.env.local` | `Constants.expoConfig.extra` is baked into the native binary; restarting Metro keeps the old publishable key | Rebuild and reinstall the app |
| A new embedded wallet (new address) on every reload | Creating a wallet while `useEmbeddedEthereumWallet` briefly reports `disconnected` + empty `wallets` during session restore | Wait for `embeddedState` to leave `EmbeddedState.NONE` and for the state to hold for `WALLET_SETTLE_MS` (`components/UserScreen.tsx`) |
| `21120 invalid signature` on an order | The server's Lighter key was rotated by a later ChangePubKey at the same `(account, apiKeyIndex)` slot | Re-authorize from the app; the server adopts the new key |
| `order book is empty` | Market is `active` but has no two-sided book (most testnet markets) | Use only markets with `hasLiquidity` from `server/src/markets.ts` |
| `29500 internal server error` from the testnet faucet | Lighter's undocumented faucet is intermittently flaky | The server retries with backoff; retry again if it still fails |

## iOS builds: never disable code signing

Building with `CODE_SIGNING_ALLOWED=NO` (a common simulator-only speed-up) produces an app that
launches fine and only fails on the FIRST auth call, with a misleading `OpenfortError
INVALID_CONFIGURATION ("Storage is not accessible...")` — an unsigned binary can't reach the
simulator's Keychain, which `expo-secure-store`/`@openfort/openfort-js` need for session storage.
Cost a debugging round to trace back. Always build normally (signed, even for the simulator) with
Openfort or any other keychain-dependent SDK.

## Code style

- TypeScript strict; server additionally enables `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`, `verbatimModuleSyntax`.
- Server is ESM Express, same shape as `x402/backend` — `config.ts` / `routes.ts` / `server.ts`.
- App uses expo-router with a `services/` + `hooks/` split and `utils/config.ts` env validation
  via `expo-constants` — the structure shared by this hub's mobile recipes.
- Never hardcode contract addresses/ABIs without a cited source — this recipe encodes real
  mainnet transactions; see `services/depositFlow.ts` for how the deposit ABI was verified.

## PR instructions

- Title format: `[lighter] <summary>`.
- Update `.env.example` (both app and server) and this file if new configuration flags are added.
