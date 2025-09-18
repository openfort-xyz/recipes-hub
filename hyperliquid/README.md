# Hyperliquid Trading Demo

An Expo React Native application that showcases how to combine Openfort's embedded wallets with Hyperliquid's testnet exchange. This sample mirrors the structure of the `@usdc-transfer` app: a clean provider setup, modular onboarding flow, and well-organised utilities/constants for easier navigation.

## Features

- 🔐 **Embedded Wallet Auth** – Sign in with Openfort (guest or OAuth) and create a testnet wallet.
- 📈 **Live HYPE/USDC Pricing** – Poll Hyperliquid's testnet price feed with a lightweight chart.
- 💱 **Trade Actions** – Place basic market-side buy/sell orders for HYPE against USDC.
- 💸 **Balance Overview** – Track on-chain wallet USDC alongside Hyperliquid account balances.
- 🌉 **Funds Transfer Stub** – Template for wiring USDC from the wallet to Hyperliquid (fill in when backend is ready).
- 🧱 **Shared Project Layout** – Same folders and utilities (`constants/`, `services/`, `utils/`) as the USDC sample for quick orientation.

## Architecture

### Core Screens
- **`app/_layout.tsx`** – Wraps the app in `OpenfortProvider` with environment-driven configuration.
- **`components/LoginScreen.tsx`** – Guest or OAuth login entry point.
- **`components/onboarding/CreateWalletScreen.tsx`** – Step 1: provision an embedded wallet.
- **`components/onboarding/FundHyperliquidScreen.tsx`** – Step 2: confirm wallet/exchange balances before trading.
- **`components/MainAppScreen.tsx`** – Guided swap flow that ends with a USDC ↔︎ HYPE trade (overview → choose direction → amount → confirm → result).

### Supporting Modules
- **`constants/network.ts`** – Typed Arbitrum Sepolia chain metadata.
- **`constants/hyperliquid.ts`** – Hyperliquid asset identifiers, RPC endpoints, and poll intervals.
- **`services/walletRecovery.ts`** – Helper for retrieving Shield encryption sessions (same pattern as USDC sample).
- **`services/HyperliquidClient.ts`** – Hooks and helpers for price data, balances, and sample order wiring.
- **`utils/config.ts`** – Runtime accessors for Expo `extra` values with helpful error messages.
- **`utils/transactions.ts`** – UI-friendly wrappers around buy/sell/transfer flows.

## Setup

### 1. Hyperliquid Prerequisites

Before running this sample, you need to set up Hyperliquid testnet access:

1. **Login to Hyperliquid**: Create an account and login at [Hyperliquid](https://app.hyperliquid.xyz/)

2. **Deposit USDC on Mainnet**: You must deposit at least **5 USDC** on the Hyperliquid mainnet to gain access to the testnet faucet

3. **Get Testnet Funds**: Once you have deposited 5 USDC on mainnet, claim 1000 mock USDC from the testnet faucet at: https://app.hyperliquid-testnet.xyz/drip

4. **Note Your Wallet Address**: Copy the address of your logged-in Hyperliquid wallet for the next step

### 2. Environment Variables

```bash
cp .env.example .env.local
```

Populate the new file with your Openfort credentials and Hyperliquid wallet address:

```env
OPENFORT_PROJECT_PUBLISHABLE_KEY=pk_test_your_publishable_key
OPENFORT_SHIELD_PUBLISHABLE_KEY=pk_test_your_shield_key
OPENFORT_SHIELD_ENCRYPTION_KEY=shield_encryption_key
OPENFORT_SHIELD_RECOVERY_BASE_URL=https://your-recovery-api.com
OPENFORT_ETHEREUM_PROVIDER_POLICY_ID=pol_your_policy_id
HYPERLIQUID_WALLET_ADDRESS=your_wallet_address_here
```

### 3. Install & Run

```bash
npm install
npm start        # Expo dev server
npm run ios      # iOS simulator (requires Xcode)
npm run android  # Android emulator
npm run web      # Web preview
```

## Hyperliquid Integration Notes

- The demo uses Hyperliquid's **testnet transports** via the official SDK.
- Asset constants (e.g., `HYPE_MARKET_ID`) live in `constants/hyperliquid.ts` for reuse.
- The `transfer` helper is currently a stub – extend it with your backend flow once ready.
- Price polling defaults to 3 seconds; tweak `PRICE_POLL_INTERVAL_MS` as needed.

## Openfort Configuration

Ensure the following in the Openfort dashboard:

1. **Project & Publishable Keys** – Required for authentication.
2. **Shield** – Configure Shield keys and recovery endpoint (used by `getEncryptionSessionFromEndpoint`).
3. **Gas Policy (optional)** – Add `OPENFORT_ETHEREUM_PROVIDER_POLICY_ID` for sponsored transactions.

## Project Layout Snapshot

```
hyperliquid/
├── app/
│   ├── _layout.tsx
│   └── index.tsx
├── components/
│   ├── LoginScreen.tsx
│   ├── MainAppScreen.tsx
│   ├── UserScreen.tsx
│   └── onboarding/
│       ├── CreateWalletScreen.tsx
│       └── FundHyperliquidScreen.tsx
├── constants/
│   ├── hyperliquid.ts
│   └── network.ts
├── services/
│   ├── HyperliquidClient.ts
│   └── walletRecovery.ts
├── utils/
│   ├── config.ts
│   └── transactions.ts
└── entrypoint.ts
```

## Next Steps

- Flesh out the `transfer` helper with your custody/backend logic.
- Add more granular error handling and confirmations around trade execution.
- Layer additional Hyperliquid endpoints (order history, positions) into dedicated hooks.

Happy hacking! 🚀
