# AI Agent Instructions — mpp-solana

Guidance for AI coding assistants working on the Openfort × MPP (Solana) recipe.

> Building this integration from scratch? Read [`INTEGRATION.md`](./INTEGRATION.md) — a
> from-first-principles guide that contains everything needed to reconstruct this recipe.

## Quick context

A single Node + TypeScript package (ESM, `NodeNext`, strict). Two roles:
- **server** (`src/server.ts`, `src/mpp.ts`, `src/config.ts`) — Express merchant that gates
  `GET /api/protected` with `@solana/mpp` + `mppx/express`. No facilitator; it broadcasts and
  verifies on-chain itself.
- **payer** (`src/pay.ts` CLI, `src/web.ts` dashboard) — both use `src/payment.ts`, which
  pays from an Openfort backend Solana wallet (`src/openfort.ts`) via the signer bridge
  (`src/signer.ts`).

Scripts: `pnpm server`, `pnpm pay`, `pnpm web` (dashboard on :3020), `pnpm setup`. Env loads
via `tsx --env-file-if-exists=.env.local` — there is no dotenv dependency.

## Critical rules

- **`src/signer.ts` is the heart of the recipe. Do not "simplify" it without understanding
  both invariants:** Openfort signs `transaction.messageBytes` (base64), NOT the wire
  transaction; and `account.signTransaction(...)` returns a raw **hex** Ed25519 signature, not
  a signed tx. Breaking either yields `signature verification` failures.
- No hardcoded keys, addresses, or amounts — everything comes from env. Never commit
  `.env.local`.
- Keep it dependency-light: `@solana/mpp`, `mppx`, `@solana/kit`, `@openfort/openfort-node`,
  `express`. Pin the protocol packages exactly (`@solana/mpp@0.6.0`, `mppx@0.6.30`).
- TypeScript strict; no `any` without justification. Prefer `import type` (verbatimModuleSyntax).

## Pinned API surface

- Server: `Mppx.create({ secretKey, methods: [solana.charge({ recipient, currency, decimals?, network, rpcUrl })] })`; route gate `payment(mpp.charge, { amount, currency })` from `mppx/express`.
- Client: `Mppx.create({ polyfill: false, methods: [charge({ signer, rpcUrl })] })` → `mpp.fetch(url)`.
- Openfort: `new Openfort(secret, { walletSecret })` → `accounts.solana.backend.create()` / `.get({ id })` → `account.signTransaction({ transaction: base64 })`.

## Setup / test

```bash
pnpm install
cp .env.example .env.local         # set OPENFORT_*, PAY_TO, MPP_SECRET_KEY
pnpm setup                          # mint payer + merchant wallets; fund the payer
pnpm server                         # terminal 1
pnpm pay                            # terminal 2 → Status: 200 + settlement signature
```

Verify: unpaid `GET /api/protected` returns `402` with `WWW-Authenticate: Payment method="solana"`;
a paid request returns `200` + a `Payment-Receipt`; on-chain balances move by the price.

Defaults to **devnet**. For an offline run use a local validator (see README) — note the
`skipPreflight` finalization caveat there.

## PR instructions

- Title format: `[mpp-solana] <summary>`.
- Document env var changes in `README.md` and this file.
- Run `pnpm typecheck` before requesting review.
