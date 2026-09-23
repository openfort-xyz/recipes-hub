# AGENTS.md — telegram-bot

## Project overview
- Telegram bot where each Telegram user gets an Openfort backend wallet (custodial, server-signed), keyed by Telegram user ID.
- Base Sepolia (84532, testnet), USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e`, gas sponsored via `OPENFORT_FEE_SPONSORSHIP_ID`.
- No frontend. `src/commands.ts` holds pure handlers; `src/bot.ts` (grammY long-polling) and `src/demo.ts` (offline harness) both consume them.

## Setup commands
- `node -v` → ensure Node 22+.
- `pnpm install`
- `cp .env.example .env` and fill the required variables (see Environment).
- `pnpm demo` — runs /start → /balance → /send end-to-end with a fake Telegram user (no token needed). Funds the demo wallet from the treasury backend wallet in `src/demo.ts` if it holds ≥0.05 USDC.
- `pnpm start` — live bot via long polling.

## Environment

| Variable | Required | Where to get it |
| --- | --- | --- |
| `OPENFORT_SECRET_KEY` | yes | Dashboard → API keys (`sk_test_...`) |
| `OPENFORT_WALLET_SECRET` | yes | Dashboard → Backend wallets → Setup. Same project as the secret key |
| `OPENFORT_FEE_SPONSORSHIP_ID` | yes | Dashboard → Gas sponsorship; a Base Sepolia fee sponsorship (`pol_...`) |
| `TELEGRAM_BOT_TOKEN` | only for `pnpm start` | @BotFather → `/newbot` |

## Testing instructions
- `pnpm verify` runs `biome check src` and `tsc --noEmit`. CI runs it on every PR.
- `pnpm demo` is the E2E check — it submits real sponsored transactions on Base Sepolia and prints explorer links. It needs real keys.
- 2026-09-23 (`@openfort/openfort-node` 0.12.2): `pnpm verify` passes. `pnpm demo` ran `/start` and `/balance` (backend wallet `get`, RPC balance reads), then `/send` failed with `Authentication failed` (401) at the signing step because the local wallet secret no longer matches the project; the same call fails the same way on 0.10.8, so it is a credentials issue, not an SDK regression. The sponsored `/send` path was not runtime-verified on 0.12.2.

## Add this to your app

For a coding agent adding per-user custodial wallets with sponsored USDC sends to an existing Node bot or backend (Telegram, Discord, WhatsApp, any chat).

**Dashboard setup**
1. API secret key (Dashboard → API keys) and wallet secret (Dashboard → Backend wallets → Setup) from the same project.
2. A gas sponsorship on Base Sepolia: a policy (`ply_`) whose rules accept sponsoring the transfer, and a fee sponsorship (`pol_`) that references it. The first send upgrades each wallet to an EIP-7702 delegated account, so the policy needs an `account_functions` "All functions" rule. Pass the `pol_` id, not the `ply_` id.

**Install (exact versions)**

```bash
pnpm add @openfort/openfort-node@0.12.2 viem@2.55.5
```

**Files that carry the integration**

| File | Role |
| --- | --- |
| `src/openfort.ts` | `new Openfort(secretKey, { walletSecret })` |
| `src/wallets.ts` | `getOrCreateWallet` (one backend wallet per user id), `getBalances` (viem reads), `sendUsdcFrom` (`accounts.evm.backend.sendTransaction` with the fee sponsorship, then waits for the hash) |
| `src/store.ts` | user id → `{ accountId, address }` mapping (JSON file here; replace with your database) |
| `src/commands.ts` | Chat-agnostic handlers for start / balance / send, including input and balance checks |

**Steps**
1. Copy `src/openfort.ts` and `src/wallets.ts`; keep them server-side.
2. Replace `src/store.ts` with a table keyed by your platform's user id, storing only the Openfort account `id` and address.
3. On first contact call `getOrCreateWallet(userId)`; on a send call `sendUsdc(userId, to, amount)`.
4. Wire the handlers in `src/commands.ts` to your bot framework (see `src/bot.ts` for grammY).

**Check it works**
- First contact returns an address; a second call for the same user returns the same address.
- Fund the address from https://faucet.circle.com (Base Sepolia USDC), send a small amount, and open the returned `https://sepolia.basescan.org/tx/<hash>` link. The wallet holds 0 ETH, so a mined transfer proves sponsorship.

## Openfort primitives

| Primitive | Where in code | Dashboard setup | Docs |
| --- | --- | --- | --- |
| `new Openfort(secretKey, { walletSecret })` | `src/openfort.ts` | API secret key + wallet secret | https://www.openfort.io/docs/products/server/setup |
| `openfort.accounts.evm.backend.create()` | `src/wallets.ts` | Wallet secret | https://www.openfort.io/docs/products/server/accounts |
| `openfort.accounts.evm.backend.get({ id })` / `get({ address })` | `src/wallets.ts`, `src/demo.ts` | — | https://www.openfort.io/docs/products/server/accounts |
| `openfort.accounts.evm.backend.sendTransaction({ account, chainId, interactions, policy })` | `src/wallets.ts` | Fee sponsorship (`pol_`) | https://www.openfort.io/docs/products/server/evm/gasless-transactions |
| `openfort.transactionIntents.get(id)` (poll for the hash) | `src/wallets.ts` | — | https://www.openfort.io/docs/products/server/evm/gasless-transactions |
| Gas sponsorship policy + fee sponsorship | `OPENFORT_FEE_SPONSORSHIP_ID` | Dashboard → Gas sponsorship | https://www.openfort.io/docs/configuration/gas-sponsorship |
| Pattern: one backend wallet per app user | `src/wallets.ts`, `src/store.ts` | — | https://www.openfort.io/docs/products/server/workflows/server-side-user-wallets |

## Failure modes

| Error | Cause | Fix |
| --- | --- | --- |
| `Missing environment variable OPENFORT_FEE_SPONSORSHIP_ID. Copy .env.example to .env and fill it in (see README).` (same form for every required variable) | A required variable is unset | Fill `.env` from `.env.example` |
| `Missing TELEGRAM_BOT_TOKEN. Create a bot with @BotFather (/newbot) and put the token in .env. …` | `pnpm start` without a bot token | Set `TELEGRAM_BOT_TOKEN`, or use `pnpm demo` |
| `APIError: Authentication failed (request_id: …)` (status 401, thrown from `signHash` during `sendTransaction`) | `OPENFORT_WALLET_SECRET` is from another project or was rotated | Use the current wallet secret of the project that owns `OPENFORT_SECRET_KEY` |
| `Forbidden. You don't have permission to access this resource.` | A v2 signing policy on the account has no accept rule for `signEvmHash`, which the 7702 authorization and the intent signature both use | Add an accept rule for `signEvmHash`; pre-flight with `openfort.policies.evaluate({ operation: "signEvmHash", accountId })` |

## Notes
- `openfort.accounts.evm.backend.get({ address })` requires the EIP-55 checksummed address, not lowercase.
- `sendTransaction` resolves once the transaction intent exists; `response.transactionHash` can still be empty. `sendUsdcFrom` polls `transactionIntents.get` for up to 20 s before failing.
- `sendTransaction` auto-upgrades the EOA to a 7702 delegated account on first use; without an `account_functions` "All functions" rule the fee sponsorship does not sponsor it.
- `@openfort/openfort-node` 0.12.x adds Transactions V2 (`openfort.transactions`) and marks `transactionIntents` deprecated. `accounts.evm.backend.sendTransaction` is not deprecated and still handles the 7702 delegation, so the recipe keeps it.
- `src/demo.ts` funds from a hardcoded treasury address that belongs to the recipe author's project. Set `TREASURY_ADDRESS` there to a backend wallet in your own project to fund the demo; otherwise it sends 0 USDC.
- The wallet mapping lives in `data/wallets.json` (gitignored). Delete it to start fresh — old accounts remain in the Openfort project.

## Code style
- TypeScript (strict, NodeNext ESM), Biome (single quotes, no semicolons, 120-col), pnpm.

## PR instructions
- Title format: `[telegram-bot] <summary>`.
- Document any new environment variable in `README.md`, `.env.example` and this file.
- Run `pnpm verify` before requesting review.
