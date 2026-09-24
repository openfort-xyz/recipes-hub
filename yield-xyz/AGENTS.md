# AGENTS.md

## Project overview
- Openfort + Yield.xyz integration with a Vite React frontend.
- A Shield-managed (automatic recovery) Openfort embedded wallet discovers, enters, tracks and exits native MON staking (`monad-mon-native-staking`) and ERC-4626 vaults via the Yield.xyz v1 REST API.
- Chain: **Monad mainnet** (143). Every action moves real funds. Monad Testnet lists one opportunity and zero vaults, which is why this targets mainnet (README "Running against testnet" covers rehearsing staking there).
- Backend: the shared [openfort-backend-quickstart](https://github.com/openfort-xyz/openfort-backend-quickstart) serves the Shield encryption session.

## Setup commands
- `pnpm i`
- `cp .env.example .env`
- Backend: clone and run openfort-backend-quickstart (see `## Environment`). Defaults to `http://localhost:3000`; if another recipe uses that port, set `PORT` in the backend's `.env` and match `VITE_BACKEND_URL`.
- `pnpm dev` (serves UI on `http://localhost:5173`).

## Environment
- Frontend `.env` (see `.env.example`):
  - `VITE_OPENFORT_PUBLISHABLE_KEY` (required), `VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY` (required).
  - `VITE_OPENFORT_FEE_SPONSORSHIP_ID` (optional; unset = the wallet pays gas in MON).
  - `VITE_BACKEND_URL` (required).
  - `YIELD_XYZ_API_KEY` (required; server-side only, injected by the Vite dev proxy in `vite.config.ts`; never prefix with `VITE_`). `.env.example` defaults to Yield.xyz's public, shared, rate-limited demo key.
- Backend `.env` (openfort-backend-quickstart): `OPENFORT_SECRET_KEY`, `SHIELD_PUBLISHABLE_KEY`, `SHIELD_SECRET_KEY`, `SHIELD_ENCRYPTION_KEY`. Leave `SHIELD_BASE_PATH` undeclared (delete the line): `createEncryptionSession`'s default parameter only applies to `undefined`, not `''`, so an empty value produces a relative URL and fails (see `## Failure modes`).
- Placeholder Openfort keys fail past the discovery screen; use real dashboard credentials.

## Testing instructions
- `pnpm verify` = `biome lint .` + `tsc -b && vite build`. It checks types against `@openfort/react` 2.1.3 / wagmi 3 and that the bundle builds; it does not run the app.
- Full enter/exit verification needs a funded mainnet wallet and spends real MON. Mainnet has no faucet; the `fund wallet` action only copies the address. To rehearse for free, follow README "Running against testnet" (staking only; the vault panel is empty on testnet).
- Last live end-to-end run: 2026-08-14 on `@openfort/react` 2.0.2: embedded wallet created, 2 MON delegated via `monad-testnet-mon-native-staking`, confirmed on-chain via `eth_getTransactionReceipt` against `testnet-rpc.monad.xyz`, position picked up by `GET /v1/yields/{yieldId}/balances`.
- Not runtime-verified for the 2.1.3 upgrade (2026-09-23): only `pnpm verify` was run.

## Add this to your app
For a coding agent adding Openfort wallets + Yield.xyz staking/vaults to an existing React app (Vite shown; any bundler works if the Yield.xyz key stays server-side).

1. **Dashboard setup** ([dashboard.openfort.io](https://dashboard.openfort.io)):
   - Developers → API Keys: copy the publishable key, and create Shield keys (publishable key, secret key, encryption share).
   - Optional: [Gas sponsorships](https://dashboard.openfort.io/policies) → Add gas sponsorship for Monad; copy its id.
   - Yield.xyz: get an API key at [dashboard.yield.xyz](https://dashboard.yield.xyz) and make sure the yields you use are enabled for your project.
2. **Install** (exact versions this recipe verifies with):
   `pnpm add @openfort/react@2.1.3 wagmi@^3.7.7 viem@^2.56.8 @tanstack/react-query@^5.103.2`
3. **Backend**: expose `POST /api/protected-create-encryption-session` that returns `{ session }` from `openfort.createEncryptionSession(SHIELD_PUBLISHABLE_KEY, SHIELD_SECRET_KEY, SHIELD_ENCRYPTION_KEY)` (`@openfort/openfort-node`, authenticated with `OPENFORT_SECRET_KEY`). openfort-backend-quickstart `src/app.ts` is a working copy.
4. **Files that carry the integration** (copy and adapt):
   - `src/Providers.tsx`: `QueryClientProvider` → `WagmiProvider` (chain `monad`, connector `embeddedWalletConnector()`) → `OpenfortWagmiBridge` → `OpenfortProvider` with `walletConfig.shieldPublishableKey`, `walletConfig.createEncryptedSessionEndpoint`, `walletConfig.ethereum.rpcUrls` (Monad is not in the SDK's chain table) and `walletConfig.ethereum.ethereumFeeSponsorshipId`.
   - `vite.config.ts`: dev proxy `/api/yield-xyz/*` → `https://api.yield.xyz/v1` that adds the `X-API-KEY` header. In production, replace with your own backend route that adds the same header and point `BASE_PATH` in `src/lib/yieldXyz.ts` at it.
   - `src/lib/yieldXyz.ts`: typed REST client (`listYields`, `getYield`, `getValidators`, `getBalances`, `enter`, `exit`, `submitHash`).
   - `src/hooks/useExecuteAction.ts`: switches the wallet to the target chain, then signs each `transactions[]` step in `stepIndex` order with wagmi `useSendTransaction` (passing Yield.xyz's `gasLimit`), waits for the receipt, and reports the hash with `submitHash`.
   - `src/config/demos.ts`: network, chain id, yieldId and explorer that every panel keys off.
5. **Steps in order**: wrap the app in the providers; render `OpenfortButton` and gate the yield UI on `useUser().isAuthenticated` plus a wagmi `address`; load the yield and validators; call `enter` with `{ yieldId, address, arguments: { amount, validatorAddress? } }`; pass `transactions` to `useExecuteAction`; read the position with `getBalances`; `exit` works the same way.
6. **Check it works**: after login the wallet address shows in `OpenfortButton`; a stake returns one tx hash (vault deposits return two: approval + supply) and the position appears under balances.

## Openfort primitives
| Primitive | Where in code | Dashboard setup | Docs |
|---|---|---|---|
| `OpenfortProvider` (`publishableKey`, `walletConfig`, `walletConfig.ethereum.rpcUrls`) | `src/Providers.tsx` | Publishable key | https://www.openfort.io/docs/products/embedded-wallet/react/ui/configuration |
| `embeddedWalletConnector`, `OpenfortWagmiBridge` (`@openfort/react/wagmi`) | `src/Providers.tsx` | None | https://www.openfort.io/docs/products/embedded-wallet/react/wallet/ethereum |
| Shield automatic recovery (`walletConfig.shieldPublishableKey`, `createEncryptedSessionEndpoint`) | `src/Providers.tsx`; backend `POST /api/protected-create-encryption-session` | Shield publishable key, secret key, encryption share | https://www.openfort.io/docs/products/embedded-wallet/server/automatic-recovery-session |
| `openfort.createEncryptionSession` (`@openfort/openfort-node`) | openfort-backend-quickstart `src/app.ts` | Secret key + Shield keys | https://www.openfort.io/docs/products/embedded-wallet/server/automatic-recovery-session |
| Gas sponsorship (`walletConfig.ethereum.ethereumFeeSponsorshipId`) | `src/Providers.tsx` | Gas sponsorship for Monad (optional) | https://www.openfort.io/docs/configuration/gas-sponsorship |
| `OpenfortButton` (login + connected wallet panel: copy, Send, Deposit) | `src/App.tsx` | Auth providers enabled | https://www.openfort.io/docs/products/embedded-wallet/react/ui |
| Wallet funding (the panel's Deposit hub) | `OpenfortButton` panel | None for crypto transfers | https://www.openfort.io/docs/products/embedded-wallet/react/wallet/funding |
| `useUser` | `src/App.tsx` | None | https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useUser |
| Chain switch via wagmi `useSwitchChain` on the embedded wallet | `src/hooks/useExecuteAction.ts` | None | https://www.openfort.io/docs/products/embedded-wallet/react/wallet/actions/switch-chain |
| Send transaction via wagmi `useSendTransaction` on the embedded wallet | `src/hooks/useExecuteAction.ts` | None | https://www.openfort.io/docs/products/embedded-wallet/react/wallet/actions/send-transaction/ethereum |

## Failure modes
| Error | Cause | Fix |
|---|---|---|
| `Only absolute URLs are supported` (backend log, session request fails) | `SHIELD_BASE_PATH=` declared empty in the backend `.env`; the empty string overrides the Shield URL default | Delete the `SHIELD_BASE_PATH` line from the backend `.env` |
| `current chain does not match target chain` | The embedded connector does not switch chains per transaction when `sendTransaction({ chainId })` targets another chain | Call `switchChainAsync({ chainId })` before signing (done in `useExecuteAction`) |
| `Gas limit too low` | Local gas estimation failed and fell back to 21000; the Monad staking precompile needs about 300k | Pass Yield.xyz's `gasLimit` through as `gas` (done in `parseUnsignedTransaction`) |
| Chain switch to 143 fails on first connect (wallet creation) | Monad is not in the SDK's chain table and the wagmi transport fallback is not ready yet | Set `walletConfig.ethereum.rpcUrls: { [monad.id]: ... }` |
| `Funding isn't available on this network` | `OpenfortButton` Deposit hub on Monad Testnet | Fund testnet wallets from the Monad faucet; mainnet Deposit works |
| HTTP 400 from `POST /v1/actions/enter` (shown under the vault card) | The chosen Yield.xyz opportunity is not enabled for your Yield.xyz project | Enable it in the Yield.xyz dashboard or pick another vault |

## Upgrade notes
- September 2026: `@openfort/react` 2.1.1 → 2.1.3. No API changes affect this recipe; Monad (143) is still not in the SDK's built-in chain table, so keep `walletConfig.ethereum.rpcUrls`. 2.1.3 builds under Vite without the `@vite-ignore` pnpm patch.

## Integration notes (verified against the live API, Aug 2026)
- `POST /v1/actions/enter` / `/exit` returns `{ transactions: [{ id, stepIndex, unsignedTransaction, ... }] }`. `unsignedTransaction` is a **JSON-stringified** plain tx object (`to`/`data`/`value`/`chainId`/`nonce`/`gasLimit`/`maxFeePerGas`/`maxPriorityFeePerGas`), not raw hex. `useExecuteAction` parses it and forwards `to`/`data`/`value`/`chainId` plus `gasLimit` (as `gas`) to wagmi, letting it fetch nonce and fees fresh (the API's nonce is observed to be stale/`0` across multi-step actions). `gasLimit` is kept because a failed local estimate falls back to 21000 and the node rejects the tx with "Gas limit too low".
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
- Wallet management (address, copy, Send, Deposit) is `OpenfortButton`'s built-in connected panel. Its Deposit hub reports "Funding isn't available on this network" on Monad Testnet; on Monad mainnet it offers transfer from wallet, from address and from exchange.
- Yield.xyz has no separate testnet/mainnet API environment or key - same `api.yield.xyz` base URL and key work for both `monad-testnet` and `monad` networks, confirmed by hitting `GET /v1/yields?network=monad` with the shared demo key (200 OK, real ~14.8% APR data, 209 validators vs testnet's 1). Plan tiers (Trial/Standard/Pro, see `docs/rate-limits-and-plans`) gate request throughput, not network access.

## Code style
- Vite + TypeScript, **Biome** for lint/format (`pnpm lint` / `pnpm check`): single quotes, no semicolons, 2-space, 120 col.
- Prefer functional React components and hooks; wallet state via wagmi + `@openfort/react`.
- Yield.xyz data comes from a hand-rolled REST client (`src/lib/yieldXyz.ts`); there is no official browser SDK, so requests go through the Vite dev proxy to keep the API key server-side.

## PR instructions
- Title format: `[yield-xyz] <summary>`.
- Run `pnpm verify` before requesting review.
- Reflect new env vars, yieldIds, or chain support in `README.md` and this file.
