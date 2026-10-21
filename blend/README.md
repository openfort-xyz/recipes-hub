# Institutional Earn with Blend

Put a company treasury to work in [Blend](https://blend.money) yield vaults. An [Openfort](https://www.openfort.io) backend wallet holds the treasury's USDC on Base; Blend gives it a self-custodial Safe and allocates the deposit across the vaults of your Blend account type. The app quotes and executes deposits and withdrawals and tracks balance, returns and APY.

Everything runs server-side, and Openfort pays the gas: the treasury holds only USDC, and the Openfort wallet secret and Blend API key never reach the browser.

## Quick start

```bash
pnpx gitpick openfort-xyz/recipes-hub/tree/main/blend openfort-blend && cd openfort-blend
```

## How it works

```text
openfort.accounts.evm.backend.get({ id })   // treasury wallet (EOA, owner of the Blend Safe)
  → blend.lookupAccount / createAccount       // the treasury's Blend account + Safe on Base
  → sessions.createSession + quoteDeposit     // quote: input, output, fees
  → sessions.execute(intentId, { submitActionPlan })
      every plan → openfort.accounts.evm.backend.sendTransaction({ interactions, policy })
      deposit:  approve + deposit, batched in one sponsored transaction
      withdraw: Safe.execTransaction(MultiSend, …) called by the owner, sponsored
  → account.balance / returns, discover.yield // position, returns, APY
```

| Step | Call |
| --- | --- |
| Load treasury wallet | `openfort.accounts.evm.backend.get({ id })` |
| Blend account | `BlendServerSdk.lookupAccount(address)` / `createAccount(address, 8453)` |
| Quote | `client.sessions.createSession()` → `quoteDeposit` / `quoteWithdraw` |
| Execute | `client.sessions.execute(intentId, { signerAddress, submitActionPlan })`; each plan sent with `openfort.accounts.evm.backend.sendTransaction` |
| Track | `client.account.balance()`, `client.account.returns()`, `sdk.discover.yield()` |

## Tech stack

- **Wallet**: [`@openfort/openfort-node`](https://www.npmjs.com/package/@openfort/openfort-node) backend wallet
- **Yield**: [`@blend-money/node`](https://www.npmjs.com/package/@blend-money/node) (server SDK, API key)
- **Gas**: Openfort fee sponsorship (EIP-7702 delegated backend wallet), for deposits and withdrawals
- **Chain**: Base mainnet, native USDC. Blend has no testnet
- **Framework**: Next.js 16 App Router, Tailwind, Biome, pnpm

## Getting started

### Prerequisites

- Node.js 22+ and pnpm
- An [Openfort](https://dashboard.openfort.io) secret key and wallet secret
- Blend portal access: an organization, an account type with vault allocations, and a server API key
- An Openfort gas sponsorship on Base (`pol_...`)
- A treasury backend wallet funded with USDC on Base

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
- [Openfort gasless transactions](https://www.openfort.io/docs/products/server/evm/gasless-transactions)
