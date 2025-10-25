# Openfort Recipe Hub

This repository contains comprehensive samples demonstrating how to integrate Openfort's embedded wallet infrastructure with popular DeFi protocols and blockchain applications. Each sample showcases different use cases and implementation patterns for building Web3 applications.

## Recipes

| Name | Description | Quick Start |
|------|-------------|-------------|
| **[Yield on Aave](./aave/)** | DeFi lending and borrowing with Aave protocol. Interact with lending pools, manage collateral, and execute transactions with gas sponsorship. | `pnpx gitpick openfort-xyz/openfort-react/tree/main/examples/quickstarts/aave openfort-aave && cd openfort-aave` |
| **[Trade on Hyperliquid](./hyperliquid/)** | Mobile trading on Hyperliquid's DEX. Combines embedded wallets with perpetual trading, real-time price feeds, and order management. | `pnpx gitpick openfort-xyz/openfort-react/tree/main/examples/quickstarts/hyperliquid openfort-hyperliquid && cd openfort-hyperliquid` |
| **[Swap on LiFi](./lifi/)** | Cross-chain bridge and swap flows with LiFi routing engine. Multi-chain support across Ethereum, Polygon, Arbitrum, Optimism, Base, and Avalanche. | `pnpx gitpick openfort-xyz/recipes-hub/tree/main/lifi openfort-lifi && cd openfort-lifi` |
| **[Yield on Morpho](./morpho/)** | Interact with Morpho Blue lending vaults on Base. Supply/withdraw operations with yield optimization strategies. | `pnpx gitpick openfort-xyz/openfort-react/tree/main/examples/quickstarts/morpho openfort-morpho && cd openfort-morpho` |
| **[USDC Transfer](./usdc/)** | Basic ERC-20 token transfers with embedded wallets. Perfect for understanding wallet creation, faucet integration, and gasless transactions. | `pnpx gitpick openfort-xyz/recipes-hub/tree/main/usdc openfort-usdc && cd openfort-usdc` |
| **[Permissionless 7702](./7702/)** | Openfort + Permissionless EIP-7702 authorization recipe with gas sponsorship via Pimlico. | `pnpx gitpick openfort-xyz/recipes-hub/tree/main/7702 openfort-permissionless-7702 && cd openfort-permissionless-7702` |
| **[x402 Paywall](./x402/)** | End-to-end x402 payment protocol integration with Openfort smart accounts. Demonstrates content paywalls with USDC payments on Base/Base-Sepolia. | `pnpx gitpick openfort-xyz/recipes-hub/tree/main/x402 openfort-x402 && cd openfort-x402` |

## Getting Started

Each sample is completely self-contained with its own setup instructions, environment configuration, and dependencies. Navigate to any sample directory and follow the `README.md` for detailed setup instructions.

1. **Environment Configuration** - Copy `.env.example` to `.env.local` and configure Openfort credentials
2. **Install Dependencies** - Run `pnpm install` in respective directories
3. **Start Development** - Use `pnpm run dev` for web or `pnpm start` for mobile
4. **Configure Openfort Dashboard** - Set up gas policies, Shield keys, and recovery endpoints

### Prerequisites
- **Node.js** 18+ and pnpm
- **Openfort Dashboard Account** with configured API keys
- **Platform-specific tools:**
  - For mobile samples: Expo CLI, iOS Simulator/Android Emulator
  - For web samples: Modern web browser

## Stack Overview

| Sample | Frontend | Backend | Blockchain | Key Libraries |
|--------|----------|---------|------------|---------------|
| **Aave** | React + Vite | Express.js | Ethereum | `@aave/react`, `wagmi`, `viem` |
| **Hyperliquid** | React Native | - | Arbitrum Sepolia | `@nktkas/hyperliquid`, `@openfort/react-native` |
| **LiFi** | Next.js 15 | - | Multi-chain | `@lifi/sdk`, `@lifi/wallet-management`, `wagmi` |
| **Morpho** | React + Vite | Express.js | Base | `wagmi`, `viem`, `graphql-request` |
| **USDC** | React Native | - | Ethereum Sepolia | `@openfort/react-native`, `expo` |
| **Permissionless 7702** | Next.js 15 | - | Ethereum Sepolia | `@openfort/react`, `permissionless`, `viem`, `wagmi` |
| **x402** | React + Vite | Node.js | Base/Base-Sepolia | `@openfort/react`, `wagmi`, `viem` |

