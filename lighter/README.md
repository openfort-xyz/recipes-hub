# Lighter Trading Demo

React Native Expo app demonstrating Openfort embedded wallets with mainnet perps trading on
[Lighter](https://lighter.xyz), a zk L2 DEX. A small Node backend holds the Lighter API key and
signs orders using a vendored WASM build of the official `lighter-go` signer — there is no
official TypeScript SDK for Lighter yet.

**This recipe is mainnet only.** There is no Lighter testnet. Every deposit, order, and
withdrawal in this app moves real funds and costs real gas.

## 1. Setup

```bash
pnpx gitpick openfort-xyz/recipes-hub/tree/main/lighter openfort-lighter && cd openfort-lighter
```

## 2. Prerequisites

- Node.js 22+
- iOS Simulator (XCode) or Android Emulator (Android Studio)
- Openfort account with Shield configuration ([Sign up](https://openfort.io))
- A funded Ethereum mainnet wallet with ETH (gas) and USDC (to deposit) if you intend to trade
  for real — the app degrades gracefully without one (see `scripts/e2e.md`)

## 3. Run the server first

The app calls this recipe's own server for everything Lighter-related, including the Shield
encryption-session endpoint (no separate `openfort-backend-quickstart` checkout needed).

```bash
cd server
pnpm install
cp .env.example .env.local
# Add your Openfort + Shield credentials to .env.local
pnpm dev
```

Runs on `http://localhost:3008`.

## 4. Configure the app

```bash
cp .env.example .env.local
```

```env
OPENFORT_PUBLISHABLE_KEY=pk_test_your_publishable_key
SHIELD_PUBLISHABLE_KEY=pk_test_your_shield_key
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

## Onboarding flow

Unlike testnet recipes, there's no faucet. Getting to a tradeable state takes three real steps,
all walked through in-app on first login:

1. **Deposit USDC** — your embedded wallet approves and deposits USDC to Lighter's mainnet
   contract. This is what creates your Lighter account (Lighter assigns an `account_index` on
   first deposit — there's no separate registration transaction).
2. **Authorize trading** — your embedded wallet signs a plain-text message (`personal_sign`, not
   typed data) authorizing a fresh, server-held API key to place and cancel orders. That key can
   never withdraw anywhere except back to your own wallet.
3. **Activate the server** — the server generates the API key in step 2 but doesn't load it
   automatically; copy the values it prints to its console into `server/.env.local` and restart
   it. The app polls and unlocks trading once it detects the server is ready.

See `scripts/e2e.md` for the full step-by-step with exact amounts and what to check at each stage.

## Features

- Embedded wallet authentication via Openfort Shield, guest or OAuth
- Mainnet USDC deposit flow (ERC-20 approve + Lighter contract deposit)
- ChangePubKey API key registration via `personal_sign`
- Cash App-style buy/sell flow for the ETH perp market with a live order book and IOC
  marketable-limit orders
- Open orders list with cancel, and a withdraw flow (always to your own wallet — Lighter's
  withdrawal transaction carries no destination address)

## Troubleshooting

- **Stuck on "Activate the server"** — you haven't copied the generated key into
  `server/.env.local` and restarted yet, or you restarted before copying (the key is only shown
  once — redo step 2 if lost).
- **Deposit doesn't show up** — Lighter can take a few minutes to credit a deposit; pull to
  refresh on the onboarding screen.
- **Order fails** — check `server/.env.local` has all three `LIGHTER_*` values and the server was
  restarted after setting them.

## Resources

- [Openfort Docs](https://openfort.io/docs)
- [Lighter API Docs](https://apidocs.lighter.xyz)
- [lighter-go](https://github.com/elliottech/lighter-go) (source for the vendored signer)
- `docs/lighter-signing-notes.md` — ground-truth signing mechanics with source citations
- `FRICTION_LOG.md` — everything that was non-obvious building this
