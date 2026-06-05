# Building MPP-on-Solana payments with Openfort

> An integration guide written from first principles. If you read only this page — no
> reference implementation — you have everything you need to build the recipe yourself.
> Code blocks are the real shapes, not pseudocode.

## What you are building

A **machine that pays for an HTTP resource**, where the paying wallet is an **Openfort
backend Solana wallet**. Two processes:

- a **merchant server** that gates a resource behind HTTP `402 Payment Required`, and
- a **payer** (a CLI or an agent) that signs a Solana payment and retries.

```
payer (Openfort backend wallet)            merchant (Express + @solana/mpp)
  GET /resource  ─────────────────────────▶  402 + WWW-Authenticate: Payment   (the challenge)
  build a Solana transfer tx
  sign it with the Openfort wallet
  GET /resource  ─────────────────────────▶  broadcast + verify on-chain
  Authorization: Payment <signed tx>          200 + Payment-Receipt
```

## Background you need

### MPP in 60 seconds

The **Machine Payments Protocol** (Stripe + Tempo, [mpp.dev](https://mpp.dev)) standardizes
HTTP `402`. The handshake is one challenge/response:

1. client requests a resource;
2. server replies `402` with a `WWW-Authenticate: Payment` header (the challenge: how much,
   to whom, on which network);
3. client's wallet signs a payment credential;
4. client retries with `Authorization: Payment <credential>`;
5. server verifies, settles, returns the resource plus a `Payment-Receipt` header.

MPP is **intent** (`charge`, `session`) × **method** (`solana`, `tempo`, `stripe`, …). We use
the **Solana `charge`** method. Unlike x402, MPP needs **no facilitator** — the server settles
the transaction itself via its own RPC.

SDKs (TypeScript):
- `mppx` — the protocol core + framework middleware (`mppx/express`, `mppx/client`).
- `@solana/mpp` — the Solana method, built on `@solana/kit`. Exposes `@solana/mpp/server`
  (`Mppx`, `solana.charge`) and `@solana/mpp/client` (`charge`).

### Why Openfort is the wallet

MPP is the rails; it does not hold keys. The payer needs a Solana keypair that signs the
charge transaction. An **Openfort backend Solana wallet** is that keypair, except the private
key lives in Openfort's infrastructure (custody, recovery, spend policies) and you call an API
to sign. The seam that makes this clean: `@solana/mpp`'s client `charge({ signer })` accepts
**any `@solana/kit` `TransactionSigner`**, so we wrap the Openfort account as one. (This is
also why a local-keypair tool like pay.sh can't be the payer here — it has no remote-signer
hook; `@solana/mpp` does.)

## Step by step

### 0. Project shape

One package, ESM, `NodeNext`, strict TypeScript. Dependencies:

```
@solana/mpp  mppx  @solana/kit            # the protocol + Solana method
@openfort/openfort-node                   # the backend wallet
express                                    # the merchant server
```

Run scripts with `tsx`. Load secrets with `tsx --env-file-if-exists=.env.local` (no dotenv
dependency needed). Pin the protocol packages exactly (see the version table at the end).

### 1. The merchant server

```ts
import { Mppx, solana } from '@solana/mpp/server'
import { payment } from 'mppx/express'

const mpp = Mppx.create({
  secretKey: process.env.MPP_SECRET_KEY,           // REQUIRED — signs receipts/challenges
  methods: [
    solana.charge({
      recipient: process.env.PAY_TO,               // merchant Solana address (base58)
      currency: 'sol',                             // 'sol' for native SOL, or an SPL mint
      // decimals: 6,                              // required only when currency is a mint
      network: 'devnet',                           // 'devnet' | 'mainnet-beta' | 'localnet'
      rpcUrl: process.env.SOLANA_RPC_URL,          // the server broadcasts + verifies here
    }),
  ],
})

app.get(
  '/api/protected',
  payment(mpp.charge, { amount: '1000000', currency: 'sol' }),  // amount in base units (lamports)
  (_req, res) => res.json({ secret: 'unlocked' }),
)
```

Notes:
- `secretKey` is **required at runtime** (`openssl rand -hex 32`).
- The per-route price is set in `payment(mpp.charge, { amount, currency })`, in base units
  (lamports for SOL).
- No facilitator: the server fetches a blockhash, broadcasts the client's signed tx, and
  verifies it on-chain — all through `rpcUrl`.

### 2. The Openfort backend wallet

```ts
import Openfort from '@openfort/openfort-node'

const openfort = new Openfort(process.env.OPENFORT_SECRET_KEY, {
  walletSecret: process.env.OPENFORT_WALLET_SECRET,
})

// Mint once, then reuse by id:
const account = process.env.OPENFORT_SOLANA_ACCOUNT_ID
  ? await openfort.accounts.solana.backend.get({ id: process.env.OPENFORT_SOLANA_ACCOUNT_ID })
  : await openfort.accounts.solana.backend.create()

// account: { id, address, signTransaction({ transaction }): Promise<string>, ... }
```

`account.signTransaction({ transaction })` takes a **base64 string** and returns the **raw
Ed25519 signature as a hex string** — not a signed transaction. Remember both facts.

### 3. The signer bridge — the crux

`@solana/mpp`'s client builds the charge transaction and asks a `@solana/kit`
`TransactionPartialSigner` to sign it. Implement that interface on top of the Openfort
account:

```ts
import { address, getBase64Decoder } from '@solana/kit'
import type { SignatureBytes, SignatureDictionary, Transaction, TransactionPartialSigner } from '@solana/kit'

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return out
}

function openfortSolanaSigner(account): TransactionPartialSigner {
  const signerAddress = address(account.address)
  const decoder = getBase64Decoder()
  return {
    address: signerAddress,
    async signTransactions(transactions: readonly Transaction[]): Promise<readonly SignatureDictionary[]> {
      return Promise.all(transactions.map(async (tx) => {
        const messageBase64 = decoder.decode(tx.messageBytes)               // (1)
        const signatureHex = await account.signTransaction({ transaction: messageBase64 })
        const signature = hexToBytes(signatureHex) as SignatureBytes        // (2)
        return Object.freeze({ [signerAddress]: signature }) as SignatureDictionary
      }))
    },
  }
}
```

**Two non-obvious facts. Get either wrong and the payment fails:**

1. **Sign `tx.messageBytes`, not the full wire transaction.** Openfort signs exactly the
   bytes you hand it, and a Solana signature must cover the *message* (the part after the
   signature array). If you pass the full wire transaction (e.g. via
   `getBase64EncodedWireTransaction`), the signature won't verify and the server rejects it
   with `Transaction did not pass signature verification`.
2. **The return value is a hex signature, not a signed tx.** Decode the hex into the 64-byte
   `SignatureBytes` and attach it under the signer's address.

### 4. The payer

```ts
import { charge } from '@solana/mpp/client'
import { Mppx } from 'mppx/client'

const mpp = Mppx.create({
  polyfill: false,                                  // use mpp.fetch explicitly
  methods: [charge({ signer: openfortSolanaSigner(account), rpcUrl: process.env.SOLANA_RPC_URL })],
})

const response = await mpp.fetch('http://localhost:3010/api/protected')   // 402 → sign → retry, transparently
const receiptHeader = response.headers.get('Payment-Receipt')
const receipt = receiptHeader ? JSON.parse(Buffer.from(receiptHeader, 'base64').toString()) : null
// receipt.reference is the on-chain settlement signature
```

`charge`'s default `broadcast: false` means the client signs and sends the serialized
transaction; the **server** broadcasts and settles. The payer wallet is also the **fee
payer**, so it needs a little SOL even when paying in an SPL token.

## Running it

**devnet (default).** Fund the Openfort wallet's address with devnet SOL
([faucet](https://faucet.solana.com)), set `PAY_TO` to a merchant address and the
`OPENFORT_*` + `MPP_SECRET_KEY` env, start the server, run the payer. Expect `200` + a
`Payment-Receipt`, and on-chain: payer balance down by `price + fee`, recipient up by `price`.

**localnet (offline, no faucet).** Run `solana-test-validator`, point `SOLANA_NETWORK=localnet`
and `SOLANA_RPC_URL=http://127.0.0.1:8899`, and `solana airdrop` to the payer. One caveat
below.

### Gotcha: localnet finalization

A single-node validator finalizes slowly, so a just-issued (`confirmed`) blockhash may not be
in the `finalized` bank yet when the server broadcasts with preflight → the broadcast fails
with `Blockhash not found`. Send with `skipPreflight: true` on a local validator. Devnet and
mainnet finalize steadily and need no change.

## Exact dependency API (pinned)

| package | version | what you use |
|---|---|---|
| `@solana/mpp` | `0.6.0` | `@solana/mpp/server` → `Mppx`, `solana.charge({ recipient, currency, decimals?, network, rpcUrl })`; `@solana/mpp/client` → `charge({ signer, rpcUrl, broadcast? })` |
| `mppx` | `0.6.30` | `mppx/express` → `payment(mpp.charge, { amount, currency })`; `mppx/client` → `Mppx.create({ polyfill, methods })` → `mpp.fetch(url)` |
| `@solana/kit` | `6.9.0` | `address`, `getBase64Decoder`, types `Transaction`/`TransactionPartialSigner`/`SignatureBytes`/`SignatureDictionary` |
| `@openfort/openfort-node` | `0.10.5` | `new Openfort(secret, { walletSecret })` → `accounts.solana.backend.create()` / `.get({ id })` → `account.signTransaction({ transaction })` |

## Verification checklist

- `GET /api/protected` (unpaid) returns `402` with `WWW-Authenticate: Payment … method="solana"`.
- The payer run returns `Status: 200` and a `Payment-Receipt` header.
- The receipt's `reference` is a valid Solana transaction signature (confirm it on-chain).
- Balances moved: payer `− (price + fee)`, recipient `+ price`.

## Switching SOL → USDC

Set `currency` to the USDC SPL mint and `decimals: 6` on the server's `solana.charge`, and
price in USDC base units (e.g. `'10000'` = 0.01 USDC). Fund the payer with USDC (plus a little
SOL for fees). No code changes — currency and decimals flow through the MPP challenge.
