# AGENTS.md — private-payments

## Project overview

Pay supplier invoices privately with Openfort + Unlink on **Monad testnet** (chain id `10143`). Non-custodial:
an Openfort embedded **EOA** with **passkey** recovery owns an Unlink shielded balance; the backend only
registers the user and issues Unlink authorization tokens (never signs).

- `frontend/` — Vite + React. Openfort provider (Monad + EOA + passkey), browser Unlink client
  (`account.fromWallet`), and the payer/supplier UI.
- `backend/` — Express. `createUnlinkAdmin` + `createUnlinkAuthRoutes`, gated by the Openfort session token.

## Setup commands

```bash
cd backend && pnpm i && pnpm dev      # http://localhost:3020
cd frontend && pnpm i && pnpm dev     # http://localhost:5181
```

## Environment

Copy `backend/.env.local.example` → `backend/.env.local` and `frontend/.env.example` → `frontend/.env`.

| Variable | Package | Required | Notes |
| --- | --- | --- | --- |
| `OPENFORT_SECRET_KEY` | backend | yes | Dashboard → API Keys (`sk_test_...`) |
| `OPENFORT_PUBLISHABLE_KEY` | backend | yes | Same project as the secret key; `iam.getSession` calls `/iam/v2/auth/get-session`, which needs it |
| `UNLINK_API_KEY` | backend | yes | dashboard.unlink.xyz, server-only |
| `UNLINK_ENVIRONMENT` | backend | no | Default `monad-testnet` |
| `PORT` | backend | no | Default `3020` |
| `CORS_ORIGINS` | backend | no | Comma-separated; empty allows any origin |
| `VITE_OPENFORT_PUBLISHABLE_KEY` | frontend | yes | Dashboard → API Keys (`pk_test_...`) |
| `VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY` | frontend | yes | Dashboard → API keys (Shield section) |
| `VITE_UNLINK_TOKEN` | frontend | yes | Unlink dashboard → Tokens (Monad-testnet token address) |
| `VITE_API_BASE_URL` | frontend | no | Default `http://localhost:3020` |
| `VITE_UNLINK_ENVIRONMENT` | frontend | no | Default `monad-testnet` |
| `VITE_MONAD_RPC_URL` | frontend | no | Default `https://testnet-rpc.monad.xyz` |

## Testing instructions

- `pnpm verify` in `backend/` (Biome lint + `tsc`) and in `frontend/` (Biome lint + `tsc -b && vite build`).
  Both pass on `@openfort/react@2.1.3` / `@openfort/openfort-node@0.12.2` (2026-09-23). The Vite build
  prints a pre-existing "Some chunks are larger than 500 kB" notice; it was there on 1.3.0 too. No pnpm
  patch (`@vite-ignore` or other) is needed.
- Backend smoke test (checked 2026-09-23 with placeholder keys): `curl localhost:3020/api/health` returns
  `{"status":"ok"}`; `POST /api/unlink/register` and `/api/unlink/authorization-token` return `401` without
  a valid Openfort bearer token.
- 2026-09-25: frontend `pnpm install` (pnpm 10.30.3, Node 22), `pnpm audit --audit-level=moderate` clean
  after overriding `axios@<1.18.0` and `ws@<8.21.1` in `frontend/pnpm-workspace.yaml` (1 low,
  CVE-2025-14505 in `elliptic`, ignored there), `pnpm verify` passed; backend `pnpm install`, audit
  (no known vulnerabilities) and `pnpm verify` passed. No test scripts. Runtime flows not re-run. SDK
  versions unchanged (`@openfort/react` 2.1.3, `@openfort/openfort-node` 0.12.2, `@openfort/openfort-js`
  2.5.0 resolved).
- Needs manual runtime testing with real keys (not run after the 2.x upgrade): email OTP login, passkey
  wallet create/unlock, Unlink client build (derivation signature), faucet funding, shield/unshield,
  private and public invoice payment.

## Add this to your app

For an existing React (Vite or Next.js) app with its own Node backend.

**Dashboard setup**
1. Openfort dashboard: copy the publishable key (`pk_test_...`), the secret key (`sk_test_...`) and the Shield
   publishable key. Make sure the project has Monad testnet enabled and the EOA account type available.
2. dashboard.unlink.xyz: create a Monad-testnet project, create an API key (server-only) and copy the token
   address from **Tokens**.

**Packages (exact versions this recipe is verified with)**

```bash
# frontend
pnpm add @openfort/react@2.1.3 @unlink-xyz/sdk@0.3.0-canary.717 wagmi@^3.7.7 viem@^2.52.2 @tanstack/react-query@^5.99.2
# backend
pnpm add @openfort/openfort-node@0.12.2 @unlink-xyz/sdk@0.3.0-canary.717
```

**Files that carry the integration**

| File | Role |
| --- | --- |
| `frontend/src/openfort/Providers.tsx` | `QueryClientProvider` → `WagmiProvider` → `OpenfortWagmiBridge` → `OpenfortProvider` with `ethereum.accountType: EOA` and passkey-only `walletRecovery` |
| `frontend/src/openfort/wagmi.ts` | wagmi config from `getDefaultConfig` with Monad testnet |
| `frontend/src/unlink/unlink.ts` | `account.fromWallet` on the embedded EOA provider + `createUnlinkClient`; `customFetch` adds the Openfort bearer to `/api/unlink/*` only |
| `frontend/src/unlink/UnlinkBootstrap.tsx` | Builds the Unlink client once `useEthereumEmbeddedWallet` is `connected`, mounts `<UnlinkProvider>` |
| `backend/src/openfort.ts` + `backend/src/unlink.ts` | Openfort session check (`iam.getSession`) used as the `authenticate` callback of `createUnlinkAuthRoutes` |

**Steps**
1. Wrap the app in the provider stack from `Providers.tsx` (set `shieldPublishableKey`, `accountType: EOA`,
   `walletRecovery.allowedMethods: [RecoveryMethod.PASSKEY]`).
2. Sign users in (`useEmailOtpAuth` or the Openfort modal). Create or unlock the EOA with
   `useEthereumEmbeddedWallet().create({ accountType: EOA, recoveryMethod: PASSKEY })` / `.setActive(...)`;
   both resolve with `{ error }` on failure instead of throwing.
3. Backend: create `new Openfort(secretKey, { publishableKey })`, and mount `createUnlinkAuthRoutes` at
   `POST /api/unlink/register` and `POST /api/unlink/authorization-token`, authenticating with
   `openfort.iam.getSession({ accessToken })`. Allow the `Authorization` header in CORS.
4. Frontend: when the wallet status is `connected`, pass `wallet.provider` and `useUser().getAccessToken` to
   `buildUnlinkClient`, then render `<UnlinkProvider client={client}>`.
5. Pay privately with `useUnlink().withdraw({ recipientEvmAddress, token, amount })`.

**Check it works**: after login + passkey, the dashboard shows an `unlink1…` private address; the backend logs
no `authenticate() threw`; a private payment settles with the supplier row showing `source hidden`.

## Openfort primitives

| Primitive | Where in code | Dashboard setup | Docs |
| --- | --- | --- | --- |
| `OpenfortProvider` (`walletConfig.shieldPublishableKey`, `ethereum.accountType: EOA`, `uiConfig.walletRecovery`) | `frontend/src/openfort/Providers.tsx` | Publishable key, Shield publishable key | [Wallet configuration](https://www.openfort.io/docs/products/embedded-wallet/react/wallet), [UI configuration](https://www.openfort.io/docs/products/embedded-wallet/react/ui/configuration) |
| `OpenfortWagmiBridge`, `getDefaultConfig` | `frontend/src/openfort/Providers.tsx`, `frontend/src/openfort/wagmi.ts` | Monad testnet enabled | [Ethereum setup](https://www.openfort.io/docs/products/embedded-wallet/react/wallet/ethereum) |
| `useEmailOtpAuth`, `useAuthCallback` | `frontend/src/screens/Auth.tsx` | Email OTP auth enabled | [useEmailOtpAuth](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useEmailOtpAuth), [useAuthCallback](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useAuthCallback) |
| `useEthereumEmbeddedWallet` (`create`, `setActive`, `provider`, `status`) | `frontend/src/screens/Wallets.tsx`, `frontend/src/unlink/UnlinkBootstrap.tsx`, `frontend/src/App.tsx` | EOA account type | [useEthereumEmbeddedWallet](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useEthereumEmbeddedWallet), [Create a wallet](https://www.openfort.io/docs/products/embedded-wallet/react/wallet/create), [Active wallet](https://www.openfort.io/docs/products/embedded-wallet/react/wallet/active-wallet/ethereum) |
| Passkey recovery (`RecoveryMethod.PASSKEY`) | `frontend/src/openfort/Providers.tsx`, `frontend/src/screens/Wallets.tsx` | Shield keys | [Recovery methods](https://www.openfort.io/docs/configuration/recovery-methods) |
| `useUser` (`getAccessToken`, `isAuthenticated`) | `frontend/src/unlink/UnlinkBootstrap.tsx`, `frontend/src/App.tsx` | — | [useUser](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useUser) |
| `useOpenfort`, `useSignOut` | `frontend/src/App.tsx`, `frontend/src/screens/PayerDashboard.tsx` | — | [useOpenfort](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useOpenfort), [useSignOut](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useSignOut) |
| `new Openfort(secretKey, { publishableKey })`, `openfort.iam.getSession` | `backend/src/openfort.ts` | Secret key + publishable key (same project) | [User session and authorization](https://www.openfort.io/docs/products/embedded-wallet/server/access-token), [API keys](https://www.openfort.io/docs/configuration/api-keys) |

## Failure modes

| Error | Cause | Fix |
| --- | --- | --- |
| `Missing required env var OPENFORT_SECRET_KEY. Copy .env.local.example to .env.local and fill it in.` (same for `OPENFORT_PUBLISHABLE_KEY`, `UNLINK_API_KEY`) | Backend started without `backend/.env.local` | Copy the example and fill in the keys |
| `createUnlinkAuthRoutes: authenticate() threw Missing authorization token` (client gets `401` `{"error":{"code":"UNAUTHORIZED","message":"authentication failed"}}`) | Request to `/api/unlink/*` without `Authorization: Bearer <Openfort access token>` | Attach the token via `customFetch`; allow the `Authorization` header in CORS |
| `createUnlinkAuthRoutes: authenticate() threw Invalid API key.` | `OPENFORT_SECRET_KEY` is wrong or from another project | Use the secret key of the same project as the frontend publishable key |
| `401` on `/api/unlink/*` with a valid token; SDK error `Publishable key not configured. Required for: GET /iam/v2/auth/get-session` | Openfort client built without `publishableKey` | Pass `{ publishableKey }` to `new Openfort(...)` and set `OPENFORT_PUBLISHABLE_KEY` |

## Key constraints

- **`@openfort/react` is pinned to `2.1.3`**, with `wagmi@3.x`, `viem@2.x` and `@tanstack/react-query@>=5.99.2`
  (required peer since 2.0).
- **2.x upgrade notes (from 1.3.0):** `create` / `setActive` resolve with `{ error }` instead of throwing, so
  `Wallets.tsx` branches on `result.error`. Error text comes from `error.shortMessage` (`error.message` now
  carries a version footer). `getDefaultConfig` sets wagmi `ssr: true`, so `useAccount()` reports
  `reconnecting` on the first render; `App.tsx` treats that as loading instead of showing the unlock screen.
  The frontend Shield env var was renamed `VITE_OPENFORT_SHIELD_KEY` → `VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY`.
- **`@unlink-xyz/sdk` is pinned to `0.3.0-canary.717`** (published on the `canary` dist-tag). The client uses
  `account.fromWallet` (older builds exposed it as the now-deprecated `account.fromMetaMask` alias).
- **Passkey-only recovery** — no `getEncryptionSession` / automatic-recovery endpoint.
- **`UNLINK_API_KEY` is server-only.** The browser client posts to `/api/unlink/*` with the Openfort bearer;
  `customFetch` attaches it to those calls only. Backend CORS must allow the `Authorization` header.
- **Token is per Unlink project.** Set `VITE_UNLINK_TOKEN` to the Monad-testnet token address from the
  Unlink dashboard (the Engine has no token-list endpoint).

## Code style

- Biome (pinned `2.4.16`): single quotes, no semicolons, 2-space indent, 100 columns. Run `pnpm check` to
  format.

## PR instructions

- Title format: `[private-payments] <summary>`.
- Document env var changes in `README.md` and this file; run `pnpm verify` in both packages.
