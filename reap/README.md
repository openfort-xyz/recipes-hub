# Openfort × Reap: a card on your wallet

Issue a [Reap](https://docs.reap.global) virtual Visa card on an Openfort embedded wallet and load it with stablecoins on Polygon.

- **Open**: the user passes KYC and their embedded wallet signs Reap's auth message, which makes it the signer of a self-custodial Reap account.
- **Load**: the wallet sends stablecoins to the account's Reap deposit address (gas sponsored). Reap credits the card balance.
- **Spend**: the card authorizes against that balance anywhere Visa is accepted. Card details open in Reap's hosted iframe.

## 1. Setup

```sh
pnpx gitpick openfort-xyz/recipes-hub/tree/main/reap openfort-reap && cd openfort-reap
pnpm install
```

## 2. Get credentials

### Openfort

1. Create a project at [dashboard.openfort.io](https://dashboard.openfort.io).
2. From **API keys**, copy the publishable key, the secret key and the Shield publishable key.
3. Optional: create a **fee sponsorship** policy for Polygon Amoy (80002) and copy its ID (`pol_...`).

### Reap

Reap issues keys on request. Ask the Reap team for:

1. A **sandbox API key** on a **User-Funded** project.
2. Some **RUSDC on Polygon Amoy**, Reap's sandbox stablecoin, sent to your test wallet (sign in to the app first to get its address).

## 3. Configure

```sh
cp .env.example .env.local
```

Fill in the values; every variable is commented in `.env.example`.

## 4. Run

```sh
pnpm dev
```

Open http://localhost:3000, sign in with email, and create the wallet. Then:

1. Enter your name and phone number. Reap creates the cardholder.
2. Press **Approve KYC (sandbox)**. In production the user completes Reap's KYC here.
3. Press **Sign and open account**. The wallet signs, Reap opens the account and issues a virtual card.
4. **Load** an amount of RUSDC (0.50 minimum). The balance updates once Reap approves the deposit.
5. **Details** reveals the card number; **Spend** simulates a purchase against the balance.

## How it works

| Step | Reap call | Where |
| --- | --- | --- |
| Cardholder for the Openfort user, keyed by `externalId` = Openfort user id | `GET /users?externalId=`, `POST /users` | `src/features/reap/client.ts` |
| KYC (sandbox) | `POST /simulation/users/{id}/application` | same |
| Wallet becomes the account signer | `GET /accounts/auth-message`, `POST /accounts` with `signers.evm` | same |
| Issue the card | `POST /cards` (`VIRTUAL`) | same |
| Load the card | ERC-20 transfer to the account's deposit address, then `GET /accounts/{id}/balance` | `src/features/reap/use-reap.ts` |
| Show card details | `POST /cards/{id}/reveal` | `src/features/reap/client.ts` |
| Spend (sandbox) | `POST /simulation/card-transactions/authorization` | same |

Every route resolves the Reap user, account and card from the Openfort session token, never from ids in the request body.

> Status: builds and type-checks; not yet run end to end against the Reap sandbox. See `AGENTS.md`.
