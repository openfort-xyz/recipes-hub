# Openfort Recipes — Skills Catalog

Quick reference mapping each recipe to the capabilities and integrations it demonstrates.

| Recipe | Skills / Capabilities | Stack |
|--------|----------------------|-------|
| [7702](./7702/) | EIP-7702 authorization, gasless transactions, embedded wallets, Pimlico bundler, smart accounts | Next.js 15, Wagmi, Permissionless SDK, Biome |
| [aave](./aave/) | DeFi lending (Aave), supply/withdraw flows, embedded wallets, Shield authentication | Vite + React, Aave SDK, ESLint |
| [agent-permissions](./agent-permissions/) | Delegated transaction execution, DCA automation, time-limited permissions, Calibur account abstraction (EIP-7702 + EIP-4337), cron jobs | Next.js 15, Upstash Redis, Biome, Vercel Cron |
| [hyperliquid](./hyperliquid/) | Hyperliquid DEX trading, order book, balance polling, embedded wallets on mobile | Expo React Native, Hyperliquid SDK, Ethers.js |
| [lifi](./lifi/) | Cross-chain bridge and swap, multi-chain routing, LiFi SDK integration, embedded wallets | Next.js 15, LiFi SDK, Wagmi, ESLint |
| [morpho](./morpho/) | DeFi vault operations (Morpho Blue), supply/withdraw, WalletConnect, embedded wallets | Vite + React, GraphQL, ESLint |
| [usdc](./usdc/) | USDC transfers, faucet funding, wallet creation, sponsored transactions on mobile | Expo React Native, Openfort React Native SDK |
| [x402](./x402/) | x402 payment protocol, paywall content access, backend wallet management, CDP authentication, Shield sessions | React + Vite (frontend), Express 5 (backend), Biome |

## Common Across All Recipes

- **Openfort Embedded Wallets** — Shield-managed key custody
- **Sponsored Transactions** — Gasless via Openfort paymaster policies
- **TypeScript** — Strict mode across all projects
