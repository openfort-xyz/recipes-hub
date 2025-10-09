# Openfort × LiFi Sample

## Quick Start

```bash
npx gitpick openfort-xyz/recipes-hub/tree/main/lifi openfort-lifi && cd openfort-lifi
```

## Overview
This sample demonstrates how to pair Openfort's embedded wallet infrastructure with LiFi's cross-chain routing engine to build a full-stack bridge and swap experience. A Next.js frontend leverages Openfort authentication and wallet orchestration alongside LiFi's SDK to enable gasless, multi-chain swaps across Ethereum, Polygon, Arbitrum, Optimism, Base, and Avalanche.

## Project Structure
```
lifi/
├── src/                        # Next.js application source code
│   ├── app/                    # App Router pages, layout, and providers
│   │   ├── layout.tsx          # Root layout with theme and navigation
│   │   ├── page.tsx            # Main swap interface page
│   │   └── providers.tsx       # Openfort, wagmi, React Query, and LiFi context setup
│   ├── features/               # Feature-based modules
│   │   ├── lifi/               # LiFi swap and bridge functionality
│   │   │   ├── components/     # Swap UI components (SwapFlow, SwapForm, ActionButtons, etc.)
│   │   │   ├── hooks/          # Swap controller and state management
│   │   │   ├── providers/      # LiFi provider configuration
│   │   │   ├── services/       # LiFi SDK config and route services
│   │   │   └── utils/          # Token helpers and utilities
│   │   └── openfort/           # Openfort wallet integration
│   │       ├── components/     # Connect button and logo
│   │       ├── config/         # Wagmi configuration
│   │       ├── hooks/          # Openfort wallet hooks
│   │       └── providers/      # Openfort provider boundary
│   ├── components/             # Shared UI components
│   │   ├── ui/                 # Reusable UI primitives (button, card, dialog, etc.)
│   │   └── header.tsx          # Navigation and theme components
│   └── lib/                    # Shared utilities
└── README.md                   # Project documentation
```

## Features
- Openfort embedded wallet authentication with email/social sign-in and custodial key management
- LiFi cross-chain routing with cheapest-route discovery and execution management
- Multi-chain swap support across Ethereum, Polygon, Arbitrum, Optimism, Base, and Avalanche
- Guided route selection with execution progress tracking and resume/stop controls
- Wagmi integration for unified EVM connectivity and balance lookups
- Explorer deep-links for every transaction

## Architecture
- **App Router (`src/app/`)** – Next.js 15 application with App Router, providers setup in `providers.tsx`, and main swap page.
- **Features (`src/features/`)** – Feature-based architecture separating LiFi swap functionality from Openfort wallet integration.
- **LiFi Module (`src/features/lifi/`)** – Complete swap flow with components, hooks, services, and LiFi SDK configuration.
- **Openfort Module (`src/features/openfort/`)** – Wallet integration with wagmi config, connection components, and provider boundaries.
- **Shared Components (`src/components/`)** – Reusable UI components and shared utilities.
- **Environment Configuration** – Environment variables keep Openfort credentials, Shield keys, policy identifiers, and LiFi API access aligned.

## Setup

### Prerequisites
- Node.js 18 or newer
- npm, yarn, or bun
- Openfort dashboard project with Shield credentials and optional policy ID
- Optional LiFi API key from the developer portal

### Environment Configuration
1. `cp .env.example .env.local` (if `.env.example` exists, otherwise create `.env.local`)
2. Populate the file with your credentials:
   ```env
   NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY=pk_your_openfort_publishable_key
   NEXT_PUBLIC_OPENFORT_SHIELD_PUBLISHABLE_KEY=shield_pk_from_dashboard
   NEXT_PUBLIC_OPENFORT_POLICY_ID=policy_id_for_sponsored_txs
   NEXT_PUBLIC_OPENFORT_DEFAULT_CHAIN_ID=11155111
   NEXT_PUBLIC_LIFI_API_KEY=optional_lifi_api_key
   NEXT_PUBLIC_LIFI_INTEGRATOR=Recipe
   ```
   - Generate Openfort keys from the [Openfort dashboard](https://dashboard.openfort.io)
   - Create a LiFi API key from the [LiFi developer portal](https://developers.lifi.io/) (optional)

### Install & Run
```bash
npm install        # or yarn install / bun install
npm run dev        # or yarn dev / bun dev
# http://localhost:3000
```

## Usage Flow
1. Start the Next.js development server.
2. Authenticate through Openfort Shield from the web app.
3. Select source and destination chains and tokens.
4. Review route options discovered by LiFi's routing engine.
5. Execute the swap with automatic gas sponsorship and progress tracking.
6. Resume or stop background execution as needed; view transaction details via explorer links.

## Development
- **Scripts** – `npm run dev` (development), `npm run build` (production build), `npm start` (production server).
- Keep React components functional and prefer hooks for shared logic.
- Maintain Tailwind class conventions from existing components.
- Test multi-chain flows across different network combinations.

## Troubleshooting
- **Authentication failures** – Ensure valid Openfort Shield keys and policy IDs are set in `.env.local`.
- **Route discovery errors** – Verify LiFi API key is valid or omit it to use public endpoints.
- **Balance not loading** – Check network connectivity and ensure wagmi providers are properly configured.
- **Transaction stuck** – Use LiFi's resume functionality or verify chain RPC endpoints are responsive.
- **CORS errors** – Ensure environment variables match the deployment host.

## Resources
- [Openfort Documentation](https://docs.openfort.io)
- [Openfort Embedded Wallet Docs](https://www.openfort.io/docs/products/embedded-wallet/react)
- [LiFi Developer Docs](https://developers.lifi.io/)
- [Openfort Dashboard](https://dashboard.openfort.io/)
