# Aave Sample

## Quick Start

```bash
npx gitpick openfort-xyz/recipes-hub/tree/main/aave openfort-aave && cd openfort-aave
```

## Overview
This sample demonstrates how to pair Openfort's embedded wallet infrastructure with the Aave protocol to build a full-stack DeFi experience. A Vite + React frontend connects to an Express backend that proxies Shield operations, letting users authenticate, inspect balances, and execute lending transactions with sponsored gas.

## Project Structure
```
aave/
├── backend/                   # Express API for Shield helpers and server routes
│   ├── server.js              # Entry point with Shield proxy endpoints
│   ├── package.json           # Backend dependencies and scripts
│   └── .env.example           # Environment template for backend configuration
├── frontend/                  # React + Vite application for the user interface
│   ├── public/                # Static assets served by Vite
│   └── src/                   # Frontend application source code
│       ├── components/        # UI components for lending flows
│       ├── hooks/             # Wagmi/Viem hooks and data fetching
│       ├── contracts/         # ABIs, addresses, and protocol helpers
│       ├── utils/             # Shared utilities and formatting
│       └── lib/               # Providers and application scaffolding
└── README.md                  # Project documentation
```

## Features
- Openfort Shield authentication and embedded wallet provisioning
- Aave lending and borrowing flows with balance visualisation
- Gas-sponsored transactions routed through configured provider policies
- Clear separation between frontend state management and backend services

## Architecture
- **Backend (`backend/`)** – Express server handling Shield encryption sessions, CORS configuration, and REST helpers for the frontend.
- **Frontend (`frontend/`)** – React application using Wagmi/Viem for on-chain data, coupled with modern UI components for lending workflows.
- **Shared configuration** – Environment variables keep backend URLs, Shield credentials, and policy identifiers aligned across both layers.

## Setup

### Prerequisites
- Node.js 18 or newer (includes global `fetch` support)
- npm or yarn
- Openfort dashboard project with Shield credentials and optional policy ID

### Environment Configuration
- **Backend**
  1. `cd backend`
  2. `cp .env.example .env`
  3. Populate:
     ```env
     NEXT_PUBLIC_SHIELD_API_KEY=your_shield_api_key
     NEXTAUTH_SHIELD_SECRET_KEY=your_shield_secret_key
     NEXTAUTH_SHIELD_ENCRYPTION_SHARE=your_encryption_share
     PORT=3001
     CORS_ORIGIN=http://localhost:5173
     FRONTEND_URL=http://localhost:5173
     BACKEND_URL=http://localhost:3001
     ```
- **Frontend**
  1. `cd frontend`
  2. `cp .env.example .env`
  3. Populate:
     ```env
     VITE_OPENFORT_PUBLISHABLE_KEY=your_publishable_key
     VITE_OPENFORT_SHIELD_PUBLIC_KEY=your_shield_public_key
     VITE_OPENFORT_POLICY_ID=your_policy_id
     VITE_BACKEND_URL=http://localhost:3001
     ```

### Install & Run
1. **Backend**
   ```bash
   cd backend
   npm install
   npm run dev            # http://localhost:3001
   ```
2. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev            # http://localhost:5173
   ```

## Usage Flow
1. Start both backend and frontend servers.
2. Authenticate through Openfort Shield from the React app.
3. View wallet balances and collateral positions retrieved from Aave.
4. Execute supply or borrow actions; transactions are sent via the backend with gas sponsorship.

## Development
- **Backend scripts** – `npm run dev` (development with nodemon), `npm start` (production mode).
- **Frontend scripts** – `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`.
- Keep React components functional and prefer hooks for shared logic.

## Troubleshooting
- CORS errors usually mean `CORS_ORIGIN` or `FRONTEND_URL` mismatch the frontend host.
- Placeholder environment variables will cause authentication failures—ensure real Shield keys and policy IDs are set.
- If ports 3001 or 5173 are occupied, update the values in the env files and project scripts.

## Resources
- [Openfort Documentation](https://docs.openfort.io)
- [Aave Documentation](https://docs.aave.com)
- [Vite Guide](https://vitejs.dev/guide/)
