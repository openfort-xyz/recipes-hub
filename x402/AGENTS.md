# AGENTS.md — x402

## Project overview
- An x402 (HTTP 402 Payment Required) paywall paid in USDC on **Base Sepolia** (testnet; `X402_NETWORK=base` switches to Base mainnet). The frontend offers two tabs:
  - **Embedded wallet**: the user logs in with `@openfort/react` (email OTP, guest, Google or an external wallet), gets an Openfort embedded wallet with Shield automatic recovery, and pays either by sending a USDC `transfer` through wagmi (gas sponsored by a fee sponsorship) or by signing an EIP-3009 `TransferWithAuthorization` that a facilitator settles.
  - **Backend wallet**: an Openfort backend wallet (developer custody) signs the `TransferWithAuthorization` server-side. Gas is paid either by Openfort (`accounts.evm.backend.sendTransaction`, which delegates the EOA via EIP-7702 on first use) or by the Coinbase CDP x402 facilitator.
- `frontend/`: React 19 + Vite 8 + TypeScript, Tailwind v4, wagmi 3, viem 2, `@openfort/react@2.1.3`. Lint and format with Biome.
- `backend/`: Express 5 + TypeScript, `@openfort/openfort-node@0.12.2`, `@coinbase/cdp-sdk` (facilitator JWT). Serves the 402 endpoint, the Shield encryption-session endpoint and the backend-wallet endpoints.

## Setup commands
- `cd backend && pnpm install && pnpm dev` (compiles with `tsc`, then `node --watch dist/server.js`; listens on `PORT`, 3007 in the example).
- `cd frontend && pnpm install && pnpm dev` (Vite on http://localhost:5173).
- `pnpm-workspace.yaml` at the recipe root holds the shared `minimumReleaseAge`, overrides and audit config for both packages.

## Environment
- `frontend/.env.example` → copy to `frontend/.env.local`:
  - `VITE_OPENFORT_PUBLISHABLE_KEY` (required), `VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY` (required), `VITE_OPENFORT_FEE_SPONSORSHIP_ID` (optional; sponsors embedded-wallet gas), `VITE_CREATE_ENCRYPTED_SESSION_ENDPOINT` (required for automatic recovery), `VITE_WALLET_CONNECT_PROJECT_ID` (optional), `VITE_X402_RESOURCE_URL` (required; its origin is the API base URL), `VITE_X402_DEFAULT_AMOUNT` (optional).
- `backend/.env.local.example` → copy to `backend/.env.local`:
  - Openfort: `OPENFORT_SECRET_KEY` (required), `OPENFORT_WALLET_SECRET` and `OPENFORT_BACKEND_WALLET_ID` (Backend wallet tab), `OPENFORT_FEE_SPONSORSHIP_ID` (optional; empty = project-scoped fee sponsorship).
  - Shield: `OPENFORT_SHIELD_PUBLISHABLE_KEY`, `OPENFORT_SHIELD_SECRET_KEY`, `OPENFORT_SHIELD_ENCRYPTION_KEY` (Embedded wallet tab; the encryption key is the Shield encryption share).
  - Facilitator (optional): `X402_FACILITATOR_URL`, `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`.
  - Paywall: `PAY_TO_ADDRESS`, `X402_NETWORK`, `X402_RESOURCE`, `X402_DESCRIPTION`, `X402_MIME_TYPE`, `X402_MAX_AMOUNT`, `X402_TIMEOUT`, `X402_ASSET_ADDRESS`, `X402_ASSET_NAME`, `X402_ASSET_VERSION`, `X402_RPC_URL`; plus `PORT` and `CORS_ORIGINS`.
- Restart the backend after changing `backend/.env.local`; config is read once at startup (`backend/src/config.ts`).

## Testing instructions
- `pnpm verify` in `frontend/` runs `biome lint .` and `tsc -b && vite build`. `pnpm verify` in `backend/` runs `tsc`. There are no unit tests.
- Verified on 2026-09-23: `pnpm install && pnpm verify` passes in both packages with `@openfort/react@2.1.3` and `@openfort/openfort-node@0.12.2`. The Vite build needs no `@vite-ignore` patch.
- Needs manual runtime testing with real keys (not run for this upgrade): embedded-wallet login and Shield automatic recovery, the sponsored USDC `transfer`, backend wallet creation, the backend gasless payment through `accounts.evm.backend.sendTransaction` (first send delegates the EOA), and both facilitator paths. Fund the payer with Base Sepolia USDC from https://faucet.circle.com.

## Add this to your app
For a coding agent adding an x402 USDC paywall with Openfort wallets to an existing React + Node app.

1. **Dashboard setup** (https://dashboard.openfort.io):
   - API keys: publishable key (`pk_test_…`) and secret key (`sk_test_…`).
   - Shield → API keys: Shield publishable key, Shield secret key and the encryption share (automatic recovery).
   - Fee sponsorships: a sponsorship on Base Sepolia (`pol_…`) that pays gas for the embedded wallet, and either a transaction-scoped (`pol_…`) or project-scoped sponsorship for backend-wallet sends.
   - Backend wallets → Setup: a wallet secret, only if you use backend wallets.
2. **Install**:
   - Frontend: `pnpm add @openfort/react@2.1.3 wagmi@^3 viem@^2 @tanstack/react-query@^5`.
   - Backend: `pnpm add @openfort/openfort-node@0.12.2 viem@^2` (plus `@coinbase/cdp-sdk` only for the CDP facilitator).
3. **Files that carry the integration**:
   - `frontend/src/integrations/openfort/OpenfortProviders.tsx`: wagmi config with `embeddedWalletConnector()`, `OpenfortWagmiBridge`, and `OpenfortProvider` with `walletConfig.ethereum.ethereumFeeSponsorshipId`, `createEncryptedSessionEndpoint` and `RecoveryMethod.AUTOMATIC`.
   - `frontend/src/integrations/x402/payments.ts`: builds and signs the EIP-3009 `TransferWithAuthorization` payload and base64-encodes the payment header.
   - `frontend/src/features/paywall/PaywallExperience.tsx`: fetches the 402 requirements, then pays with `useWriteContract` (USDC `transfer`, sponsored) or with the signed header.
   - `backend/src/routes.ts`: `handleShieldSession` (encryption session for automatic recovery), `handleProtectedContent` (402 response and payment verification) and the backend-wallet handlers.
   - `backend/src/payment.ts`: on-chain and off-chain verification, facilitator verify/settle, `createBackendWalletPayment` (backend wallet `signTypedData`) and `submitTransferWithAuthorizationGasless` (`accounts.evm.backend.sendTransaction`).
4. **Steps, in order**:
   1. Add the encryption-session route: verify the caller with `openfort.iam.getSession({ accessToken })`, then return `{ session: await openfort.createEncryptionSession(shieldPublishableKey, shieldSecretKey, encryptionShare) }`.
   2. Wrap the app in the providers from `OpenfortProviders.tsx`, pointing `createEncryptedSessionEndpoint` at that route.
   3. Add the 402 route: with no payment header return `402` with the requirements (`scheme: "exact"`, `payTo`, `asset`, `maxAmountRequired`, `extra: { name, version }`); with an `X-TRANSACTION-HASH` header verify the USDC `Transfer` log on-chain; with a `PAYMENT-SIGNATURE`/`X-PAYMENT` header verify the EIP-712 signature or forward it to the facilitator.
   4. In the client, after login, pay with `writeContract` (USDC `transfer` to `payTo`) and resend the request with `X-TRANSACTION-HASH`, or sign `TransferWithAuthorization` and resend with `PAYMENT-SIGNATURE`.
   5. Backend wallet (optional): `openfort.accounts.evm.backend.create()` once, store the `acc_…` id, sign `TransferWithAuthorization` with `account.signTypedData`, and submit `transferWithAuthorization` through `openfort.accounts.evm.backend.sendTransaction({ account, chainId, interactions, policy })`. Poll `openfort.transactionIntents.get(id)` until `response.transactionHash` appears.
5. **Check it works**: the protected URL returns `402` with requirements; after paying, the same request returns `200` with the content and the transaction hash resolves on https://sepolia.basescan.org.

## Openfort primitives
| Primitive | Where in code | Dashboard setup | Docs |
| --- | --- | --- | --- |
| `OpenfortProvider` (`walletConfig.ethereum`, `createEncryptedSessionEndpoint`, `uiConfig.authProviders`) | `frontend/src/integrations/openfort/OpenfortProviders.tsx` | Publishable key, Shield publishable key | https://www.openfort.io/docs/products/embedded-wallet/react/wallet |
| `embeddedWalletConnector`, `OpenfortWagmiBridge` (`@openfort/react/wagmi`) | `frontend/src/integrations/openfort/OpenfortProviders.tsx` | None | https://www.openfort.io/docs/products/embedded-wallet/react/wallet/ethereum |
| `ethereumFeeSponsorshipId` (embedded wallet gas sponsorship) | `frontend/src/integrations/openfort/OpenfortProviders.tsx` | Fee sponsorship on Base Sepolia | https://www.openfort.io/docs/configuration/gas-sponsorship |
| `RecoveryMethod.AUTOMATIC` | `OpenfortProviders.tsx`, `frontend/src/features/paywall/components/WalletSelector.tsx` | Shield keys + encryption share | https://www.openfort.io/docs/configuration/recovery-methods |
| `OpenfortButton` | `frontend/src/features/paywall/components/AuthPrompt.tsx` | Auth providers enabled (email OTP, Google, guest, wallet) | https://www.openfort.io/docs/products/embedded-wallet/react/ui |
| `useUser` | `frontend/src/features/paywall/PaywallExperience.tsx` | None | https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useUser |
| `openfort.iam.getSession`, `openfort.createEncryptionSession` | `backend/src/routes.ts` (`handleShieldSession`) | Secret key, Shield secret key, encryption share | https://www.openfort.io/docs/products/embedded-wallet/server/automatic-recovery-session |
| `openfort.accounts.evm.backend.create` / `.get` | `backend/src/routes.ts`, `backend/src/openfort.ts` | Secret key, wallet secret | https://www.openfort.io/docs/products/server/accounts |
| `EvmAccount.signTypedData` | `backend/src/payment.ts` (`createBackendWalletPayment`) | Wallet secret | https://www.openfort.io/docs/products/server/accounts |
| `openfort.accounts.evm.backend.sendTransaction` | `backend/src/payment.ts` (`submitTransferWithAuthorizationGasless`) | Fee sponsorship (transaction- or project-scoped) | https://www.openfort.io/docs/products/server/evm/gasless-transactions |
| `openfort.transactionIntents.get` | `backend/src/payment.ts` | None | https://www.openfort.io/docs/products/server/evm/gasless-transactions |

## Failure modes
| Error | Cause | Fix |
| --- | --- | --- |
| API error containing `Invalid pol` / `Invalid policy` on a backend-wallet payment | `OPENFORT_FEE_SPONSORSHIP_ID` holds a backend-wallet policy or an id that is not a fee sponsorship | Use a `pol_…` from Dashboard → Fee sponsorships, or leave the variable empty to use a project-scoped fee sponsorship. The backend appends this hint to the error. |
| `Authentication failed` from `accounts.evm.backend.create` | `OPENFORT_WALLET_SECRET` belongs to a different project than `OPENFORT_SECRET_KEY` (reads still work) | Copy the wallet secret from the same project's Backend wallets → Setup. |
| Backend-wallet payment fails after changing `PAY_TO_ADDRESS` | The backend reads env once at startup, or the new value is not a valid address | Restart the backend; make sure `PAY_TO_ADDRESS` is a valid EVM address; check the fee sponsorship for recipient/calldata rules. |

## Recipe notes
- **Payer vs recipient (Backend wallet tab):** the payer is the backend wallet address (fund it with USDC, "Payer (fund this)" in the UI); the recipient is `PAY_TO_ADDRESS`. On the explorer the transaction "From" may be the bundler; the token transfer is payer → recipient.
- **Gas modes:** the Backend wallet tab offers "Openfort policy" whenever the backend wallet is configured, and "Facilitator" when `X402_FACILITATOR_URL` and both CDP keys are set. The facilitator path returns the signed header to the client, which sends it to `/api/protected-content`.
- **Upgrade notes (September 2026):** `@openfort/react` 2.0.1 → 2.1.3 and `@openfort/openfort-node` 0.11.0 → 0.12.2. The backend now submits gasless payments with `accounts.evm.backend.sendTransaction`, which registers the EIP-7702 Delegated Account (default `CaliburV9`) and signs the authorization itself. The hand-rolled delegation upgrade (REST `PUT /v2/accounts/backend/{id}`, `POST /api/backend-wallet/upgrade`), the `OPENFORT_DELEGATED_ACCOUNT_ID` and `OPENFORT_SIGNATURE_YPARITY` variables and the raw-REST intent polling were removed. Backend wallets delegated to `Calibur` (V8) by the earlier version keep their existing record; that path was not runtime-tested after the change.
- Protocol helpers in `frontend/src/integrations/x402/` stay pure TypeScript (no React, no UI imports). Hardcoded token addresses live in `frontend/src/integrations/x402/contracts.ts`.

## Code style
- Frontend: Biome (single quotes, no semicolons, 2-space). Run `pnpm check` to format and fix. No `any` without a reason; `noExplicitAny` is a warning.
- Backend: no linter; keep the existing style of each file and `res.status().json()` responses with explicit error handling.
- Client env vars need the `VITE_` prefix; server env is read only in `backend/src/config.ts`.

## PR instructions
- Title format: `[x402] <summary>`.
- Document env var changes in `README.md`, this file and both env example files.
- Run `pnpm verify` in `frontend/` and `backend/` before requesting review.
