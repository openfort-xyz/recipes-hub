# AGENTS.md

## Project overview
- Openfort embedded wallet + Tala Credit-as-a-Service, Next.js 15 (App Router).
- **Underwrite**: the server opts the user in with Tala (phone number + Openfort user id) and reads the loan offer.
- **Borrow**: the server quotes terms, accepts the loan (`PUT /api/v2/.../loan/offer`) and asks Tala to pay it out in USDC to the user's embedded wallet (`disbursement/request`).
- **Repay**: the wallet sends USDC to `TALA_REPAYMENT_ADDRESS` (gas sponsored); the server verifies the Transfer log on-chain and posts a `repayment/notification`.
- Wallet chain: Base Sepolia by default. Tala has no public sandbox: the base URL and OAuth credentials come with a partnership. Without `TALA_BASE_URL` the client calls an in-memory mock of the same API (`src/features/tala/mock.ts`).
- Tala credentials stay on the server. The route handlers in `src/app/api/credit/` call Tala only after verifying the Openfort session.

## Setup commands
- `pnpm install`
- `cp .env.example .env.local` and fill in the values
- `pnpm dev` starts on `http://localhost:3000`

## Environment
Every variable is listed in `.env.example` with a comment.

| Variable | Required | Read in |
| --- | --- | --- |
| `NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY` | yes | `src/features/openfort/providers/openfort-provider-boundary.tsx`, `src/lib/auth.ts` |
| `NEXT_PUBLIC_OPENFORT_SHIELD_PUBLISHABLE_KEY` | yes | `src/features/openfort/providers/openfort-provider-boundary.tsx` |
| `OPENFORT_SECRET_KEY` | yes | `src/lib/auth.ts` |
| `NEXT_PUBLIC_OPENFORT_FEE_SPONSORSHIP_ID` | no | `src/features/openfort/providers/openfort-provider-boundary.tsx` |
| `NEXT_PUBLIC_OPENFORT_DEFAULT_CHAIN_ID` | no, default `84532` | same, and `src/app/api/credit/repay/route.ts` |
| `TALA_BASE_URL` | no; empty = mock | `src/features/tala/client.ts` |
| `TALA_CLIENT_ID` / `TALA_CLIENT_SECRET` | with `TALA_BASE_URL` | same |
| `TALA_CURRENCY` | no, default `USD` | same, `src/features/tala/mock.ts` |
| `TALA_DISBURSEMENT_NETWORK` | no, default `base` | `src/features/tala/client.ts` |
| `TALA_REPAYMENT_ADDRESS` | to repay | `src/app/api/credit/loan/route.ts`, `src/app/api/credit/repay/route.ts` |

## Testing instructions
- `pnpm verify` runs `biome lint .`, `pnpm test` (node:test on the on-chain repayment check in `src/features/tala/repayment.ts`) and `next build`. It must finish with no errors and no warnings.
- Checked on 2026-10-20: `pnpm verify` passes, and the mock's full lifecycle (opt-in → offer → terms → accept → disbursement → partial repay → duplicate repayment rejected → full repay closes the loan → new offer) was run by calling `mockTala` directly.
- **Not yet verified at runtime**: the browser flow (sign-in, borrow, a real Base Sepolia repayment through `/api/credit/repay`) and every call against a real Tala environment, since no partner credentials were available. In particular confirm with Tala: the `destination.network` name for Base, that `disbursement/request` is enabled on your partner account, the currency/minor-unit codes, and that a repeated `externalTransactionId` is rejected.

## Add this to your app
For a coding agent adding Tala credit to an existing app that already has Openfort embedded wallets on an EVM chain and a server.

**Dashboard setup**
1. [dashboard.openfort.io](https://dashboard.openfort.io): publishable, secret and Shield publishable keys from one project; optional fee sponsorship policy (`pol_...`) on the chain users repay on.
2. Tala: a partnership gives you the CaaS base URL, an OAuth2 client ID and secret, and the currency configured on your account. Ask Tala to enable `disbursement/request` to crypto wallets if Tala, not you, pays the loans out.

**Install** (exact versions this recipe runs)
```sh
pnpm add @openfort/react@2.1.3 @openfort/openfort-node@0.12.2 wagmi@^3.6.16 viem@^2.52.2 @tanstack/react-query@^5.101.0
```
Tala has no npm dependency here: `src/features/tala/client.ts` is a ~170-line `fetch` wrapper. (Tala's drop-in UI SDKs, an Android AAR and the `@tala/caas-sdk` web package, are distributed privately to partners and are not used.)

**Files that carry the integration**
| File | Role |
| --- | --- |
| `src/features/tala/client.ts` | Server-only Tala calls: OAuth token, opt-in, offer, terms, accept, disbursement, loan, repayment notification |
| `src/lib/auth.ts` | Verifies the Openfort session (`iam.getSession`) and wallet ownership (`accounts.list`) |
| `src/app/api/credit/loan/route.ts` | Accepts the loan and pays it out to the verified wallet |
| `src/features/tala/repayment.ts` + `src/app/api/credit/repay/route.ts` | Reads the USDC repayment from the receipt's Transfer logs, then notifies Tala |
| `src/features/tala/use-credit.ts` | Client hook: calls the routes, sends the repayment with wagmi `writeContract` |

**Steps**
1. Copy `client.ts` and `types.ts` into your server code; set `TALA_BASE_URL`, `TALA_CLIENT_ID`, `TALA_CLIENT_SECRET`.
2. Use the Openfort user id as Tala's `partnerUserId`/`customerId`. Call `optIn` with the user's E.164 phone number, then `getOffer` until it leaves `offer_processing`.
3. On `offer_available`, call `getTerms` with an amount inside `creditLimit` and a duration inside `durationDays`, and show the user `totalBalance` and `dueDate`.
4. On accept, call `acceptOffer` with a fresh `partnerLoanId`, then `requestDisbursement` to the user's wallet address, after checking the address belongs to the session user.
5. For repayments, have the wallet transfer USDC to your collection address, verify the Transfer on-chain server-side (`repaidAmount`), then call `notifyRepayment` with the tx hash.

**Check it works**: with `TALA_BASE_URL` empty, borrowing shows the loan as `drawn`; repaying the full balance from a funded wallet closes it and a new offer appears.

## Openfort primitives
| Primitive | Where in code | Dashboard setup | Docs |
| --- | --- | --- | --- |
| `OpenfortProvider` (`publishableKey`, `walletConfig`, `uiConfig`) | `src/features/openfort/providers/openfort-provider-boundary.tsx` | Publishable key | [React wallet configuration](https://www.openfort.io/docs/products/embedded-wallet/react/wallet) |
| `walletConfig.shieldPublishableKey` | same | Shield publishable key | [API keys](https://www.openfort.io/docs/configuration/api-keys) |
| `walletConfig.ethereum.ethereumFeeSponsorshipId` | same | Fee sponsorship policy on the default chain | [Gas sponsorship](https://www.openfort.io/docs/configuration/gas-sponsorship) |
| `uiConfig.authProviders: [EMAIL_OTP]`, `walletRecovery.defaultMethod: PASSKEY` | same | Email OTP enabled | [UI configuration](https://www.openfort.io/docs/products/embedded-wallet/react/ui/configuration) |
| `OpenfortButton` | `src/features/tala/components/CreditFlow.tsx` | none | [Openfort UI](https://www.openfort.io/docs/products/embedded-wallet/react/ui) |
| `embeddedWalletConnector`, `OpenfortWagmiBridge` | `src/features/openfort/config/wagmi-config.ts`, `src/app/providers.tsx` | none | [Ethereum wallet configuration](https://www.openfort.io/docs/products/embedded-wallet/react/wallet/ethereum) |
| `useUser().getAccessToken` | `src/features/tala/use-credit.ts` | none | [useUser](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useUser) |
| `openfort.iam.getSession` | `src/lib/auth.ts` | Secret key | [Server-side auth](https://www.openfort.io/docs/products/server) |
| `openfort.accounts.list` | `src/lib/auth.ts` | Secret key | [Accounts](https://www.openfort.io/docs/products/server) |

## Failure modes
| Error | Cause | Fix |
| --- | --- | --- |
| `Duplicate externalTransactionId` | The same repayment tx was reported twice (seen against the mock) | Expected: a transfer counts once |

## Tala notes
- Two integration styles exist: Tala's drop-in SDK (Android AAR, `@tala/caas-sdk` for web; private, partner-only), where your server only mints a session token with `POST /api/v1/session/create`, and the server API this recipe uses, where your app renders every screen.
- `disbursement/request` takes minor units and a minor-unit currency code (USD → `USd`); offer, terms and repayment amounts are major units.
- Tala caps `externalTransactionId` and `transactionReceipt` at 64 characters, so the recipe sends the tx hash without `0x`.
- The phone number is user-entered in this recipe. In production, send the number you have verified for the user.

## Code style
- Biome (single quotes, no semicolons, 2-space, 120 col). Run `pnpm check` to format.
- Tala calls live only in `src/features/tala/client.ts` and run server-side; the browser talks to `src/app/api/credit/*`.

## PR instructions
- Title format: `[tala] <summary>`.
- `pnpm verify` must pass. For changes to the Tala client, run a borrow and a repayment (mock or real) and note the result under Testing instructions.
