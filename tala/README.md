# Openfort × Tala: undercollateralized credit

Offer small loans to users of an Openfort embedded wallet, with [Tala](https://docs.tala.co) Credit-as-a-Service doing the underwriting. No collateral: Tala decides from the user's phone number and history.

- **Check credit**: the user enters a phone number, the server opts them in with Tala, and Tala returns an offer (amount range, duration, daily rate).
- **Borrow**: the user picks an amount and a duration, reviews the fees and due date, and accepts. Tala books the loan and pays it out in USDC to the embedded wallet.
- **Repay**: the wallet sends USDC to the repayment address (gas sponsored). The server reads the transfer from the chain and reports it to Tala, which reduces the balance.

## 1. Setup

```sh
pnpx gitpick openfort-xyz/recipes-hub/tree/main/tala openfort-tala && cd openfort-tala
pnpm install
```

## 2. Get credentials

### Openfort

1. Create a project at [dashboard.openfort.io](https://dashboard.openfort.io).
2. From **API keys**, copy the publishable key, the secret key and the Shield publishable key.
3. Optional: create a **fee sponsorship** policy for Base Sepolia (84532) and copy its ID (`pol_...`).

### Tala

Tala issues partner credentials (a base URL, an OAuth2 client ID and secret) once you sign a partnership: contact Tala through [docs.tala.co](https://docs.tala.co). **Until then, leave `TALA_BASE_URL` empty**: the app runs against an in-memory mock of the same API (`src/features/tala/mock.ts`) that approves every user for 5–100 USD.

Set `TALA_REPAYMENT_ADDRESS` to an address you control on Base Sepolia. Repayments are sent there.

## 3. Configure

```sh
cp .env.example .env.local
```

Fill in the values; every variable is commented in `.env.example`.

## 4. Run

```sh
pnpm dev
```

Open http://localhost:3000, sign in with email, and create the wallet. Enter a phone number in E.164 format (`+254712345678`), check your credit, pick an amount and borrow. To repay, the wallet needs Base Sepolia USDC: get some from [faucet.circle.com](https://faucet.circle.com).

## What the mock does and doesn't do

- It answers the same Tala endpoints with the same response shapes, so the switch to real Tala is only environment variables.
- It books the loan but **does not pay it out**: no USDC reaches the wallet. With real Tala, the disbursement request pays the wallet.
- Repaying is real: the wallet sends Base Sepolia USDC to `TALA_REPAYMENT_ADDRESS`, and the server verifies it on-chain before notifying the mock.
- State lives in server memory and resets when the dev server restarts.

## How it works

| Step | Tala call | Where |
| --- | --- | --- |
| Server auth (OAuth2 client credentials, ~15 min token) | `POST /token` | `src/features/tala/client.ts` |
| Opt the user in; `customerId` = Openfort user id | `POST /api/v1/users/opt-in` | `src/app/api/credit/opt-in/route.ts` |
| Read the offer (polls while `offer_processing`) | `GET /api/v1/users/{id}/loan/offer` | `src/app/api/credit/offer/route.ts` |
| Price an amount and duration | `POST /api/v1/users/{id}/loan/terms` | same |
| Accept the loan with our own `partnerLoanId` | `PUT /api/v2/users/{id}/loan/offer` | `src/app/api/credit/loan/route.ts` |
| Pay it out to the verified embedded wallet | `POST /api/v1/users/{id}/disbursement/request` | same |
| Read the loan and its outstanding balance | `GET /api/v1/users/{id}/loan` | same |
| Report a repayment verified on-chain | `POST /api/v1/users/{id}/repayment/notification` | `src/app/api/credit/repay/route.ts` |

Every route takes the user from the Openfort session token, never from the request body, and checks that the wallet address belongs to that user before paying out or reading a repayment.
