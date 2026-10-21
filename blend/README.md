# Institutional Earn with Blend

Put a company treasury to work in [Blend](https://blend.money) yield vaults. An [Openfort](https://www.openfort.io) backend wallet holds the treasury's USDC on Base; Blend gives it a self-custodial Safe and allocates the deposit across the vaults of your Blend account type. The app quotes and executes deposits and withdrawals and tracks balance, returns and APY.

Everything runs server-side: the Openfort wallet secret, the Blend API key and the Pimlico key never reach the browser.

## Quick start

```bash
pnpx gitpick openfort-xyz/recipes-hub/tree/main/blend openfort-blend && cd openfort-blend
```

## How it works

```text
openfort.accounts.evm.backend.get({ id })   // treasury wallet, wrapped as a viem account (toAccount)
  → blend.lookupAccount / createAccount       // the treasury's Blend account + Safe on Base
  → sessions.createSession + quoteDeposit     // quote: input, output, fees
  → sessions.execute(intentId, { submitActionPlan })
      deposit:  approve + deposit, plain txs from the treasury EOA (pays ETH gas)
      withdraw: Safe UserOperations signed by the EOA, sponsored through Pimlico
  → account.balance / returns, discover.yield // position, returns, APY
```

| Step | Call |
| --- | --- |
| Load treasury wallet | `openfort.accounts.evm.backend.get({ id })` + viem `toAccount` |
| Blend account | `BlendServerSdk.lookupAccount(address)` / `createAccount(address, 8453)` |
| Quote | `client.sessions.createSession()` → `quoteDeposit` / `quoteWithdraw` |
| Execute | `client.sessions.execute(intentId, { signerAddress, submitActionPlan })` with Blend's `TransactionHandler` |
| Track | `client.account.balance()`, `client.account.returns()`, `sdk.discover.yield()` |

## Tech stack

- **Wallet**: [`@openfort/openfort-node`](https://www.npmjs.com/package/@openfort/openfort-node) backend wallet
- **Yield**: [`@blend-money/node`](https://www.npmjs.com/package/@blend-money/node) (server SDK, API key)
- **Gas**: Pimlico bundler + paymaster for withdrawals (Blend's default)
- **Chain**: Base mainnet, native USDC. Blend has no testnet
- **Framework**: Next.js 16 App Router, Tailwind, Biome, pnpm

## Getting started

### Prerequisites

- Node.js 22+ and pnpm
- An [Openfort](https://dashboard.openfort.io) secret key and wallet secret
- Blend portal access: an organization, an account type with vault allocations, and a server API key
- A [Pimlico](https://dashboard.pimlico.io) API key
- A treasury backend wallet funded on Base with USDC and a little ETH

### Configuration

```bash
cp .env.example .env.local
```

Fill in every variable; `.env.example` says where each one comes from.

### Run

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000, paste `TREASURY_ADMIN_TOKEN`, click **Load**, then quote and confirm a deposit. This moves real USDC on Base mainnet: start with a small amount.

## Resources

- [Blend docs](https://docs.blend.money/build/overview)
- [Openfort backend wallets](https://www.openfort.io/docs/products/server/accounts)
- [Openfort viem integration](https://www.openfort.io/docs/products/server/evm/viem-integration)
