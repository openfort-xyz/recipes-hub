# Openfort Recipe Hub

This repository contains comprehensive samples demonstrating how to integrate Openfort's embedded wallet infrastructure with popular DeFi protocols and blockchain applications. Each sample showcases different use cases and implementation patterns for building Web3 applications.

## Recipes

| Name | Description | Quick Start |
|------|-------------|-------------|
| **[Yield on Aave](./aave/)** | DeFi lending and borrowing with Aave protocol. Interact with lending pools, manage collateral, and execute transactions with gas sponsorship. | `npx gitpick openfort-xyz/openfort-react/tree/main/examples/quickstarts/aave openfort-aave && cd openfort-aave` |
| **[Trade on Hyperliquid](./hyperliquid/)** | Mobile trading on Hyperliquid's DEX. Combines embedded wallets with perpetual trading, real-time price feeds, and order management. | `npx gitpick openfort-xyz/openfort-react/tree/main/examples/quickstarts/hyperliquid openfort-hyperliquid && cd openfort-hyperliquid` |
| **[Swap on LiFi](./lifi/)** | Cross-chain bridge and swap flows with LiFi routing engine. Multi-chain support across Ethereum, Polygon, Arbitrum, Optimism, Base, and Avalanche. | `npx gitpick openfort-xyz/recipes-hub/tree/main/lifi openfort-lifi && cd openfort-lifi` |
| **[Yield on Morpho](./morpho/)** | Interact with Morpho Blue lending vaults on Base. Supply/withdraw operations with yield optimization strategies. | `npx gitpick openfort-xyz/openfort-react/tree/main/examples/quickstarts/morpho openfort-morpho && cd openfort-morpho` |
| **[USDC Transfer](./usdc/)** | Basic ERC-20 token transfers with embedded wallets. Perfect for understanding wallet creation, faucet integration, and gasless transactions. | `npx gitpick openfort-xyz/openfort-react/tree/main/examples/quickstarts/usdc openfort-usdc && cd openfort-usdc` |

## Getting Started

Each sample is completely self-contained with its own setup instructions, environment configuration, and dependencies. Navigate to any sample directory and follow the `README.md` for detailed setup instructions.

1. **Environment Configuration** - Copy `.env.example` to `.env.local` and configure Openfort credentials
2. **Install Dependencies** - Run `npm install` in respective directories
3. **Start Development** - Use `npm run dev` for web or `npm start` for mobile
4. **Configure Openfort Dashboard** - Set up gas policies, Shield keys, and recovery endpoints

### Prerequisites
- **Node.js** 18+ and npm/yarn
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

