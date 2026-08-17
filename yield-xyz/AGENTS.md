# AGENTS.md

## Project overview
- Openfort + Yield.xyz integration with a Vite React frontend.
- Lets a Shield-managed embedded wallet discover, enter, track, and exit both native MON staking (`monad-mon-native-staking`) and ERC-4626 vaults on **Monad mainnet** via the Yield.xyz v1 REST API. Monad Testnet lists one opportunity and zero vaults, which is why this targets mainnet - and why every action here moves real funds.
- No other Yield.xyz partner recipe (Turnkey, Privy, Portal, Crossmint) has a working Monad demo as of Aug 2026 - verified by checking each one directly; Portal's docs list Monad only as a network-dropdown entry, no code/tx example.

## Setup commands
- `pnpm i`
- `cp .env.example .env`
- `pnpm dev` (serves UI on `http://localhost:5173`)
- Backend: clone and run [openfort-backend-quickstart](https://github.com/openfort-xyz/openfort-backend-quickstart) for Shield sessions. Defaults to `http://localhost:3000`; if that's taken by another recipe, set `PORT` in the backend's `.env` and match `VITE_BACKEND_URL`.

## Environment
- `.env` needs `VITE_OPENFORT_PUBLISHABLE_KEY`, `VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY`, optional `VITE_OPENFORT_FEE_SPONSORSHIP_ID`, `VITE_BACKEND_URL`, and `YIELD_XYZ_API_KEY` (server-side only, no `VITE_` prefix - see `vite.config.ts`).
- Populate with real Openfort credentials from the dashboard and a real Yield.xyz key - placeholders fail past the discovery screen.
- `openfort-backend-quickstart`'s own `.env.example` ships `OPENFORT_BASE_PATH=` and `SHIELD_BASE_PATH=` as empty strings. `OPENFORT_BASE_PATH` is fine (the SDK falls back via `||`), but `SHIELD_BASE_PATH` breaks: `createEncryptionSession`'s default parameter only applies to `undefined`, not `''`, so an empty string produces a relative URL and `node-fetch` throws "Only absolute URLs are supported." Fix: don't declare `SHIELD_BASE_PATH` in the backend `.env` at all.

## Testing instructions
- `pnpm lint` / `pnpm check` (Biome)
- `pnpm build` (TypeScript + Vite build)
- Full enter/exit verification needs a funded mainnet wallet and spends real MON. Mainnet has no faucet; the `fund wallet` action only copies the address. To rehearse for free, follow README "Running against testnet" (staking only - the vault panel is empty on testnet).
- Verified live end-to-end on 2026-08-14: real embedded wallet created, 2 MON delegated via `monad-testnet-mon-native-staking`, confirmed on-chain via `eth_getTransactionReceipt` against `testnet-rpc.monad.xyz`, position picked up by `GET /v1/yields/{yieldId}/balances`.

## Code style
- Vite + TypeScript, **Biome** for lint/format (`pnpm lint` / `pnpm check`) - single quotes, no semicolons, 2-space, 120 col.
- Prefer functional React components and hooks; wallet state via wagmi + `@openfort/react`.
- Yield.xyz data comes from a hand-rolled REST client (`src/lib/yieldXyz.ts`) - there is no official browser SDK, so requests go through the Vite dev proxy to keep the API key server-side.

## Integration notes (verified against the live API, Aug 2026)
- `POST /v1/actions/enter` / `/exit` returns `{ transactions: [{ id, stepIndex, unsignedTransaction, ... }] }`. `unsignedTransaction` is a **JSON-stringified** plain tx object (`to`/`data`/`value`/`chainId`/`nonce`/`gasLimit`/`maxFeePerGas`/`maxPriorityFeePerGas`), not raw hex. `useExecuteAction` parses it and only forwards `to`/`data`/`value`/`chainId` to wagmi, letting it re-estimate gas/nonce fresh (the API's nonce is observed to be stale/`0` across multi-step actions).
- `GET /v1/yields/{yieldId}/validators` returns `{ items: [...], total, offset, limit }`, **not** a raw array - same pagination envelope as `/yields`. (An earlier version of this recipe assumed a raw array based on a test that was silently unwrapped by a fallback in a throwaway script; the live proxy response corrected it. `useValidators` now unwraps via `select: (data) => data.items`.)
- Openfort's embedded wallet connector does **not** auto-switch chains per-transaction when `sendTransaction({ chainId })` targets a chain other than the wallet's current active one - it throws "current chain does not match target chain." `useExecuteAction` explicitly calls `switchChainAsync({ chainId })` before signing if `activeChainId !== chainId`.
- Solana staking on Yield.xyz is **mainnet-only** (no `solana-devnet` yield opportunities) - that's why this recipe targets Monad instead of Solana.
- Ethereum Sepolia only has Aave v3 lending yields on Yield.xyz - deliberately dropped from this recipe since it overlaps with the existing `aave/` recipe's protocol and adds no differentiation; Monad staking does not overlap with anything else in recipes-hub.
- `GET /v1/yields/{yieldId}/balances?address=` is the single-address balance read; the batch `POST /v1/yields/balances` variant takes a `queries` array (not `addresses`) with a `network` field per query - not used here.
- `PUT /v1/transactions/{id}/submit-hash` accepts any hash and moves status to `BROADCASTED` - it doesn't verify the hash on-chain itself, so treat it as best-effort bookkeeping, not a confirmation source (the recipe already confirms via `waitForTransactionReceipt` before calling it).
- Native wallet balance (`useBalance` in `App.tsx`) doesn't auto-invalidate on its own after a stake/exit - it's a separate wagmi query from the Yield.xyz `['balances', yieldId]` query. `StakePanel`/`PositionsPanel` take an `onSettled` prop (called in the `finally` block of enter/exit) so `App.tsx` can refetch the lifted `useBalance` instance immediately after any attempt, success or fail.
- The Monad faucet (faucet.monad.xyz) sits behind a Vercel bot check plus X/Discord gates, exposes no public claim API, and ignores an `?address=` query param - verified directly. A one-click in-app drip is therefore not possible; `WalletBalance.tsx` copies the address to the clipboard instead.
- `GET /yields?network=monad` returns 73 opportunities: 66 `vault`, 6 `concentrated_liquidity_pool`, 1 `staking`. `GET /yields?network=monad-testnet` returns exactly 1. Yield.xyz's only testnets are `ethereum-sepolia`, `monad-testnet`, `stellar-testnet` and `ton-testnet`, and of those only ethereum-sepolia (Aave v3 lending) has a deposit-shaped flow.
- Vault enters are 2-step (`APPROVAL` then `SUPPLY`); staking is 1 step. `useExecuteAction` already loops over `transactions[]` in `stepIndex` order, so both work unchanged.
- Openfort's built-in wallet funding ("Add funds") returns "Funding isn't available on this network" for Monad Testnet - confirmed by testing the actual button. Mainnet support unverified (no explicit chain list in Openfort's docs). Because of this, the app **does not use `OpenfortButton`'s built-in "Connected" panel at all** once signed in - that panel (`EthereumConnected.tsx` in `@openfort/react`) hardcodes a Send/Deposit action row with no prop to hide just Deposit; `ConnectUIOptions` only exposes `hideBalance`/`hideTooltips`/`hideRecentBadge`, nothing for individual actions. `WalletChip.tsx` replaces it: `OpenfortButton` is rendered only when signed out (for login); once authenticated, `WalletChip` shows the address plus an icon-only `useSignOut()` button, and clicking the address opens `WalletModal.tsx` (a self-built modal - avatar, address, big Send/Receive action buttons, styled after Openfort's own Connected panel) instead of Openfort's version. `SendForm.tsx` (rendered inside the modal's "send" view) is a plain address-to-address native transfer, same switch-chain-then-send pattern as `useExecuteAction` but single-step. `WalletModal`'s `onSettled` prop threads through to `SendForm` so a completed send also refreshes the native balance, same as stake/exit.
- Yield.xyz has no separate testnet/mainnet API environment or key - same `api.yield.xyz` base URL and key work for both `monad-testnet` and `monad` networks, confirmed by hitting `GET /v1/yields?network=monad` with the shared demo key (200 OK, real ~14.8% APR data, 209 validators vs testnet's 1). Plan tiers (Trial/Standard/Pro, see `docs/rate-limits-and-plans`) gate request throughput, not network access.

## PR instructions
- Title format: `[yield-xyz] <summary>`.
- Run `pnpm lint` and `pnpm build` before requesting review.
- Reflect new env vars, yieldIds, or chain support in `README.md`.

## Submitting this recipe to recipes-hub

This project was built standalone (not inside a checkout of `openfort-xyz/recipes-hub`), so it needs to be moved into that repo as a new `yield-xyz/` folder before it's a real PR. Steps, in order:

1. **Fork and clone** `openfort-xyz/recipes-hub`, create a branch (e.g. `yield-xyz-recipe`).
2. **Copy this folder in** as `yield-xyz/` at the repo root (sibling to `aave/`, `vaults-fyi/`, etc.). Copy everything except `node_modules/`, `dist/`, `.env`, and `pnpm-lock.yaml` (the repo's own install will regenerate the lockfile).
3. **Check these against the monorepo's actual conventions** (read from the root `AGENTS.md` there - re-verify it hasn't changed since Aug 2026):
   - **`@openfort/react` version pin.** The root `AGENTS.md` says to keep it at exactly `2.0.1` across every recipe for workspace consistency; this project used `2.0.2` (the latest at build time, same major/minor). Either downgrade to match, or call out the bump explicitly in the PR description so reviewers can decide - don't let it slide by silently.
   - **Shared visual theme.** The root `AGENTS.md` states newer web recipes should track the [demo-dashboard](https://github.com/openfort-xyz/demo-directory/tree/main/demo-dashboard) look: **Geist** font, neutral shadcn palette, `0.625rem` radius. This recipe currently uses **Figtree** and a hand-picked neutral-900/950 palette (matching `vaults-fyi`'s font choice, but not the newer shadcn token convention some other recipes now share). Decide whether to restyle before submitting or leave it - it's a visual-consistency nit, not a functional blocker.
4. **Add a row to the root `README.md`**, in both tables:
   - Recipes table: `| **[Staking and vaults with Yield.xyz](./yield-xyz/)** | Native MON staking and ERC-4626 vaults on Monad via Yield.xyz's StakeKit API - discover, enter, track, and exit both, entirely non-custodial. No other Yield.xyz partner recipe has a working Monad demo. | \`pnpx gitpick openfort-xyz/recipes-hub/tree/main/yield-xyz openfort-yield-xyz && cd openfort-yield-xyz\` |`
   - Stack Overview table: `| **Yield.xyz** | Vite + React | Express.js (openfort-backend-quickstart) | Monad | \`wagmi\`, \`viem\`, hand-rolled REST client |`
5. **Re-run the install/build/lint cycle from a clean clone** (`rm -rf node_modules && pnpm install && pnpm build && pnpm lint`) inside the actual repo checkout - dependency resolution can differ once this sits in a real git repo/CI environment. Two gotchas already hit once during local development, expect they can recur on a fresh machine:
   - `pnpm install` can fail to link `@rolldown/binding-*` (vite 8's bundler) on the very first install - a `pnpm install --force` (or a second plain install) resolves it. Known upstream pnpm optional-dependency quirk, not specific to this recipe.
   - Don't add `minimumReleaseAge` to `pnpm-workspace.yaml` (some other recipes have it) - it blocks installing recently-published transitive packages like rolldown's platform bindings and will break a fresh install. Confirmed by testing; removed it from this recipe's `pnpm-workspace.yaml` for that reason.
6. **Get real credentials one more time in the moved location** and manually re-verify the full enter → track → exit loop, plus Send, from inside the new `yield-xyz/` folder - don't assume the standalone verification carries over untouched after the file move and any version/theme changes from step 3.
7. Open the PR: title `[yield-xyz] Add native MON staking recipe via Yield.xyz`, description linking this `AGENTS.md`'s "Integration notes" section for reviewers, and mention the `@openfort/react` version and theme decisions from step 3 explicitly so they're not missed in review.
