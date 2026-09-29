# Openfort × Lightspark Grid: dollars in, dollars out

Fund an Openfort embedded wallet from a bank account and cash it back out, with [Lightspark Grid](https://docs.lightspark.com) converting between USD and USDC on Base.

- **Add money**: Grid quotes a rate and returns bank details. The user pays by ACH, wire, RTP or FedNow, and Grid sends USDC to the wallet.
- **Cash out**: Grid quotes a rate and returns a USDC deposit address. The embedded wallet sends the USDC (gas sponsored), and Grid pays the user's bank.

## 1. Setup

```sh
pnpx gitpick openfort-xyz/recipes-hub/tree/main/lightspark-grid openfort-lightspark-grid && cd openfort-lightspark-grid
pnpm install
```

## 2. Get credentials

### Openfort

1. Create a project at [dashboard.openfort.io](https://dashboard.openfort.io).
2. From **API keys**, copy the publishable key, the secret key and the Shield publishable key.
3. Optional: create a **fee sponsorship** policy for Base Sepolia (84532) and copy its ID (`pol_...`).

### Lightspark Grid

1. Sign in at [app.lightspark.com](https://app.lightspark.com).
2. Go to **Settings → API Keys**, create a **Sandbox** key, and copy its **ID** and **secret**. Use the key's ID, not the platform ID shown elsewhere in the dashboard.

## 3. Configure

```sh
cp .env.example .env.local
```

Fill in the values; every variable is commented in `.env.example`.

## 4. Run

```sh
pnpm dev
```

Open http://localhost:3000, sign in with email, and create the wallet.

- **Add money**: enter an amount, get a quote, then press **Simulate the bank transfer**. The payment moves to `COMPLETED`.
- **Cash out**: link the prefilled sandbox bank account, get a quote, then press **Send**. The wallet needs Base Sepolia USDC; get some from [faucet.circle.com](https://faucet.circle.com).

## What the sandbox does and doesn't do

Grid's sandbox runs the real API (customers, quotes, bank accounts, payment status) but not the money movement. It has no testnet:

- **Add money** settles only in Grid's records. No USDC reaches the wallet on any chain; in production it lands on Base.
- **Cash out** sends real Base Sepolia USDC from the wallet to Grid's deposit address, but Grid only watches Base mainnet. So the app then calls `POST /sandbox/send` to tell Grid the deposit arrived. In production, Grid detects the deposit itself.

## How it works

| Step | Grid call | Where |
| --- | --- | --- |
| Customer for the Openfort user, keyed by `platformCustomerId` = Openfort user id | `GET /customers?platformCustomerId=`, `POST /customers` | `src/features/grid/client.ts` |
| Register the embedded wallet as the USDC destination | `POST /customers/external-accounts` (`BASE_WALLET`) | same |
| Link a bank account | `POST /customers/external-accounts` (`USD_ACCOUNT`) | same |
| Quote money in (USD → USDC) or money out (USDC on Base → USD) | `POST /quotes` with a `REALTIME_FUNDING` source | same |
| Track the payment | `GET /quotes/{id}`, `GET /transactions/{id}` | `src/app/api/quotes/[id]/route.ts` |

Every route resolves the Grid customer from the Openfort session token, never from the request body.
