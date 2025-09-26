# Openfort × Morpho Sample

## Quick Start

```bash
npx gitpick openfort-xyz/openfort-react/tree/main/examples/quickstarts/morpho openfort-morpho && cd openfort-morpho
```

## Overview
This sample pairs an Openfort embedded wallet frontend with a minimal Express backend to interact with a Morpho Blue USDC vault on Base. Users can authenticate through Shield, view balances, and supply or withdraw USDC from the configured vault using sponsored transactions.

## Project Structure
```
morpho/
├── backend/                    # Express server exposing Shield helpers and health checks
│   ├── .env.example            # Backend environment template
│   └── server.js               # API entry point
├── frontend/                   # Vite + React application for the user experience
│   ├── public/                 # Static assets
│   └── src/                    # Components, hooks, contracts, and utilities
└── README.md                   # Project documentation
```

## Features
- Embedded wallet authentication via Openfort Shield with backend-issued encryption sessions
- Morpho Blue vault supply and withdrawal flows powered by Wagmi/Viem
- Vault APY fetching through Morpho’s GraphQL API
- Environment validation gating the UI until required configuration is present

## Architecture
- **Backend (`backend/`)** – Express server that proxies `create-encryption-session` requests to Openfort Shield, handles CORS, and exposes health endpoints.
- **Frontend (`frontend/`)** – Vite React app with modular hooks for vault data, custom providers, and Tailwind-based UI components.
- **Shared config** – Environment variables keep Shield credentials, backend URL, and optional policy IDs consistent across both layers.

## Setup

### Prerequisites
- Node.js 18+
- npm ≥ 9
- Openfort dashboard project with Shield keys, API key, secret key, and optional policy ID
- Morpho Blue vault address and Base RPC endpoint (defaults provided)
- Optional WalletConnect Project ID (falls back to `demo` if omitted)

### Environment Configuration
- **Backend** (`backend/.env`)
  1. `cd backend`
  2. `cp .env.example .env`
  3. Populate required variables:
     ```env
     NEXT_PUBLIC_SHIELD_API_KEY=your_shield_api_key
     NEXTAUTH_SHIELD_SECRET_KEY=your_shield_secret_key
     NEXTAUTH_SHIELD_ENCRYPTION_SHARE=your_encryption_share
     PORT=3001
     CORS_ORIGIN=http://localhost:5173
     FRONTEND_URL=http://localhost:5173
     BACKEND_URL=http://localhost:3001
     ```
- **Frontend** (`frontend/.env`)
  1. `cd frontend`
  2. `cp .env.example .env`
  3. Populate required variables:
     ```env
     VITE_OPENFORT_PUBLISHABLE_KEY=pk_your_publishable_key
     VITE_OPENFORT_SHIELD_PUBLIC_KEY=pk_your_shield_public_key
     VITE_OPENFORT_POLICY_ID=pol_optional_policy
     VITE_WALLET_CONNECT_PROJECT_ID=walletconnect_project_id
     VITE_BACKEND_URL=http://localhost:3001
     VITE_FRONTEND_URL=http://localhost:5173
     ```

### Install & Run
1. **Backend**
   ```bash
   cd backend
   npm install
   npm run dev           # http://localhost:3001
   ```
   - Use `npm start` for production-style runs.
   - Health check: `curl http://localhost:3001/health`.
2. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev -- --host # http://localhost:5173
   ```
   - Additional scripts: `npm run build`, `npm run preview`.

## Usage Flow
1. Start both backend and frontend services.
2. Authenticate with Openfort; the frontend requests an encryption session from `POST /api/create-encryption-session`.
3. Inspect wallet balances, vault APY, and current share positions via hooks in `src/hooks`.
4. Use the Supply action to approve USDC and deposit into the Morpho vault; use Withdraw to redeem all shares.
5. Modify vault addresses or RPC endpoints as needed through the configuration utilities.

## Development
- Run `npm run lint` from `frontend/` before submitting changes.
- Keep backend route handlers async and lightweight; extend only as needed for production deployments.
- Tailwind styles live in `frontend/src/index.css`; maintain existing class conventions.

## Troubleshooting
- **Configuration required modal** – Indicates missing or malformed environment variables; update both `.env` files and restart Vite.
- **`fetch` is not defined** – Upgrade to Node.js 18+ or add a `node-fetch` polyfill to the backend.
- **Transactions stuck** – Switch to a different Base RPC endpoint or adjust retry delays in `useVaultOperations`.
- **CORS errors** – Confirm the frontend host matches `CORS_ORIGIN`/`FRONTEND_URL`.

## Resources
- [Openfort Documentation](https://docs.openfort.io)
- [Morpho Blue Docs](https://docs.morpho.org/)
- [Vite Guide](https://vitejs.dev/guide/)
