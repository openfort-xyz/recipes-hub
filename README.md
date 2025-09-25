# Openfort Recipe Hub

This repository contains comprehensive samples demonstrating how to integrate Openfort's embedded wallet infrastructure with popular DeFi protocols and blockchain applications. Each sample showcases different use cases and implementation patterns for building Web3 applications.

## Recipes

### [Yield on Aave](./aave/)
- **Languages:** TypeScript, React, Node.js
- **Stack:** Vite + React frontend, Express.js backend
- **Purpose:** Demonstrates DeFi lending and borrowing operations using Openfort embedded wallets with the Aave protocol. Shows how to interact with lending pools, manage collateral, and execute DeFi transactions with gas sponsorship.

### [Trade on Hyperliquid](./hyperliquid/)
- **Languages:** TypeScript, React Native
- **Stack:** Expo React Native
- **Purpose:** Mobile trading application for Hyperliquid's decentralized exchange. Demonstrates how to combine Openfort's embedded wallets with perpetual trading, real-time price feeds, and order management.

### [Yield on Morpho](./morpho/)
- **Languages:** TypeScript, React, Node.js
- **Stack:** Vite + React frontend, Express.js backend
- **Purpose:** Web application for interacting with Morpho Blue lending vaults on Base. Shows vault supply/withdrawal operations with yield optimization strategies.

### [USDC Transfer](./usdc/)
- **Languages:** TypeScript, React Native
- **Stack:** Expo React Native
- **Purpose:** Mobile application demonstrating basic ERC-20 token transfers using Openfort's embedded wallet infrastructure. Perfect for understanding wallet creation, faucet integration, and gasless transactions.

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
| **Morpho** | React + Vite | Express.js | Base | `wagmi`, `viem`, `graphql-request` |
| **USDC** | React Native | - | Ethereum Sepolia | `@openfort/react-native`, `expo` |

