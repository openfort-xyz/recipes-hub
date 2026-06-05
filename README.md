# Openfort Recipe Hub

This repository contains comprehensive samples demonstrating how to integrate Openfort's embedded wallet infrastructure with popular DeFi protocols and blockchain applications.

## Recipes

| Name                                                           | Description                                                                                                                                        | Quick Start                                                                                                   |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **[Yield on Aave](./aave/)**                                   | DeFi lending and borrowing with Aave protocol. Interact with lending pools, manage collateral, and execute transactions with gas sponsorship.      | `pnpx gitpick openfort-xyz/recipes-hub/tree/main/aave openfort-aave && cd openfort-aave`                      |
| **[Trade on Hyperliquid](./hyperliquid/)**                     | Mobile trading on Hyperliquid's DEX. Combines embedded wallets with perpetual trading, real-time price feeds, and order management.                | `pnpx gitpick openfort-xyz/recipes-hub/tree/main/hyperliquid openfort-hyperliquid && cd openfort-hyperliquid` |
| **[Swap on LiFi](./lifi/)**                                    | Cross-chain bridge and swap flows with LiFi routing engine. Multi-chain support across Ethereum, Polygon, Arbitrum, Optimism, Base, and Avalanche. | `pnpx gitpick openfort-xyz/recipes-hub/tree/main/lifi openfort-lifi && cd openfort-lifi`                      |
| **[Swap on NEAR Intents](./near-intents/)**                    | Cross-chain swaps from an Openfort embedded wallet via the NEAR Intents 1Click API. EVM origin, any-chain destination — including Solana, Bitcoin, and Dogecoin. | `pnpx gitpick openfort-xyz/recipes-hub/tree/main/near-intents openfort-near-intents && cd openfort-near-intents` |
| **[Yield on Morpho](./morpho/)**                               | Interact with Morpho Blue lending vaults on Base. Supply/withdraw operations with yield optimization strategies.                                   | `pnpx gitpick openfort-xyz/recipes-hub/tree/main/morpho openfort-morpho && cd openfort-morpho`                |
| **[USDC Transfer](./usdc/)**                                   | Basic ERC-20 token transfers with embedded wallets. Perfect for understanding wallet creation, faucet integration, and gasless transactions.       | `pnpx gitpick openfort-xyz/recipes-hub/tree/main/usdc openfort-usdc && cd openfort-usdc`                      |
| **[Backend permissions](./agent-permissions/)**                               | Setup a wallet permissions that automatically DCA on Morpho completely non-custodial.                                   | `pnpx gitpick openfort-xyz/recipes-hub/tree/main/morpho openfort-morpho && cd openfort-morpho`                |
| **[7702 delegation](./7702/)** | Openfort EIP-7702 authorization recipe with gas sponsorship.                                                          | `pnpx gitpick openfort-xyz/recipes-hub/tree/main/7702 openfort-7702 && cd openfort-7702`                      |
| **[x402 on Base](./x402/)**                                    | Embedded wallet and Bakcned wallet x402 payment integration. Demonstrates content paywalls with USDC payments using gas sposnsorship and facilitator.  | `pnpx gitpick openfort-xyz/recipes-hub/tree/main/x402 openfort-x402 && cd openfort-x402`                      |
| **[MPP on Tempo](./mpp/)**                                      | Backend-wallet MPP (Machine Payments Protocol) agent. An AI agent funds itself with PathUSD and autonomously pays for an HTTP `402` service, settling on the Tempo testnet — Openfort signs every payment.  | `pnpx gitpick openfort-xyz/recipes-hub/tree/main/mpp openfort-mpp && cd openfort-mpp`                      |
| **[MPP on Solana](./mpp-solana/)**                           | Machine Payments Protocol (MPP) paywall on Solana. An agent pays an HTTP 402 resource from an Openfort backend Solana wallet; the server settles on-chain with no facilitator. Includes a from-scratch [integration guide](./mpp-solana/INTEGRATION.md). | `pnpx gitpick openfort-xyz/recipes-hub/tree/main/mpp-solana openfort-mpp-solana && cd openfort-mpp-solana` |

## Getting Started

Each sample is completely self-contained with its own setup instructions, environment configuration, and dependencies. Navigate to any sample directory and follow the `README.md` for detailed setup instructions.

## Stack Overview

| Sample                  | Frontend     | Backend    | Blockchain        | Key Libraries                                        |
| ----------------------- | ------------ | ---------- | ----------------- | ---------------------------------------------------- |
| **Aave**                | React + Vite | Express.js | Ethereum          | `@aave/react`, `wagmi`, `viem`                       |
| **Hyperliquid**         | React Native | -          | Arbitrum Sepolia  | `@nktkas/hyperliquid`, `@openfort/react-native`      |
| **LiFi**                | Next.js 15   | -          | Multi-chain       | `@lifi/sdk`, `@lifi/wallet-management`, `wagmi`      |
| **NEAR Intents**        | Next.js 15   | -          | Multi-chain       | `@openfort/react`, `wagmi`, `viem`                   |
| **Morpho**              | React + Vite | Express.js | Base              | `wagmi`, `viem`, `graphql-request`                   |
| **USDC**                | React Native | -          | Ethereum Sepolia  | `@openfort/react-native`, `expo`                     |
| **7702** | Next.js 15   | -          | Ethereum Sepolia  | `@openfort/react`, `viem`, `wagmi` |
| **x402 son Base**                | React + Vite | Node.js    | Base/Base-Sepolia | `@openfort/react`, `wagmi`, `viem`                   |
| **MPP on Tempo**                 | Next.js 16   | Next.js    | Tempo Testnet     | `@openfort/openfort-node`, `mppx`, `ox`, `viem`     |
| **MPP on Solana**       | Node CLI + web | Node.js  | Solana (devnet)   | `@solana/mpp`, `mppx`, `@solana/kit`, `@openfort/openfort-node` |

