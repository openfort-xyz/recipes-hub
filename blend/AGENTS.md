# AGENTS.md

## Project overview

- Treasury yield on [Blend](https://blend.money): an Openfort EVM **backend wallet** holds a company's USDC and deposits it into the Blend account type's vault allocation, then withdraws it back. **Base mainnet** only (Blend has no testnet); this moves real funds.
- Single Next.js 16 App-Router app. All Openfort and Blend calls run in `app/api/**` route handlers and `lib/**`; the page only calls those routes with an admin bearer token.
- **Why a backend wallet, not an embedded wallet:** Blend is built for B2B integrators. Its server SDK (`@blend-money/node`) authenticates with an API key that can act on any account in the organization, so it has to live on a server. A treasury is also operated by the company, not by an end user logging in. An Openfort backend wallet signs on the same server, so one process holds the keys and runs the whole lifecycle: account, quote, execute, track. For per-user savings accounts in a consumer app, use `@blend-money/fe` with an Openfort embedded wallet instead; it signs in with SIWE (`signMessage`) and executes with the same `TransactionHandler`.
- Blend gives each EOA a Safe. Deposits are plain transactions from the treasury EOA (approve + deposit, paid in ETH). Withdrawals are Safe UserOperations signed by the EOA and sponsored by Pimlico.

## Setup commands

- `node -v` → ensure Node 22+.
- `pnpm install`
- `cp .env.example .env.local` and fill in every variable (see Environment).
- `pnpm dev` → http://localhost:3000

## Environment

| Variable | Required | Where to get it |
| --- | --- | --- |
| `OPENFORT_SECRET_KEY` | yes | Dashboard → API keys (`sk_test_...` / `sk_live_...`) |
| `OPENFORT_WALLET_SECRET` | yes | Dashboard → API keys → Backend wallets tab. Same project as the secret key |
| `TREASURY_WALLET_ID` | yes | An EVM backend wallet id (`acc_...`) funded on Base with USDC and some ETH |
| `BLEND_API_KEY` | yes | Blend portal → Credentials → API key (server-side) |
| `BLEND_ACCOUNT_TYPE_ID` | yes | Blend portal → Account types; the product whose vault allocation the treasury joins |
| `PIMLICO_API_KEY` | yes | dashboard.pimlico.io; bundler + paymaster for withdrawal UserOperations |
| `TREASURY_ADMIN_TOKEN` | yes | `openssl rand -base64 32`; every API route requires `Authorization: Bearer <token>` |

## Testing instructions

- `pnpm verify` runs `biome lint`, `node --test` (`lib/validate.test.ts`: amount parsing and the admin-token check) and `next build`. CI runs it on every PR.
- `pnpm check` runs Biome lint + format with autofix.
- 2026-10-20 (@blend-money/node 3.1.0, openfort-node 0.12.2, next 16.3.5, viem 2.55.8): `pnpm verify` passes. With `pnpm start` and placeholder keys: no token → `401`, bad body → `400`, `/api/treasury` surfaces Openfort's `Invalid API key` as JSON. `BlendServerSdk` against `https://api.portal.blend.money` with a fake key returns `401 UNAUTHORIZED Invalid API key`. **Not run:** any real Blend call (no portal access), account creation, a deposit or withdrawal, and Openfort signing through `toAccount`. The account-lookup `404` handling in `findAccount` is inferred from the SDK, not observed.

## Add this to your app

For a coding agent adding Blend treasury yield to an existing Node/Next.js server.

**Dashboard setup**
1. Openfort: create a secret key and a wallet secret (API keys → Backend wallets) in the same project. Create the treasury wallet with `openfort.accounts.evm.backend.create()` and keep its `id`. Fund its address on Base with USDC and ~0.001 ETH for deposit gas.
2. Blend portal: create the organization, build an account type with vault allocations, add an API key. Note the account type id.
3. Pimlico: create an API key. Withdrawals run as sponsored Safe UserOperations billed to it.

**Install (exact versions)**

```bash
pnpm add @openfort/openfort-node@0.12.2 @blend-money/node@3.1.0 viem@2.55.8
```

Keep `viem` on the version `@blend-money/core` pins (`2.55.8` for 3.1.0). A different viem gives a second copy whose `WalletClient` type does not match the one `TransactionHandler.submitActionPlan` expects.

**Files that carry the integration**

| File | Role |
| --- | --- |
| `lib/openfort.ts` | Memoized `Openfort` client; `getTreasuryAccount()` wraps the backend wallet with viem `toAccount`; `getClients(chainId)` builds viem public + wallet clients for any chain Blend asks to sign on |
| `lib/blend.ts` | `BlendServerSdk`, account lookup/creation, `quote()` and `execute()` (the server-side version of `BlendSdk.execute` from `@blend-money/fe`), `getTreasuryStatus()` |
| `lib/api.ts` + `lib/validate.ts` | Admin bearer-token guard, amount parsing, bigint-safe JSON and `SdkError` → HTTP status |
| `app/api/{treasury,quote,execute}/route.ts` | The three routes the UI calls |

**Steps**
1. Copy `lib/openfort.ts` and `lib/blend.ts`. Keep them server-only: they read the wallet secret and the Blend API key.
2. Put every route behind your own auth (this recipe uses one admin token; use your app's operator roles instead).
3. Quote with `quote({ type: 'deposit' }, units)`, show the `quoteSummary` to an operator, and call `execute(intentId)` only after approval. Amounts are USDC smallest units (6 decimals).
4. `execute` blocks until the session is `SETTLED`, `FAILED` or `CANCELLED` (SDK timeout 5 minutes). Run it in a job queue if your platform caps request time.

**Check it works**
- `GET /api/treasury` returns the wallet address and its Base USDC/ETH balances; `account` is `null` until the first quote creates it.
- A deposit quote returns `{ type: 'DEPOSIT', status: 'OPEN', quoteSummary }`; executing it returns `status: 'SETTLED'` with the approve + deposit hashes on basescan.org.
- After settlement, `balance.total` and `returns` reflect the position.

## Openfort primitives

| Primitive | Where in code | Dashboard setup | Docs |
| --- | --- | --- | --- |
| `new Openfort(secretKey, { walletSecret })` | `lib/openfort.ts` | API secret key + wallet secret | https://www.openfort.io/docs/products/server/setup |
| `openfort.accounts.evm.backend.get({ id })` | `lib/openfort.ts` | Treasury backend wallet (`TREASURY_WALLET_ID`) | https://www.openfort.io/docs/products/server/accounts |
| viem `toAccount(account)` (uses `signMessage`, `signTransaction`, `signTypedData`) | `lib/openfort.ts` | Any v2 signing policy must accept transaction and typed-data signing on Base | https://www.openfort.io/docs/products/server/evm/viem-integration |

## Failure modes

| Error | Cause | Fix |
| --- | --- | --- |
| `Unauthorized` (401) | Missing or wrong `Authorization: Bearer` header, or `TREASURY_ADMIN_TOKEN` unset | Set the token in `.env.local` and paste the same value in the UI |
| `Invalid API key (request_id: …)` | `OPENFORT_SECRET_KEY` is wrong or from another project | Copy the secret key from the project that owns the treasury wallet |
| `Invalid API key` (Blend, code `UNAUTHORIZED`) | `BLEND_API_KEY` is wrong | Create a server API key in the Blend portal |
| `Missing OPENFORT_SECRET_KEY or OPENFORT_WALLET_SECRET environment variables` | One of the two Openfort variables is unset | Set both and restart |
| `Missing BLEND_API_KEY or BLEND_ACCOUNT_TYPE_ID environment variables` | A Blend variable is unset | Set both and restart |

## Notes

- Blend allows one active session per account. `quote()` reuses it, so a new quote replaces the previous one; a session stuck in `LOCKED`/`SUBMITTED` must settle or be cancelled (`sessions.cancel(intentId)`) first.
- `getClients` uses viem's default public RPC for each chain. Pass your own RPC URL in production.
- Multi-chain allocations: a withdrawal can return one action plan per source chain. `getClients` resolves any viem chain and Pimlico serves Blend's default chain list, so these work without changes. The treasury still receives funds on Base.
- `@blend-money/fe` and `@blend-money/node` share `@blend-money/core`, so `TransactionHandler`, `createPaymasterResolver` and `getPimlicoPaymasterEndpoints` come from the node package.

## Code style

- Next.js + TypeScript, Biome for lint/format (single quotes, no semicolons, 120-col), pnpm.

## PR instructions

- Title format: `[blend] <summary>`.
- Document any new environment variable in `README.md`, `.env.example` and this file.
- Run `pnpm verify` before requesting review.
