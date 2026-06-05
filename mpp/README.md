# MPP Agent Demo

A demo application showcasing [MPP](https://machinepayments.dev) (Machine Payments Protocol) with [Openfort](https://www.openfort.io) backend wallets.

An AI agent gets its own Openfort backend wallet, is funded with PathUSD from an app treasury, and then autonomously pays for an HTTP service using MPP — signing every payment with Openfort and settling on the Tempo blockchain.

## Quick start

```bash
pnpx gitpick openfort-xyz/recipes-hub/tree/main/mpp openfort-mpp && cd openfort-mpp
```

## What is MPP?

[MPP](https://machinepayments.dev) enables machine-to-machine payments over HTTP. When a service requires payment it returns `402 Payment Required` with the payment details. The client signs a payment credential and retries the request. Settlement happens on the Tempo blockchain using PathUSD.

## What this demo shows

1. **Agent creation** — create an AI agent with its own EVM wallet via `openfort.accounts.evm.backend.create()`
2. **Wallet funding** — transfer PathUSD to the agent from an app-level treasury wallet
3. **MPP payments** — the agent autonomously pays for a service and settles on Tempo

## Demo flow

1. Click **Create Agent** → creates an Openfort backend wallet
2. Pick **$0.10**, **$0.50**, or **$1.00** to deposit into the agent's wallet
3. Run an action:
   - **Fetch Weather** ($0.10) — the agent pays via MPP

## How Openfort fits in

Tempo is not a chain Openfort indexes, so Openfort is used purely as a **remote signer** — it holds the keys and signs, while viem/mppx broadcast directly to the Tempo RPC. Every signing primitive maps to the `@openfort/openfort-node` backend-wallet API:

| Step | Openfort call |
| ---- | ------------- |
| Create agent wallet | `openfort.accounts.evm.backend.create()` |
| Load treasury wallet | `openfort.accounts.evm.backend.get({ id })` |
| Sign MPP payment credential | `account.sign({ hash })` |
| Sign message / typed data | `account.signMessage(...)` / `account.signTypedData(...)` |

`lib/openfort-account.ts` wraps an Openfort backend wallet as a viem account, so both the agent (MPP payments) and the treasury (funding transfers) sign through Openfort while broadcasting to Tempo.

## Tech stack

- **Protocol**: [MPP](https://machinepayments.dev) — Machine Payments Protocol
- **Wallets**: [`@openfort/openfort-node`](https://www.npmjs.com/package/@openfort/openfort-node) — server-side backend wallets
- **MPP SDK**: [`mppx`](https://www.npmjs.com/package/mppx) — client and server middleware
- **Blockchain**: Tempo testnet (Moderato) with PathUSD, via `viem`'s native Tempo support
- **Framework**: Next.js with App Router
- **Tooling**: Biome, pnpm

## Getting started

### Prerequisites

- Node.js 18+ and pnpm
- An [Openfort](https://dashboard.openfort.io) account with a secret key and wallet secret
- A treasury backend wallet funded with PathUSD on the Tempo testnet

### Configuration

```bash
cp .env.example .env.local
```

Fill in your credentials:

```env
OPENFORT_SECRET_KEY=sk_test_...
OPENFORT_WALLET_SECRET=...
TREASURY_WALLET_ID=acc_...        # backend wallet pre-funded with PathUSD on Tempo
MPP_RECIPIENT=0x...               # Tempo address that receives payments
```

To create and fund a treasury wallet:

```ts
import Openfort from '@openfort/openfort-node'
const openfort = new Openfort(process.env.OPENFORT_SECRET_KEY, {
  walletSecret: process.env.OPENFORT_WALLET_SECRET,
})
const treasury = await openfort.accounts.evm.backend.create()
console.log(treasury.id, treasury.address) // set TREASURY_WALLET_ID, then fund the address
```

Send PathUSD to `treasury.address` from the [Tempo faucet](https://machinepayments.dev), then set `TREASURY_WALLET_ID`.

### Run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## How MPP works

```
┌─────────────────┐                    ┌─────────────────┐
│   AI Agent      │ ── GET /weather ──▶│   MPP Service   │
│  (Openfort      │                    │                 │
│   wallet)       │◀── 402 + payment ──│                 │
│                 │    requirements    │                 │
│                 │ ── GET /weather ──▶│                 │
│                 │    + payment       │                 │
│                 │    credential      │                 │
│                 │◀── 200 + data ─────│                 │
└─────────────────┘                    └─────────────────┘
```

1. The agent requests a resource
2. The service returns `402 Payment Required` with payment details
3. The mppx client signs a payment credential with the agent's Openfort wallet
4. The agent retries with the signed credential
5. The service verifies the credential, settles on Tempo, and returns the data

## Key files

- `lib/openfort.ts` — Openfort client (lazy init) and wallet management
- `lib/openfort-account.ts` — wraps an Openfort backend wallet as a viem account
- `lib/mpp-client.ts` — MPP fetch wrapper that signs with Openfort
- `lib/treasury.ts` — funds an agent wallet with PathUSD over Tempo
- `lib/network.ts` — Tempo testnet configuration
- `app/api/agent/` — agent create / fund / execute / balance routes
- `app/api/mock-services/weather/` — the MPP-protected service

## Notes

- `mppx@0.3.6` is pinned to match the version this demo is built against; newer releases are marked deprecated upstream and may change the API.
- The treasury funds the agent over Tempo using viem's native Tempo support (`viem/chains` → `tempoModerato`, `viem/tempo` → `Actions.token.transfer`); Openfort signs but does not broadcast. If your Tempo deployment differs, fund the agent wallet directly from the faucet — the agent's MPP payment path is unaffected.

## Learn more

- [Openfort backend wallets](https://www.openfort.io/docs)
- [`@openfort/openfort-node`](https://www.npmjs.com/package/@openfort/openfort-node)
- [MPP Protocol](https://machinepayments.dev)
- [`mppx` SDK](https://www.npmjs.com/package/mppx)

## License

MIT
