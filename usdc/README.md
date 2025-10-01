# USDC Transfer Demo

## Quick Start

```bash
npx gitpick openfort-xyz/recipes-hub/tree/main/usdc openfort-usdc && cd openfort-usdc
```

## Overview
React Native Expo application demonstrating how to create, fund, and transfer between Openfort embedded wallets using USDC on Ethereum and Base Sepolia. The sample highlights wallet provisioning, faucet funding, and gas-sponsored ERC-20 transfers in a mobile-friendly flow.

## Project Structure
```
usdc/
├── app/               # Expo Router entrypoints and layout
├── components/        # Authentication, onboarding, and transfer screens
├── constants/         # Token and network configuration
├── services/          # Shield recovery helpers and backend stubs
├── utils/             # ERC-20 helpers, config, and formatting utilities
├── assets/            # Fonts, images, and static resources
├── types/             # Shared TypeScript definitions
└── README.md          # Project documentation
```

## Features
- Embedded wallet authentication and provisioning via Openfort Shield
- Dual-wallet management with gas-sponsored USDC transfers
- Faucet integration for Circle’s Sepolia USDC
- Real-time balance polling across Ethereum and Base Sepolia networks
- Wallet switching with responsive UI updates

## Architecture
- **Expo Router (`app/`)** – Wraps the app in `OpenfortProvider` and controls navigation.
- **Screens (`components/`)** – Modular onboarding, faucet, and transfer interfaces.
- **Services & utilities** – ERC-20 functions, environment readers, recovery helpers, and formatting utilities.
- **Constants** – Centralised contract addresses, chain metadata, and transaction signatures.

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI with an iOS Simulator or Android Emulator
- Openfort dashboard project with Shield configuration and provider policy

### Environment Configuration
1. `cp .env.example .env.local`
2. Populate the file with your credentials:
   ```env
   OPENFORT_PROJECT_PUBLISHABLE_KEY=pk_test_your_publishable_key
   OPENFORT_SHIELD_PUBLISHABLE_KEY=pk_test_your_shield_key
   OPENFORT_SHIELD_RECOVERY_BASE_URL=https://your-recovery-api.com
   OPENFORT_ETHEREUM_PROVIDER_POLICY_ID=pol_your_policy_id
   ```

### Install & Run
```bash
npm install
npm start           # Expo dev server
npm run android     # Launch on Android emulator/device
npm run ios         # Launch on iOS simulator
npm run web         # Optional web preview
```

## Usage Flow
1. Start Metro with `npm start`, then launch the app on a simulator or device.
2. Authenticate via Openfort and create two embedded wallets.
3. Use the faucet screen to fund wallets with Sepolia USDC from Circle.
4. Initiate gas-sponsored transfers between wallets and monitor live balances.

## Development
- Follow Expo Router and functional component conventions already in the project.
- Keep Openfort state inside existing providers and contexts.
- Run `npm run lint` (if configured) and monitor Metro logs for runtime warnings.

## Troubleshooting
- **Balance not loading** – Check network connectivity and RPC endpoints.
- **Transfer fails** – Ensure sufficient USDC balance and that the provider policy covers the target chains.
- **Wallet creation errors** – Verify Openfort API keys, Shield configuration, and recovery endpoint reachability.
- **Faucet issues** – Use Circle’s official Sepolia faucet links exposed inside the app.

## Resources
- [Openfort Documentation](https://docs.openfort.io/)
- [Circle USDC Faucet](https://faucet.circle.com/)
- [Ethereum Sepolia Testnet](https://sepolia.etherscan.io/)
- [Expo React Native](https://expo.dev/)
