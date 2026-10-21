# AGENTS.md

## Project overview

- Treasury yield on [Blend](https://blend.money): an Openfort EVM **backend wallet** holds a company's USDC and deposits it into the Blend account type's vault allocation, then withdraws it back. **Base mainnet** only (Blend has no testnet); this moves real funds.
- Single Next.js 16 App-Router app. All Openfort and Blend calls run in `app/api/**` route handlers and `lib/**`; the page only calls those routes with an admin bearer token.
- **Why a backend wallet, not an embedded wallet:** Blend is built for B2B integrators. Its server SDK (`@blend-money/node`) authenticates with an API key that can act on any account in the organization, so it has to live on a server. A treasury is also operated by the company, not by an end user logging in. An Openfort backend wallet signs on the same server, so one process holds the keys and runs the whole lifecycle: account, quote, execute, track. For per-user savings accounts in a consumer app, use `@blend-money/fe` with an Openfort embedded wallet instead.
- **Gas is paid by Openfort, not by the treasury or a third-party bundler.** Blend gives each EOA a 1/1 Safe and returns two kinds of action plans. This recipe sends both with `openfort.accounts.evm.backend.sendTransaction` and an Openfort fee sponsorship (the wallet is EIP-7702-delegated on its first send):
  - `direct` (deposit): Blend's approve + deposit calls, batched in one sponsored transaction from the EOA.
  - `multisend` (withdraw): Blend's calls packed into Safe's MultiSend and executed by the owner EOA through `Safe.execTransaction`, with a pre-validated owner signature (`lib/safe.ts`).

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
| `TREASURY_WALLET_ID` | yes | An EVM backend wallet id (`acc_...`) funded with USDC on Base. It needs no ETH |
| `OPENFORT_FEE_SPONSORSHIP_ID` | yes | Dashboard → Gas sponsorship on Base (8453). The fee sponsorship `pol_...`, not the policy `ply_...` |
| `BLEND_API_KEY` | yes | Blend portal → Credentials → API key (server-side, `sk_live_...`) |
| `BLEND_ACCOUNT_TYPE_ID` | yes | Blend portal → Account types; the product whose vault allocation the treasury joins. Every server route is scoped to it (`/extern/svr/<accountTypeId>/…`) |
| `TREASURY_ADMIN_TOKEN` | yes | `openssl rand -base64 32`; every API route requires `Authorization: Bearer <token>` |

## Testing instructions

- `pnpm verify` runs `biome lint`, `node --test` (`lib/validate.test.ts`: amount parsing and the admin-token check; `lib/safe.test.ts`: action plan → Openfort interactions, including the MultiSend packing and owner signature) and `next build`. CI runs it on every PR.
- `pnpm check` runs Biome lint + format with autofix.
- 2026-10-20 (@blend-money/node 3.1.0, openfort-node 0.12.2, next 16.3.5, viem 2.55.8): `pnpm verify` passes. With `pnpm start` and placeholder keys: no token → `401`, bad body → `400`, `/api/treasury` surfaces Openfort's `Invalid API key` as JSON.
- 2026-10-20, live Blend server key (read-only `GET`s against `https://api.portal.blend.money`): the key authenticates. A fake key returns `401 {"status":"error","message":"Invalid API key"}`; the live key gets past auth and returns `404 {"status":"error","message":"Account type not found"}` for any account type id we tried. Unknown routes return `404 {"status":"error","message":"Route not found"}`. There is no route to list account types (`/extern/svr`, `/extern/account-types`, `/extern/organization` all `Route not found`), so the id has to come from the Blend portal. Without it, discovery, yield, account lookup and quotes were **not** exercised.
- **Not run:** any account-scoped Blend call, account creation, a deposit or withdrawal, and the sponsored `sendTransaction` path on Base. In particular, two things are unconfirmed until a real withdrawal runs: that Blend's settlement check accepts the hash of an Openfort-sponsored transaction (outer `from` is the relayer, not the EOA), and that Blend's Safes have no guard that blocks owner `execTransaction`. The account-lookup `404` handling in `findAccount` is inferred from the SDK, not observed.

## Add this to your app

For a coding agent adding Blend treasury yield to an existing Node/Next.js server.

**Dashboard setup**
1. Openfort: create a secret key and a wallet secret (API keys → Backend wallets) in the same project. Create the treasury wallet with `openfort.accounts.evm.backend.create()` and keep its `id`. Fund its address with USDC on Base.
2. Openfort: create a gas sponsorship on Base (8453) whose policy accepts `sponsorEvmTransaction`, and keep the fee sponsorship id (`pol_...`).
3. Blend portal: create the organization, build an account type with vault allocations, add a server API key. Note the account type id.

**Install (exact versions)**

```bash
pnpm add @openfort/openfort-node@0.12.2 @blend-money/node@3.1.0 viem@2.55.8
```

Keep `viem` on the version `@blend-money/core` pins (`2.55.8` for 3.1.0) so `ActionPlan`'s `Hex` types resolve to one viem copy.

**Files that carry the integration**

| File | Role |
| --- | --- |
| `lib/openfort.ts` | Memoized `Openfort` client, `getTreasuryWallet()`, and `sendSponsored()`: `backend.sendTransaction` with the fee sponsorship, then polls `openfort.transactions.get` until the transaction succeeds |
| `lib/safe.ts` | `toInteractions(plan, safe, owner)`: Blend action plan → Openfort interactions (direct calls as-is; multisend as an owner `Safe.execTransaction` into MultiSend) |
| `lib/blend.ts` | `BlendServerSdk`, account lookup/creation, `quote()`, `execute()` (the server-side version of `BlendSdk.execute`, with Openfort sending each plan), `getTreasuryStatus()` |
| `lib/api.ts` + `lib/validate.ts` | Admin bearer-token guard, amount parsing, bigint-safe JSON and `SdkError` → HTTP status |
| `app/api/{treasury,quote,execute}/route.ts` | The three routes the UI calls |

**Steps**
1. Copy `lib/openfort.ts`, `lib/safe.ts` and `lib/blend.ts`. Keep them server-only: they read the wallet secret and the Blend API key.
2. Put every route behind your own auth (this recipe uses one admin token; use your app's operator roles instead).
3. Quote with `quote({ type: 'deposit' }, units)`, show the `quoteSummary` to an operator, and call `execute(intentId)` only after approval. Amounts are USDC smallest units (6 decimals).
4. `execute` blocks until the session is `SETTLED`, `FAILED` or `CANCELLED` (SDK timeout 5 minutes). Run it in a job queue if your platform caps request time.

**Check it works**
- `GET /api/treasury` returns the wallet address and its Base USDC balance; `account` is `null` until the first quote creates it.
- A deposit quote returns `{ type: 'DEPOSIT', status: 'OPEN', quoteSummary }`; executing it returns `status: 'SETTLED'` with one transaction hash on basescan.org. The treasury's ETH balance stays at 0.
- After settlement, `balance.total` and `returns` reflect the position.

## Openfort primitives

| Primitive | Where in code | Dashboard setup | Docs |
| --- | --- | --- | --- |
| `new Openfort(secretKey, { walletSecret })` | `lib/openfort.ts` | API secret key + wallet secret | https://www.openfort.io/docs/products/server/setup |
| `openfort.accounts.evm.backend.get({ id })` | `lib/openfort.ts` | Treasury backend wallet (`TREASURY_WALLET_ID`) | https://www.openfort.io/docs/products/server/accounts |
| `openfort.accounts.evm.backend.sendTransaction({ account, chainId, interactions, policy })` (EIP-7702 delegation on first send) | `lib/openfort.ts` | Fee sponsorship on Base (`OPENFORT_FEE_SPONSORSHIP_ID`) | https://www.openfort.io/docs/products/server/evm/gasless-transactions |
| `openfort.transactions.get(id)` (poll `status` until terminal, hash in `receipt.transactionHash`) | `lib/openfort.ts` | — | https://www.openfort.io/docs/api-reference/transactions |
| Gas sponsorship policy + fee sponsorship | `OPENFORT_FEE_SPONSORSHIP_ID` | Dashboard → Gas sponsorship (policy must accept `sponsorEvmTransaction`) | https://www.openfort.io/docs/configuration/gas-sponsorship |

## Failure modes

| Error | Cause | Fix |
| --- | --- | --- |
| `Unauthorized` (401) | Missing or wrong `Authorization: Bearer` header, or `TREASURY_ADMIN_TOKEN` unset | Set the token in `.env.local` and paste the same value in the UI |
| `Invalid API key (request_id: …)` | `OPENFORT_SECRET_KEY` is wrong or from another project | Copy the secret key from the project that owns the treasury wallet |
| `Invalid API key` (Blend, HTTP 401, code `UNAUTHORIZED`) | `BLEND_API_KEY` is wrong | Create a server API key in the Blend portal |
| `Account type not found` (Blend, HTTP 404) | `BLEND_ACCOUNT_TYPE_ID` does not exist in the API key's organization | Copy the account type id from the Blend portal |
| `Missing OPENFORT_SECRET_KEY or OPENFORT_WALLET_SECRET environment variables` | One of the two Openfort variables is unset | Set both and restart |
| `Missing BLEND_API_KEY or BLEND_ACCOUNT_TYPE_ID environment variables` | A Blend variable is unset | Set both and restart |

## Notes

- **Why not Blend's `TransactionHandler`:** Blend's SDK only accepts Pimlico or Alchemy endpoints (`PaymasterProvider` is a closed enum, transports are `http(url)` with no headers, and gas prices come from `pimlico_getUserOperationGasPrice` / `rundler_maxPriorityFeePerGas`). Its Safes use the Safe4337Module for **EntryPoint v0.7** (`0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226`), while Openfort's bundler lists v0.6, v0.8 and v0.9. Calling the Safe directly as its owner avoids the bundler entirely and works with Openfort's fee sponsorship.
- Openfort accepts at most 9 interactions per transaction. Deposits are 2-3 calls; a withdrawal is always one `execTransaction`.
- Blend allows one active session per account. `quote()` reuses it, so a new quote replaces the previous one; a session stuck in `LOCKED`/`SUBMITTED` must settle or be cancelled (`sessions.cancel(intentId)`) first.
- `getTreasuryStatus` reads USDC from viem's default public Base RPC. Pass your own RPC URL in production.
- Multi-chain allocations: a withdrawal can return one action plan per source chain. Each is sent with its own `chainId`, so the fee sponsorship must cover every chain in the allocation.

## Code style

- Next.js + TypeScript, Biome for lint/format (single quotes, no semicolons, 120-col), pnpm.

## PR instructions

- Title format: `[blend] <summary>`.
- Document any new environment variable in `README.md`, `.env.example` and this file.
- Run `pnpm verify` before requesting review.
