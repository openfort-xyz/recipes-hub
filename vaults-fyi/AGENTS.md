# AGENTS.md

## Project overview
- Openfort + vaults.fyi integration with a Vite React frontend.
- A Shield-managed (automatic recovery) Openfort embedded wallet discovers USDC vaults via `@vaultsfyi/sdk`, deposits and redeems, tracks positions, claims rewards, and uses the beta borrow and fixed-term (Pendle) endpoints.
- Chain: **Base mainnet** (8453). Deposits use real USDC; borrow actions can switch to other mainnets vaults.fyi supports (each action carries its own `chainId`).
- Backend: the shared [openfort-backend-quickstart](https://github.com/openfort-xyz/openfort-backend-quickstart) serves the Shield encryption session.

## Setup commands
- `pnpm i`
- `cp .env.example .env`
- Start the backend (see `## Environment`), then `pnpm dev` (serves UI on `http://localhost:5173`).

## Environment
- Frontend `.env` (see `.env.example`):
  - `VITE_OPENFORT_PUBLISHABLE_KEY` (required), `VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY` (required).
  - `VITE_OPENFORT_FEE_SPONSORSHIP_ID` (optional; unset = the wallet pays gas).
  - `VITE_WALLET_CONNECT_PROJECT_ID` (optional; unset = no WalletConnect connector).
  - `VITE_BACKEND_URL` (required; `http://localhost:3000` for the quickstart backend).
  - `VAULTS_FYI_API_KEY` (required; server-side only, injected by the Vite dev proxy in `vite.config.ts`; never prefix with `VITE_`).
- Backend `.env` (openfort-backend-quickstart): `OPENFORT_SECRET_KEY`, `SHIELD_PUBLISHABLE_KEY`, `SHIELD_SECRET_KEY`, `SHIELD_ENCRYPTION_KEY`. Leave `SHIELD_BASE_PATH` undeclared (delete the line; do not set it to an empty value).
- Placeholder keys fail at runtime; use real dashboard credentials.

## Testing instructions
- `pnpm verify` = `biome lint .` + `tsc -b && vite build`. It checks types against `@openfort/react` 2.1.3 / wagmi 3 and that the bundle builds; it does not run the app.
- Manual runtime check (needs real keys, the backend, a vaults.fyi key and USDC on Base): sign in with `OpenfortButton`, wallet is created/recovered without a password prompt, recommended vaults load, a 1 USDC deposit sends approve + deposit and appears under positions, redeem works, rewards list loads, borrow markets load.
- Not runtime-verified for the 2.1.3 upgrade (2026-09-23): only `pnpm verify` was run.
- 2026-09-25: `pnpm install`, `pnpm audit --audit-level=moderate` (clean; the `@walletconnect/ethereum-provider` override in `pnpm-workspace.yaml` removes the `query-string`/`decode-uri-component` path that `@vaultsfyi/sdk` → `x402` → wagmi 2 pulled in, GHSA-vcc3-ghjq-m6fr) and `pnpm verify` pass. No test script. Not runtime-verified.

## Add this to your app
For a coding agent adding Openfort wallets + vaults.fyi deposits to an existing React app (Vite shown; any bundler works if the vaults.fyi key stays server-side).

1. **Dashboard setup** ([dashboard.openfort.io](https://dashboard.openfort.io)):
   - Developers → API Keys: copy the publishable key, and create Shield keys (publishable key, secret key, encryption share).
   - Optional: [Gas sponsorships](https://dashboard.openfort.io/policies) → Add gas sponsorship for Base; copy its id.
   - vaults.fyi: get an API key at [portal.vaults.fyi](https://portal.vaults.fyi).
2. **Install** (exact versions this recipe verifies with):
   `pnpm add @openfort/react@2.1.3 wagmi@^3.7.7 viem@^2.56.5 @tanstack/react-query@^5.103.1 @vaultsfyi/sdk@^2.3.13`
3. **Backend**: expose `POST /api/protected-create-encryption-session` that returns `{ session }` from `openfort.createEncryptionSession(SHIELD_PUBLISHABLE_KEY, SHIELD_SECRET_KEY, SHIELD_ENCRYPTION_KEY)` (`@openfort/openfort-node`, authenticated with `OPENFORT_SECRET_KEY`). openfort-backend-quickstart `src/app.ts` is a working copy.
4. **Files that carry the integration** (copy and adapt):
   - `src/Providers.tsx`: `QueryClientProvider` → `WagmiProvider` (connectors: `embeddedWalletConnector()` first) → `OpenfortWagmiBridge` → `OpenfortProvider` with `walletConfig.shieldPublishableKey`, `walletConfig.createEncryptedSessionEndpoint` and `walletConfig.ethereum.ethereumFeeSponsorshipId`.
   - `vite.config.ts`: dev proxy `/api/vaults-fyi/*` → `https://api.vaults.fyi` that adds the `x-api-key` header. In production, replace with your own backend route that adds the same header.
   - `src/lib/vaultsFyi.ts`: `VaultsSdk` pointed at the proxy (`apiBaseUrl`).
   - `src/hooks/useExecuteAction.ts`: signs the `actions[]` vaults.fyi returns, in order, with wagmi `useSendTransaction`, waiting for each receipt.
   - `src/components/ActionPanel.tsx`: calls `sdk.getActions({ path: { action: 'deposit', ... } })` and hands the result to `useExecuteAction` (`PositionsPanel.tsx` does the same with `action: 'redeem'`).
5. **Steps in order**: wrap the app in the providers; render `OpenfortButton` and gate vault UI on `useUser().isAuthenticated` plus a wagmi `address`; list vaults (`sdk.getAllVaults`); fetch actions for the chosen vault and execute them; refresh positions (`sdk.getPositions`).
6. **Check it works**: after login the wallet address shows in `OpenfortButton`; a deposit returns tx hashes for each action and the vault shows up in positions.

## Openfort primitives
| Primitive | Where in code | Dashboard setup | Docs |
|---|---|---|---|
| `OpenfortProvider` (`publishableKey`, `walletConfig`) | `src/Providers.tsx` | Publishable key | https://www.openfort.io/docs/products/embedded-wallet/react/ui/configuration |
| `embeddedWalletConnector`, `OpenfortWagmiBridge` (`@openfort/react/wagmi`) | `src/Providers.tsx` | None | https://www.openfort.io/docs/products/embedded-wallet/react/wallet/ethereum |
| Shield automatic recovery (`walletConfig.shieldPublishableKey`, `createEncryptedSessionEndpoint`) | `src/Providers.tsx`; backend `POST /api/protected-create-encryption-session` | Shield publishable key, secret key, encryption share | https://www.openfort.io/docs/products/embedded-wallet/server/automatic-recovery-session |
| `openfort.createEncryptionSession` (`@openfort/openfort-node`) | openfort-backend-quickstart `src/app.ts` | Secret key + Shield keys | https://www.openfort.io/docs/products/embedded-wallet/server/automatic-recovery-session |
| Gas sponsorship (`walletConfig.ethereum.ethereumFeeSponsorshipId`) | `src/Providers.tsx` | Gas sponsorship for Base (optional) | https://www.openfort.io/docs/configuration/gas-sponsorship |
| `OpenfortButton` | `src/App.tsx` | Auth providers enabled | https://www.openfort.io/docs/products/embedded-wallet/react/ui |
| `useUser` | `src/App.tsx` | None | https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useUser |
| Send transaction via wagmi `useSendTransaction` on the embedded wallet | `src/hooks/useExecuteAction.ts` | None | https://www.openfort.io/docs/products/embedded-wallet/react/wallet/actions/send-transaction/ethereum |

## Failure modes
| Error | Cause | Fix |
|---|---|---|
| Blank page on `pnpm dev` | `@openfort/react` < 1.1.1 marked the provider's lazy imports with a `@vite-ignore` hint, so Vite could not pre-bundle them | Use `@openfort/react` 1.1.1 or later (this recipe pins 2.1.3); no pnpm patch or `optimizeDeps` workaround is needed |

## Upgrade notes
- September 2026: `@openfort/react` 2.0.1 → 2.1.3. No API changes affect this recipe (`walletConfig.ethereum.ethereumFeeSponsorshipId` and `createEncryptedSessionEndpoint` are unchanged). 2.1.3 builds under Vite without the `@vite-ignore` pnpm patch. The backend env names in the README were corrected to the quickstart's (`OPENFORT_SECRET_KEY`, `SHIELD_*`).
- June 2026: migrated from ESLint to **Biome** and runs on **Vite 8**. Tailwind stays on v3.

## Code style
- Vite + TypeScript, **Biome** for lint/format (`pnpm lint` / `pnpm check`): single quotes, no semicolons, 2-space, 120 col.
- Prefer functional React components and hooks; wallet state via wagmi + `@openfort/react`.
- Vault data comes from `@vaultsfyi/sdk`; beta borrow/fixed-term calls go through `src/lib/vaultsFyiBeta.ts`.

## PR instructions
- Title format: `[vaults-fyi] <summary>`.
- Run `pnpm verify` before requesting review.
- Reflect new env requirements or vault constants in `vaults-fyi/README.md` and this file.
