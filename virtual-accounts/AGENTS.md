# AGENTS.md — virtual-accounts

## Overview

Issue Noah virtual bank accounts (USD ACH / EUR SEPA IBAN) against an Openfort embedded wallet. Fiat
deposited to the account is converted to USDC and sent on-chain to that wallet.

- `frontend/` — Vite + React. Openfort provider (Polygon Amoy + EOA + passkey), KYC gate, currency
  toggle, account details, sandbox deposit simulation, USDC balance.
- `backend/` — Express. Validates the Openfort session token, then calls Noah with a server-only API key.

## Setup commands

```bash
cd backend && pnpm i && pnpm dev      # http://localhost:3021
cd frontend && pnpm i && pnpm dev     # http://localhost:5182
```

Copy `backend/.env.local.example` → `backend/.env.local` and `frontend/.env.example` → `frontend/.env`.
Hosted KYC needs an HTTPS `PUBLIC_APP_URL`, so run a tunnel to the frontend in local development.

## Testing / checks

- Backend: `pnpm build` (tsc). Liveness: `curl localhost:3021/api/health`. Every `/api/banking/*` route
  except the webhook returns `401` without a valid Openfort bearer token; the webhook returns `401`
  without a valid `Webhook-Signature`.
- Frontend: `pnpm build` (tsc + vite). Lint/format: `pnpm check` (Biome).

## Key constraints

- **The Openfort user id is the Noah `CustomerID`.** No user table; changing that mapping orphans every
  issued account.
- **`FiatCurrency` is the only rail switch.** Read `PaymentMethodType` from the response
  (`BankAch` / `BankSepa`) to decide whether `AccountNumber` is an account number or an IBAN and whether
  `BankCode` is a routing number or a BIC — never assume from the request.
- **Request signing is production-only here.** `noah.ts` signs whenever `NOAH_SIGNING_PRIVATE_KEY` is
  set. In sandbox, sending a signature from a public key Noah has not registered fails with
  `401 "public key not found"` — leave the variable empty unless the key was created with a signing key.
- **The webhook needs the raw body.** `express.raw` is mounted on `/api/banking/webhooks` before
  `express.json()`; parsing first breaks ECDSA SHA-384 verification.
- **Sandbox tokens carry a `_TEST` suffix** (`USDC_TEST` on `PolygonTestAmoy`). `NOAH_ENVIRONMENT`
  drives base URL, token, and network together — don't set them independently.
- **`@openfort/react` is pinned to `1.3.0`** (needs `AccountTypeEnum.EOA`, `useEthereumEmbeddedWallet`,
  `uiConfig.walletRecovery`). Keep `wagmi` on `3.x` and `viem` on `2.x` to match. wagmi 3's `useBalance`
  is native-only, so the USDC balance uses `useReadContract` + `balanceOf`.
- **Passkey-only recovery** — no `getEncryptionSession` / automatic-recovery endpoint.
