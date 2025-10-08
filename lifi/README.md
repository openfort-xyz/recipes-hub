# Openfort Cross-Chain Bridge & Swap Demo

A LiFi-powered cross-chain bridge experience backed by Openfort embedded wallets. This demo showcases how to pair Openfort's authentication and wallet orchestration with LiFi's routing engine to deliver gasless, multi-chain swaps inside a polished Next.js front end.

## Highlights

- **Openfort Embedded Wallets** – Email/social sign-in, custodial key management, and automatic wallet orchestration through `@openfort/react`.
- **LiFi Routing** – Cheapest-route discovery, cross-chain swaps, and execution management on Ethereum, Polygon, Arbitrum, Optimism, Base, and Avalanche.
- **Smart UX** – Guided route selection, execution progress tracking, resume/stop background execution, and explorer deep-links for every transaction.
- **Wagmi Integration** – Unified EVM connectivity and balance lookups through the Openfort-provisioned wagmi config.

## Getting Started

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment variables

Create `.env.local` (copy from `.example.env` if you have one) and provide the following values:

```bash
NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY=pk_your_openfort_publishable_key
NEXT_PUBLIC_OPENFORT_SHIELD_PUBLISHABLE_KEY=shield_pk_from_dashboard
NEXT_PUBLIC_OPENFORT_POLICY_ID=policy_id_for_sponsored_txs
NEXT_PUBLIC_OPENFORT_DEFAULT_CHAIN_ID=11155111
NEXT_PUBLIC_LIFI_API_KEY=optional_lifi_api_key
```

You can generate the Openfort keys from the [Openfort dashboard](https://dashboard.openfort.io) and create a LiFi API key from the [LiFi developer portal](https://developers.lifi.io/).

### 3. Run the app

```bash
bun dev
# http://localhost:3000
```

## Key Components

- **`src/lib/providers.tsx`** – Wraps the app with `OpenfortProvider`, wagmi, React Query, and LiFi context.
- **`src/components/MultiChainSwap.tsx`** – Core swap flow: chain/token selection, route discovery, execution lifecycle, and LiFi background management.
- **`src/components/SwapForm.tsx`** – Chain/token pickers with balance lookups via wagmi `useBalance`.
- **`src/components/ActionButtons.tsx`** – Context-aware controls that surface `OpenfortButton` for authentication and action buttons once connected.
- **`src/components/openfort/connect-button.tsx`** – Header-level connect/sign-out control backed by Openfort status hooks.

## Technology Stack

- **Openfort React SDK (`@openfort/react`)** for authentication, wallet management, and UI primitives.
- **LiFi SDK (`@lifi/sdk`)** for cross-chain routing, execution, and chain metadata.
- **wagmi + viem** for EVM connectivity, balance queries, and chain switching.
- **React Query (`@tanstack/react-query`)** for data fetching and mutation orchestration.
- **Next.js 15 / React 19** with Tailwind-styled UI components.

## Useful Resources

- [Openfort Embedded Wallet Docs](https://www.openfort.io/docs/products/embedded-wallet/react)
- [LiFi Developer Docs](https://developers.lifi.io/)
- [Openfort Dashboard](https://dashboard.openfort.io/)

Happy building! If you ship something with this stack, let us know at [@openfort_xyz](https://x.com/openfort_xyz).
