# Hyperliquid Trading Demo

React Native Expo app demonstrating Openfort embedded wallets with Hyperliquid testnet trading.

## 1. Setup

```bash
pnpx gitpick openfort-xyz/recipes-hub/tree/main/hyperliquid openfort-hyperliquid && cd openfort-hyperliquid
```

## 2. Prerequisites

- Node.js 18+
- iOS Simulator (XCode) or Android Emulator (Android Studio)
- Openfort account with Shield configuration ([Sign up](https://openfort.io))
- **Hyperliquid testnet access** (see step 3)

## 3. Get Hyperliquid Testnet Access

1. Create account at [Hyperliquid](https://app.hyperliquid.xyz/)
2. Deposit at least **5 USDC** on mainnet to unlock testnet access
3. Claim 1000 mock USDC from the [testnet faucet](https://app.hyperliquid-testnet.xyz/drip)
4. Copy your wallet address for the environment configuration

## 4. Backend Setup

This app requires a backend for Shield authentication. Set up the Openfort Backend Quickstart:

```bash
git clone https://github.com/openfort-xyz/openfort-backend-quickstart.git
cd openfort-backend-quickstart
cp .env.example .env
# Add your Openfort credentials to .env
pnpm install
pnpm dev
```

The backend runs on `http://localhost:3000` and exposes the `/api/protected-create-encryption-session` endpoint.

See the [backend repository](https://github.com/openfort-xyz/openfort-backend-quickstart) for detailed instructions.

## 5. Configure Environment

```bash
cp .env.example .env.local
```

Update `.env.local` with your credentials:

```env
OPENFORT_PROJECT_PUBLISHABLE_KEY=pk_test_your_publishable_key
OPENFORT_SHIELD_PUBLISHABLE_KEY=pk_test_your_shield_key
OPENFORT_SHIELD_ENCRYPTION_SHARE=your_shield_encryption_share
OPENFORT_SHIELD_RECOVERY_BASE_URL=http://localhost:3000
OPENFORT_ETHEREUM_PROVIDER_POLICY_ID=pol_your_policy_id
HYPERLIQUID_WALLET_ADDRESS=0xYourWallet
```

## 6. Install & Run

```bash
pnpm install
pnpm start          # Start Expo dev server
pnpm run ios        # Launch on iOS simulator
pnpm run android    # Launch on Android emulator
```

## Features

- Embedded wallet authentication via Openfort Shield
- Hyperliquid testnet integration with live price feeds
- Trade flow for HYPE/USDC pairs
- Real-time balance polling and order placement

## Troubleshooting

- **Balance not loading** – Verify Hyperliquid testnet funds and wallet address
- **Login fails** – Ensure backend is running and `OPENFORT_SHIELD_RECOVERY_BASE_URL` is correct
- **Env not loading** – Restart Metro after editing `.env.local`

## Resources

- [Openfort Docs](https://openfort.io/docs)
- [Hyperliquid Testnet](https://app.hyperliquid-testnet.xyz/drip)
- [Expo React Native](https://expo.dev/)
