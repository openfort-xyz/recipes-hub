# Lighter Trading Demo

React Native Expo app demonstrating Openfort embedded wallets with perps trading on
[Lighter](https://lighter.xyz), a zk L2 DEX. A small Node backend holds the Lighter API key and
signs orders using a vendored WASM build of the official `lighter-go` signer — there is no
official TypeScript SDK for Lighter yet.

**Defaults to Lighter testnet** — free, faucet-funded, no real money. Mainnet is fully supported
and just a config switch away (`server/.env.local`), but every deposit, order, and withdrawal
there moves real funds and costs real gas.

## 1. Setup

```bash
pnpx gitpick openfort-xyz/recipes-hub/tree/main/lighter openfort-lighter && cd openfort-lighter
```

## 2. Prerequisites

- Node.js 22+
- iOS Simulator (XCode) or Android Emulator (Android Studio) — **never build with
  `CODE_SIGNING_ALLOWED=NO`**, even for the simulator: an unsigned binary can't reach the
  Keychain, which breaks Openfort's session storage with a misleading error on your first login
  attempt (see `AGENTS.md`).
- Openfort account with Shield configuration ([Sign up](https://openfort.io)) — **email
  authentication must be enabled for your project** in the dashboard (Guest login works without
  it; email OTP won't).
- Only if trading on mainnet: a funded Ethereum mainnet wallet with ETH (gas) and USDC (to
  deposit) — see `scripts/e2e.md`.

## 3. Run the server first

The app calls this recipe's own server for everything Lighter-related, including the Shield
encryption-session endpoint (no separate `openfort-backend-quickstart` checkout needed).

```bash
cd server
pnpm install
cp .env.example .env.local
# Add your Openfort + Shield credentials to .env.local — Lighter network defaults to testnet
pnpm dev
```

Runs on `http://localhost:3008`.

## 4. Configure the app

```bash
cp .env.example .env.local
```

```env
OPENFORT_PUBLISHABLE_KEY=pk_test_your_publishable_key
OPENFORT_SHIELD_PUBLISHABLE_KEY=pk_test_your_shield_key
OPENFORT_SHIELD_RECOVERY_BASE_URL=http://localhost:3008
LIGHTER_SERVER_BASE_URL=http://localhost:3008
```

## 5. Install & run

```bash
pnpm install
pnpm dev          # Start Expo dev server
pnpm run ios          # Launch on iOS simulator
pnpm run android      # Launch on Android emulator
```

## Login

Every cold launch lands on the login screen — there's no silent auto-restore of a previous
session, even if one exists. The two options behave differently on purpose:

- **Guest** is ephemeral. Each tap of "Continue as Guest" creates a brand-new anonymous account
  and a fresh embedded wallet — guests can't be recovered once signed out, so there's no
  "continue where you left off" for this path. That also makes it the cheap, fully-automatic demo
  path: a new guest run walks the whole onboarding flow (faucet → sign → trade) from zero every
  time.
- **Email** persists. Sign in with the same email again and Shield recovers your existing
  embedded wallet — same address, same Lighter account, no re-onboarding — unless the server's
  trading key genuinely rotated since your last session, in which case the same safety-net
  recovery card from the Onboarding flow below handles it.

## Onboarding flow

Two steps, walked through in-app on first login:

1. **Fund your account.** On testnet: tap "Get testnet funds" — one REST call to Lighter's
   faucet both creates AND credits your account, no signature needed. On mainnet: your embedded
   wallet approves and deposits real USDC to Lighter's mainnet contract instead. Either way,
   Lighter assigns an `account_index` — there's no separate registration transaction.
2. **Authorize trading** — your embedded wallet signs a plain-text message (`personal_sign`, not
   typed data) authorizing a fresh API key to place and cancel orders. The server adopts that key
   as its own live trading key the instant the signature lands — no manual step: it re-creates
   its signing client and persists the credentials into `server/.env.local` itself, so a later
   restart doesn't need onboarding to run again. That key can never withdraw anywhere except back
   to your own wallet. Same on both networks.

The app polls and unlocks trading the moment the server reports it's ready **for this specific
account** — not just that some key is configured, since a server left pointed at an old account
would otherwise sign and fill orders you can't see.

See `scripts/e2e.md` for the full step-by-step with exact amounts and what to check at each stage
(testnet path first, mainnet as the variant).

## Switching to mainnet

Edit `server/.env.local`:

```env
LIGHTER_API_BASE_URL=https://mainnet.zklighter.elliot.ai
LIGHTER_CHAIN_ID=304
```

Restart the server. The app detects the network from the server and swaps the funding step from
faucet to real deposit automatically — no app-side config needed.

## Features

- Embedded wallet authentication via Openfort Shield — guest or email OTP
- Testnet: one-call faucet funding. Mainnet: real USDC deposit flow (ERC-20 approve + Lighter
  contract deposit), config-switchable, no code changes
- ChangePubKey API key registration via `personal_sign`
- Asset selector across every active market (perp + spot — 5 on testnet today, discovered live,
  never hardcoded) with a mini portfolio card (balance + open positions)
- Cash App-style buy/sell flow per asset with a live order book, IOC marketable-limit orders, and
  an order confirmation screen showing the actual matched size/price — the server polls Lighter's
  own trade record before responding, since `sendTx` itself reports no fill status
- Open orders list with cancel, and a withdraw flow (always to your own wallet — Lighter's
  withdrawal transaction carries no destination address)

## Troubleshooting

- **Guest login does nothing / email code never arrives** — check the error banner (both auth
  paths surface errors there); email OTP specifically needs to be enabled for your project in the
  Openfort dashboard.
- **`INVALID_CONFIGURATION` / "Storage is not accessible" on your first login attempt** — you
  built with `CODE_SIGNING_ALLOWED=NO`. Rebuild normally.
- **Stuck on "Trading key needs attention"** — this is a safety-net card, not the normal path; it
  only shows up if the server's key genuinely doesn't match what's on-chain (a hand-edited
  `server/.env.local`, a second server instance, or an adoption lost to a restart before it could
  persist). Tap **Re-authorize** — the server adopts the fresh key automatically, no manual step.
- **Funds don't show up** — both the faucet (seconds) and a real deposit (minutes) take a moment
  to land; pull to refresh on the onboarding screen.
- **Order fails with a stale-key error** — tap **Re-authorize** from the alert; the server adopts
  the fresh key immediately, no restart needed.

## Resources

- [Openfort Docs](https://openfort.io/docs)
- [Lighter API Docs](https://apidocs.lighter.xyz)
- [lighter-go](https://github.com/elliottech/lighter-go) (source for the vendored signer)
- `docs/lighter-signing-notes.md` — ground-truth signing mechanics with source citations
- `FRICTION_LOG.md` — everything that was non-obvious building this
