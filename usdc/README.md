# USDC Transfer Demo

React Native Expo app demonstrating embedded wallet creation, funding, and USDC transfers on Ethereum and Base Sepolia using Openfort Shield.

## 1. Setup

```sh
pnpx gitpick openfort-xyz/recipes-hub/tree/main/usdc openfort-usdc && cd openfort-usdc
```

## 2. Prerequisites

- XCode for iOS with iOS Simulator
- Android Studio for Android with Android Emulator (if targeting Android)
- Node.js 22+
- Openfort account with Shield configuration and a fee sponsorship policy

## 3. Backend Setup

Set up the backend server required for Openfort Shield authentication:

```sh
git clone https://github.com/openfort-xyz/openfort-backend-quickstart.git
cd openfort-backend-quickstart
cp .env.example .env
# Add your Openfort credentials to .env
pnpm install
pnpm dev
```

The backend runs on `http://localhost:3000` and provides the `/api/protected-create-encryption-session` endpoint. See the [Openfort Backend Quickstart](https://github.com/openfort-xyz/openfort-backend-quickstart) for details.

## 4. Configure Environment

```sh
cp .env.example .env.local
```

Add your Openfort credentials to `.env.local`:

```env
OPENFORT_PUBLISHABLE_KEY=pk_test_your_publishable_key
OPENFORT_SHIELD_PUBLISHABLE_KEY=your_shield_publishable_key
OPENFORT_SHIELD_RECOVERY_BASE_URL=http://localhost:3000  # use your LAN IP or a tunnel on a physical device
OPENFORT_FEE_SPONSORSHIP_ID=pol_your_policy_id  # optional, sponsors gas
```

## 5. Install & Run

```sh
pnpm install
pnpm run ios     # Launch on iOS simulator
pnpm run android # Launch on Android emulator
```

## Usage

1. Authenticate and create two embedded wallets
2. Fund wallets with Sepolia USDC from Circle's faucet
3. Transfer USDC between wallets with gas sponsorship

## Resources

- [Openfort Documentation](https://openfort.io/docs)
- [Circle USDC Faucet](https://faucet.circle.com/)
