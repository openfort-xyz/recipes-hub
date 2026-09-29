# AGENTS.md

## Project overview
- Openfort embedded wallet + Lightspark Grid fiat rails, Next.js 15 (App Router).
- **Add money**: Grid quotes USD → USDC, the user pays by bank transfer, Grid sends USDC to the wallet on Base.
- **Cash out**: Grid quotes USDC → USD, the wallet sends USDC to the quote's Base deposit address (gas sponsored), Grid pays the bank.
- Wallet chain: Base Sepolia by default. Grid settles on Base mainnet and its sandbox has no testnet, so in sandbox money in settles only in Grid's records, and money out is confirmed with `POST /sandbox/send` after the real Sepolia transfer.
- Grid credentials stay on the server. The route handlers in `src/app/api/` call Grid only after verifying the Openfort session.

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
| `NEXT_PUBLIC_OPENFORT_DEFAULT_CHAIN_ID` | no, default `84532` | same |
| `GRID_CLIENT_ID` | yes | `src/features/grid/client.ts` |
| `GRID_CLIENT_SECRET` | yes | same |
| `GRID_ENVIRONMENT` | no, default `sandbox` | same (`sandbox` enables the simulate step) |

## Testing instructions
- `pnpm verify` runs `biome lint .` and `next build` (type check included). It must finish with no errors and no warnings.
- Tested against the Grid sandbox on 2026-09-25 by calling `src/features/grid/client.ts` directly: customer and wallet account are idempotent, a $5.00 quote settles to 5 USDC `COMPLETED`, a quote read with another customer's id returns 404, and 3 USDC → bank settles `COMPLETED` over ACH with a 0.05 USDC fee.
- Not covered by `verify`, test manually with real keys: sign-in, wallet creation, the Base Sepolia USDC transfer in **Cash out**.

## Add this to your app
For a coding agent adding bank on/off-ramps through Grid to an existing app that already has Openfort embedded wallets on an EVM chain.

**Dashboard setup**
1. [dashboard.openfort.io](https://dashboard.openfort.io): publishable, secret and Shield publishable keys from one project; optional fee sponsorship policy (`pol_...`) on the chain users cash out from.
2. [app.lightspark.com](https://app.lightspark.com) → Settings → API Keys: a Sandbox key (ID + secret). Use the key's ID as `GRID_CLIENT_ID`, not the platform ID.

**Install** (exact versions this recipe runs)
```sh
pnpm add @openfort/react@2.1.3 @openfort/openfort-node@0.12.2 wagmi@^3.6.16 viem@^2.52.2 @tanstack/react-query@^5.101.0
```
Grid has no SDK dependency here: `src/features/grid/client.ts` is a ~150-line `fetch` wrapper with Basic auth.

**Files that carry the integration**
| File | Role |
| --- | --- |
| `src/features/grid/client.ts` | Server-only Grid calls: customer, wallet and bank accounts, on/off-ramp quotes, status, sandbox funding |
| `src/features/grid/customer.ts` | Resolves the Grid customer from the Openfort user; refuses quotes that belong to someone else |
| `src/lib/auth.ts` | Verifies the Openfort session (`iam.getSession`) and wallet ownership (`accounts.list`) |
| `src/app/api/quotes/route.ts` | Creates the money-in or money-out quote |
| `src/features/grid/use-grid.ts` | Client hook: calls the routes, sends USDC with wagmi `writeContract`, polls payment status |

**Steps**
1. Copy `client.ts`, `customer.ts` and `types.ts` into your server code, and set `GRID_CLIENT_ID` / `GRID_CLIENT_SECRET`.
2. For each signed-in user, call `findOrCreateCustomer` with the Openfort user id and a deliverable email, then `findOrCreateWalletAccount` with their embedded wallet address.
3. **Money in**: call `createOnRampQuote` and show the user the `USD_ACCOUNT` payment instruction (routing, account, reference). The quote expires in 3 minutes.
4. **Money out**: call `createBankAccount` once, then `createOffRampQuote`. Send exactly `totalSendingAmount` USDC to the `BASE_WALLET` address in `paymentInstructions` from the embedded wallet before `expiresAt`.
5. Track the payment with `GET /transactions/{quote.transactionId}` until `COMPLETED` or `FAILED`, or subscribe to `OUTGOING_PAYMENT.*` webhooks via `PATCH /config` in production.

**Check it works**: in sandbox, a money-in quote followed by `simulateFunding` reaches `COMPLETED` in about 5 seconds.

## Openfort primitives
| Primitive | Where in code | Dashboard setup | Docs |
| --- | --- | --- | --- |
| `OpenfortProvider` (`publishableKey`, `walletConfig`, `uiConfig`) | `src/features/openfort/providers/openfort-provider-boundary.tsx` | Publishable key | [React wallet configuration](https://www.openfort.io/docs/products/embedded-wallet/react/wallet) |
| `walletConfig.shieldPublishableKey` | same | Shield publishable key | [API keys](https://www.openfort.io/docs/configuration/api-keys) |
| `walletConfig.ethereum.ethereumFeeSponsorshipId` | same | Fee sponsorship policy on the default chain | [Gas sponsorship](https://www.openfort.io/docs/configuration/gas-sponsorship) |
| `uiConfig.authProviders: [EMAIL_OTP]`, `walletRecovery.defaultMethod: PASSKEY` | same | Email OTP enabled | [UI configuration](https://www.openfort.io/docs/products/embedded-wallet/react/ui/configuration) |
| `OpenfortButton` | `src/components/header.tsx`, `src/features/grid/components/FundingFlow.tsx` | none | [Openfort UI](https://www.openfort.io/docs/products/embedded-wallet/react/ui) |
| `embeddedWalletConnector`, `OpenfortWagmiBridge` | `src/features/openfort/config/wagmi-config.ts`, `src/app/providers.tsx` | none | [Ethereum wallet configuration](https://www.openfort.io/docs/products/embedded-wallet/react/wallet/ethereum) |
| `useUser().getAccessToken` | `src/features/grid/use-grid.ts` | none | [useUser](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useUser) |
| `openfort.iam.getSession` | `src/lib/auth.ts` | Secret key | [Server-side auth](https://www.openfort.io/docs/products/server) |
| `openfort.accounts.list` | `src/lib/auth.ts` | Secret key | [Accounts](https://www.openfort.io/docs/products/server) |

## Failure modes
| Error | Cause | Fix |
| --- | --- | --- |
| `Grid rejected the API credentials — check GRID_CLIENT_ID is the key ID, not the platform ID` | Grid answers a wrong id/secret pair with an HTML 401 | Use the API key's ID from Settings → API Keys, not the `Platform:` id |
| `INVALID_INPUT: Customer email is required when the platform supports Spark token embedded wallets.` | Customer created without `email` | Pass the Openfort user's email (the recipe does) |
| `INVALID_INPUT: Invalid email. Expected a valid, deliverable email address.` | Placeholder domain such as `example.com` | Use a real, deliverable address |
| `INVALID_INPUT: bankAccountType: Field required; beneficiary: Field required` | `USD_ACCOUNT` sent with only routing and account numbers | Send `bankAccountType` (`CHECKING`/`SAVINGS`) and a full `beneficiary` (name, birth date, nationality, address) |
| `ACCOUNT_NOT_FOUND: destination.accountId does not match an active account.` | Quote pointed at an external account that failed to create | Create the bank account first and use the id it returns |
| `Quote not found` from `/api/quotes/[id]` on your own quote | `GET /quotes/{id}` returns `source.customerId` without the `Customer:` prefix that `POST /quotes` returns | Compare ids with the prefix stripped (`bareId` in `customer.ts`) |

## Grid notes
- Sandbox and production share the base URL `https://api.lightspark.com/grid/2025-10-13`; the API key decides the environment.
- A sandbox platform configured as a regulated institution approves customers at creation. Otherwise customers start unverified and need `GET /customers/{id}/kyc-link` before quoting.
- Sandbox currencies are USD, USDC, USDT and USDB. EUR, BRL and other rails need enabling on the platform.
- Card issuing is not part of this recipe: cards fund only from a Grid-held USDB account, and issuing needs a card program Lightspark configures per platform.

## Code style
- Biome (single quotes, no semicolons, 2-space, 120 col). Run `pnpm check` to format.
- Grid calls live only in `src/features/grid/client.ts` and run server-side; the browser talks to `src/app/api/*`.

## PR instructions
- Title format: `[lightspark-grid] <summary>`.
- `pnpm verify` must pass. For changes to the Grid client, run one money-in and one money-out quote against the sandbox and note the result under Testing instructions.
