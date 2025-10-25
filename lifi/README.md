# Openfort × LiFi Bridge & Swap

Cross-chain bridge and swap using Openfort embedded wallets and LiFi routing.

## 1. Setup

```sh
pnpx gitpick openfort-xyz/recipes-hub/tree/main/lifi openfort-lifi && cd openfort-lifi
```

## 2. Get Credentials

### Openfort

1. Create an account at [dashboard.openfort.io](https://dashboard.openfort.io)
2. Create a new project
3. Navigate to **API Keys** and copy your publishable key
4. Navigate to **Shield** settings and copy your Shield publishable key
5. (Optional) Create a **Policy** for gas sponsorship and copy the policy ID

### LiFi

1. (Optional) Visit [li.fi/developers](https://li.fi/developers)
2. Create an account and generate an API key for higher rate limits
3. Or skip this step to use public endpoints

## 3. Configure Environment

```sh
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```sh
NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_OPENFORT_SHIELD_PUBLISHABLE_KEY=...
NEXT_PUBLIC_OPENFORT_POLICY_ID=pol_...              # Optional
NEXT_PUBLIC_OPENFORT_DEFAULT_CHAIN_ID=11155111      # Sepolia testnet

NEXT_PUBLIC_LIFI_INTEGRATOR=YourAppName
NEXT_PUBLIC_LIFI_API_KEY=...                        # Optional
```

## 4. Install & Start

```sh
pnpm i
pnpm dev
```

## Features

- **Cross-chain swaps** across Ethereum, Polygon, Arbitrum, Optimism, Base, and Avalanche
- **Openfort embedded wallets** with email/social authentication
- **Gas sponsorship** with Openfort policies (optional)
- **Route optimization** with LiFi's routing engine
- **Transaction tracking** with progress monitoring and explorer links
