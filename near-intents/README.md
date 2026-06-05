# Openfort × NEAR Intents Swap

Cross-chain swaps from an Openfort embedded wallet using the [NEAR Intents](https://docs.near-intents.org) 1Click API.

The user picks an origin asset, a destination asset, and an amount. The app fetches a quote (which returns a deposit address on the origin chain), the Openfort wallet sends a single transfer to that address, and a network of solvers settles the swap and delivers the destination asset. No NEAR account or NEAR-native signature is required — the only on-chain action is a normal EVM transfer.

## 1. Setup

```sh
pnpx gitpick openfort-xyz/recipes-hub/tree/main/near-intents openfort-near-intents && cd openfort-near-intents
```

## 2. Get Credentials

### Openfort

1. Create an account at [dashboard.openfort.io](https://dashboard.openfort.io)
2. Create a new project
3. Navigate to **API Keys** and copy your publishable key
4. Navigate to **Shield** settings and copy your Shield publishable key
5. (Optional) Create a **Policy** for gas sponsorship and copy the fee sponsorship ID

### NEAR Intents

1. (Optional) Request a JWT at [partners.near-intents.org](https://partners.near-intents.org)
2. Without a JWT the public endpoints work but apply a 0.2% fee and lower rate limits
3. The JWT is read server-side only — it is never exposed to the browser

## 3. Configure Environment

```sh
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```sh
NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_OPENFORT_SHIELD_PUBLISHABLE_KEY=...
NEXT_PUBLIC_OPENFORT_FEE_SPONSORSHIP_ID=pol_...     # Optional
NEXT_PUBLIC_OPENFORT_DEFAULT_CHAIN_ID=8453          # Base
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...            # Optional, enables wallet sign-in

ONECLICK_JWT=...                                    # Optional, server-side only
```

Sign-in is restricted to **email** and **external wallet**. The wallet option only
appears when `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set (free at
[cloud.reown.com](https://cloud.reown.com)); without it, email sign-in is used.

## 4. Install & Start

```sh
pnpm i
pnpm dev
```

## How it works

1. **Quote** — `POST /api/quote` proxies the 1Click `/v0/quote` endpoint (injecting the JWT server-side) and returns a deposit address plus the expected output.
2. **Deposit** — the Openfort wallet signs one transfer of the input asset to the deposit address (native send or ERC-20 `transfer`), switching chains first if needed.
3. **Track** — `GET /api/status` polls `/v0/status` until the swap reaches `SUCCESS`, `REFUNDED`, or `FAILED`, with origin/destination explorer links.

## Features

- **Cross-chain swaps** across Ethereum, Base, Arbitrum, Optimism, Polygon, and Avalanche
- **Openfort embedded wallets** with email/social authentication
- **Single-deposit UX** — solvers handle routing and settlement; no NEAR keys needed
- **Gas sponsorship** with Openfort policies (optional)
- **Live status tracking** with explorer links

## Notes

- **No testnet.** NEAR Intents runs on mainnet only — test with small amounts.
- The 1Click JWT lives in `ONECLICK_JWT` (server-side). It is intentionally not a `NEXT_PUBLIC_` variable.
- `amountOutUsd` from quotes is display-only — do not use it in business logic.
