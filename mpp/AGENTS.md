# AGENTS.md

## Project overview

- MPP (Machine Payments Protocol) agent demo built on Openfort backend wallets.
- An agent gets an Openfort EVM backend wallet, is funded with PathUSD from a treasury, and pays for an HTTP `402` service on the Tempo testnet (Moderato). Testnet only.
- Single Next.js 16 App-Router app: the UI and the server routes that hold the wallet secret live together. All Openfort calls happen in `app/api/**` route handlers and `lib/**`.
- Openfort is used only as a remote signer. viem and mppx build and broadcast Tempo transactions; Openfort does not index Tempo.

## Setup commands

- `node -v` → ensure Node 22+.
- `pnpm install`
- `cp .env.example .env.local` and fill in the required variables (see Environment).
- `pnpm dev` → http://localhost:3000

## Environment

| Variable | Required | Where to get it |
| --- | --- | --- |
| `OPENFORT_SECRET_KEY` | yes | Dashboard → API keys (`sk_test_...`) |
| `OPENFORT_WALLET_SECRET` | yes | Dashboard → Backend wallets → Setup. Same project as the secret key |
| `TREASURY_WALLET_ID` | yes | An EVM backend wallet id (`acc_...`) holding PathUSD on Tempo testnet |
| `MPP_RECIPIENT` | yes | Tempo address that receives the agent's payments |
| `MPP_SECRET_KEY` | yes | Any high-entropy string; mppx uses it to HMAC-bind payment challenges |
| `MPP_CURRENCY` | no | PathUSD token address; defaults to `0x20c0000000000000000000000000000000000000` |

## Testing instructions

- `pnpm verify` runs `biome lint` and `next build` (type-checks and compiles every route). CI runs it on every PR.
- `pnpm check` — Biome lint + format with autofix.
- Manual (needs real keys): `POST /api/agent/create` returns a new wallet address; `GET /api/agent/balance?address=0x..` reads PathUSD from the Tempo RPC. The full fund → pay flow needs a treasury funded with PathUSD on Tempo.
- Last runtime check of the fund → pay flow was not repeated for the `@openfort/openfort-node` 0.12.2 upgrade (2026-09-23); only `pnpm verify` was run.

## Add this to your app

For a coding agent adding MPP payments signed by Openfort backend wallets to an existing Node/Next.js server.

**Dashboard setup**
1. Create an API secret key (Dashboard → API keys) and a wallet secret (Dashboard → Backend wallets → Setup) in the same project.
2. Create a treasury backend wallet (`openfort.accounts.evm.backend.create()`), fund its address with PathUSD from the Tempo faucet, and keep its `id`.
3. No fee sponsorship policy is needed: PathUSD is Tempo's gas token and viem pays gas from the signing wallet.

**Install (exact versions)**

```bash
pnpm add @openfort/openfort-node@0.12.2 mppx@0.6.30 viem@2.52.2 ox@0.14.29
```

**Files that carry the integration**

| File | Role |
| --- | --- |
| `lib/openfort.ts` | Memoized `Openfort` client (secret key + wallet secret) and `accounts.evm.backend.create()` for agent wallets |
| `lib/openfort-account.ts` | Wraps a backend wallet as a viem `LocalAccount`: Tempo transactions are serialized by viem, hashed, signed with `account.sign({ hash })`, and re-serialized with an `ox/tempo` `SignatureEnvelope` |
| `lib/mpp-client.ts` | `Mppx.create({ methods: [tempo({ account })] })` and `mppx.fetch(url)`: handles the `402` challenge and retry |
| `lib/treasury.ts` | Funds an agent with `Actions.token.transfer` from `viem/tempo`, signed by the treasury backend wallet |
| `app/api/mock-services/weather/route.ts` | Seller side: `Mppx.create({ methods: [tempo.charge(...)] }).charge({ amount })` from `mppx/nextjs` |

**Steps**
1. Copy `lib/openfort.ts` and `lib/openfort-account.ts`. Keep them server-only: they read `OPENFORT_WALLET_SECRET`.
2. Create one backend wallet per agent and store its `id` and `address` in your database.
3. Copy `lib/mpp-client.ts` and call `executeMppRequest(walletId, url)` wherever the agent calls a paid service.
4. To fund agents from a treasury, copy `lib/treasury.ts` and set `TREASURY_WALLET_ID`.
5. If you also sell a service, copy the weather route pattern and set `MPP_RECIPIENT` and `MPP_SECRET_KEY`.

**Check it works**
- `openfort.accounts.evm.backend.create()` returns an `acc_...` id and an address.
- After funding, `GET /api/agent/balance?address=<agent>` shows the PathUSD amount.
- `executeMppRequest` against a `402` endpoint returns `200`, and the payment transaction appears on the Tempo explorer (`https://explore.tempo.xyz`).

## Openfort primitives

| Primitive | Where in code | Dashboard setup | Docs |
| --- | --- | --- | --- |
| `new Openfort(secretKey, { walletSecret })` | `lib/openfort.ts` | API secret key + wallet secret | https://www.openfort.io/docs/products/server/setup |
| `openfort.accounts.evm.backend.create()` | `lib/openfort.ts` | Wallet secret | https://www.openfort.io/docs/products/server/accounts |
| `openfort.accounts.evm.backend.get({ id })` | `lib/openfort-account.ts` | — | https://www.openfort.io/docs/products/server/accounts |
| `account.sign({ hash })` (raw hash signing for Tempo transactions) | `lib/openfort-account.ts` | Any v2 signing policy must accept `signEvmHash` | https://www.openfort.io/docs/products/server/evm/viem-integration |
| `account.signMessage` / `account.signTypedData` | `lib/openfort-account.ts` | — | https://www.openfort.io/docs/products/server/evm/viem-integration |
| Treasury backend wallet (`TREASURY_WALLET_ID`) | `lib/treasury.ts` | Backend wallet funded with PathUSD on Tempo | https://www.openfort.io/docs/products/server/workflows/agentic-wallets |

## Failure modes

| Error | Cause | Fix |
| --- | --- | --- |
| `Missing OPENFORT_SECRET_KEY or OPENFORT_WALLET_SECRET environment variables` | One of the two Openfort variables is unset | Set both in `.env.local` and restart `pnpm dev` |
| `TREASURY_WALLET_ID not configured` | `/api/agent/fund` called without a treasury wallet id | Set `TREASURY_WALLET_ID` to a funded backend wallet id |
| `Standard EVM signTransaction is not supported — a Tempo chain serializer is required` | The Openfort viem account was used with a non-Tempo chain | Use it only with `tempoModerato` (or another Tempo chain); for other chains use Openfort's `sendTransaction` |
| `Forbidden. You don't have permission to access this resource.` | A v2 signing policy on the account has no accept rule for `signEvmHash`, which `account.sign({ hash })` uses | Add an accept rule for `signEvmHash`, or pre-flight with `openfort.policies.evaluate({ operation: "signEvmHash", accountId })` |

## Notes

- Keep wallet-secret usage server-side: never import `lib/openfort*.ts` from a client component.
- Don't route Tempo transactions through Openfort's broadcast API; Openfort does not index Tempo.
- `@openfort/openfort-node` 0.12.x added Transactions V2 (`openfort.transactions`). This recipe does not use Openfort transactions, so the upgrade from 0.11.0 needed no code changes.

## Code style

- Next.js + TypeScript, Biome for lint/format (single quotes, no semicolons, 120-col), pnpm.

## PR instructions

- Title format: `[mpp] <summary>`.
- Document any new environment variable in `README.md`, `.env.example` and this file.
- Run `pnpm verify` before requesting review.
