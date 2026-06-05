# Openfort × MPP (Machine Payments Protocol) — Solana

Pay for an HTTP resource with the [Machine Payments Protocol](https://mpp.dev) using an
**Openfort Solana wallet** as the signer. MPP gates a resource behind HTTP `402 Payment
Required`; the client signs a Solana payment and retries. Here the payer is an Openfort
**backend wallet** — the "machine" in machine payments — so the key lives in Openfort's
infrastructure (custody, recovery, policies) while MPP is just the rails.

```
payer (Openfort backend wallet)            server (Express + MPP)
  GET /api/protected  ───────────────────▶  402 + WWW-Authenticate: Payment
  build + sign Solana tx with Openfort
  GET /api/protected  ───────────────────▶  broadcast + verify on-chain
  Authorization: Payment                     200 + Payment-Receipt
```

> **Want to understand or rebuild the integration from scratch?** See
> [`INTEGRATION.md`](./INTEGRATION.md) — a from-first-principles guide that explains MPP, the
> Solana charge method, and the Openfort signer bridge in enough detail to reconstruct this
> recipe without the code.

## What's here

One package, two roles:

| script | role |
|---|---|
| `pnpm server` | the merchant: Express API gating `GET /api/protected` with `@solana/mpp` + `mppx`. No facilitator — it broadcasts and verifies the signed transaction itself. |
| `pnpm pay` | the payer (CLI): a machine that pays the resource from an Openfort backend Solana wallet. |
| `pnpm web` | the payer (dashboard): the same flow as a clickable page on `http://localhost:3020`. |
| `pnpm setup` | mints a payer + merchant backend wallet and prints their ids/addresses. |

The only Openfort↔MPP glue is `src/signer.ts` (~40 lines). Defaults to **devnet**.

## Prerequisites

- Node 22+ and `pnpm`
- An [Openfort](https://dashboard.openfort.io) project: **Secret Key** (`sk_test_...`) and a
  **wallet secret**
- A little devnet SOL ([faucet](https://faucet.solana.com))

## Run it

```bash
pnpm install
cp .env.example .env.local
```

Fill `.env.local`: `OPENFORT_SECRET_KEY`, `OPENFORT_WALLET_SECRET`, and
`MPP_SECRET_KEY` (`openssl rand -hex 32`). Then mint wallets:

```bash
pnpm setup     # prints PAYER_* and MERCHANT_*
```

Put `PAYER_ID` in `OPENFORT_SOLANA_ACCOUNT_ID`, `MERCHANT_ADDRESS` in `PAY_TO`, and fund the
payer address with devnet SOL. Now run the merchant and pay:

```bash
pnpm server               # terminal 1
pnpm pay                  # terminal 2  → Status: 200 + settlement signature
# or, for a clickable demo:
pnpm web                  # → http://localhost:3020, hit "Pay & unlock"
```

The dashboard shows the price/recipient/network from the 402 challenge, the Openfort payer
wallet and live balances, and after paying renders the unlocked content, the decoded
`Payment-Receipt`, and the on-chain settlement signature.

## How the Openfort integration works

`src/signer.ts` is the whole bridge. `@solana/mpp`'s client builds the charge transaction and
asks a `@solana/kit` `TransactionPartialSigner` to sign it. We implement that interface by:

1. encoding the **message bytes** with `getBase64Decoder` (the exact bytes a Solana signature
   must cover — not the full wire transaction),
2. calling `account.signTransaction({ transaction })` on the Openfort backend wallet,
3. attaching the raw Ed25519 signature it returns (hex → bytes).

The same pattern works for an Openfort **embedded** (browser) wallet via
`@openfort/react/solana` — a future roadmap item.

## Switch to USDC

In `.env.local`:

```
CURRENCY=<USDC SPL mint>   # devnet: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
DECIMALS=6
PRICE_BASE_UNITS=10000     # 0.01 USDC
```

Fund the payer with devnet USDC (plus a little SOL for fees). No code changes — currency and
decimals flow through the MPP challenge.

## Run on a local validator (offline, no faucet)

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
solana-test-validator --reset --quiet &
# .env.local: SOLANA_NETWORK=localnet, SOLANA_RPC_URL=http://127.0.0.1:8899
solana airdrop 5 <PAYER_ADDRESS> --url http://127.0.0.1:8899
```

> **Local-validator caveat.** A single-node validator finalizes slowly, so a just-issued
> (`confirmed`) blockhash may not be in the `finalized` bank when the server broadcasts with
> preflight → `Blockhash not found`. Fix: send with `skipPreflight: true`. Devnet/mainnet
> finalize steadily and need no change.

## Reference

Pinned: `@solana/mpp@0.6.0`, `mppx@0.6.30`, `@solana/kit@6.9.0`, `@openfort/openfort-node@0.10.5`.
ESM, NodeNext, strict TS. Env is loaded via `tsx --env-file`.

- Server: `Mppx.create({ secretKey, methods: [solana.charge({ recipient, currency, decimals, network, rpcUrl })] })`; route gate `payment(mpp.charge, { amount, currency })` from `mppx/express` (amount in base units).
- Client: `Mppx.create({ polyfill: false, methods: [charge({ signer, rpcUrl })] })` → `mpp.fetch(url)`. Default `broadcast: false` → client signs, server settles.
- Openfort backend: `new Openfort(secret, { walletSecret })` → `accounts.solana.backend.create()` / `.get({ id })` → `account.signTransaction({ transaction: base64 })` returns a raw **hex** Ed25519 signature.

Two facts that trip people up: Openfort signs the **message bytes** (not the wire tx), and
`signTransaction` returns just the **hex signature** (not a signed tx).

## Notes on pay.sh

The Solana Foundation's [pay.sh](https://github.com/solana-foundation/pay) speaks the same
MPP/x402 rails but signs with a **local keypair** (OS keystore) and has no remote-signer
hook — so it can't delegate to an Openfort-managed wallet. This recipe uses `@solana/mpp`
precisely because its `charge({ signer })` accepts any `@solana/kit` signer. pay.sh is still
useful as a server gateway (`pay server`) and a debugger (`debugger.pay.sh`).

## Roadmap

- Browser paywall — a React surface using `useSolanaEmbeddedWallet` + a Kit signer.
- MCP transport — charge an agent per tool call over MPP's MCP transport.
- Sessions — voucher-based micropayments (MPP's session intent is currently Tempo-only).
