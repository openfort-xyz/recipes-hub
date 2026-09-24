# Openfort x402 Modular Demo

A structured, end-to-end reference that showcases how Openfort smart accounts power an x402 paywall with embedded wallets, backend wallets, and gasless transactions.

## 1. Setup

```bash
pnpx gitpick openfort-xyz/recipes-hub/tree/main/x402 openfort-x402 && cd openfort-x402
```

## 2. Get Credentials

You'll need to configure credentials for both frontend and backend.

### Openfort Dashboard

1. Go to [Openfort Dashboard](https://dashboard.openfort.xyz)
2. Create an account or sign in
3. Get your API keys:
   - **Publishable Key** (`pk_test_...`) - Frontend
   - **Secret Key** (`sk_test_...`) - Backend
   - **Shield Keys**
4. Create a Fee Sponsorship and get the **Fee Sponsorship ID** (`pol_...`)

### Configure Environment

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.local.example backend/.env.local
```

Every variable is listed with a one-line comment (where to get it, required or optional) in those two files:

- `frontend/.env.example`: `VITE_OPENFORT_PUBLISHABLE_KEY`, `VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY`, `VITE_OPENFORT_FEE_SPONSORSHIP_ID`, `VITE_CREATE_ENCRYPTED_SESSION_ENDPOINT`, `VITE_WALLET_CONNECT_PROJECT_ID`, `VITE_X402_RESOURCE_URL`, `VITE_X402_DEFAULT_AMOUNT`.
- `backend/.env.local.example`: `PORT`, `OPENFORT_SECRET_KEY`, `OPENFORT_WALLET_SECRET`, `OPENFORT_BACKEND_WALLET_ID`, `OPENFORT_FEE_SPONSORSHIP_ID`, `OPENFORT_SHIELD_PUBLISHABLE_KEY`, `OPENFORT_SHIELD_SECRET_KEY`, `OPENFORT_SHIELD_ENCRYPTION_KEY`, `X402_FACILITATOR_URL`, `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `PAY_TO_ADDRESS`, `X402_NETWORK`, `X402_RESOURCE`, `X402_DESCRIPTION`, `X402_MIME_TYPE`, `X402_MAX_AMOUNT`, `X402_TIMEOUT`, `X402_ASSET_ADDRESS`, `X402_ASSET_NAME`, `X402_ASSET_VERSION`, `X402_RPC_URL`, `CORS_ORIGINS`.

## 3. Install & Start

```bash
# Install and start backend
cd backend
pnpm i
pnpm dev

# In a new terminal, install and start frontend
cd frontend
pnpm i
pnpm dev
```

Visit http://localhost:5173 to see the paywall in action.

## Wallet Types

This recipe demonstrates two distinct wallet approaches, selectable via tabs in the frontend UI.

### Embedded Wallet (Client-Side)

The **Embedded wallet** tab uses Openfort's embedded wallet infrastructure for browser-based transactions. The wallet is created and managed client-side through Openfort Shield, with passkey-based recovery.

How it works:
1. User authenticates via Openfort (email OTP, Google, guest, or external wallet)
2. Openfort creates a smart account with Shield for key management and recovery
3. The user signs USDC payments directly in the browser
4. Transactions are submitted on-chain or signed off-chain depending on the gas mode

Key integration points:
- `frontend/src/integrations/openfort/OpenfortProviders.tsx` — Provider configuration with Shield and recovery
- `frontend/src/features/paywall/PaywallExperience.tsx` — Full auth → pay → unlock flow
- `frontend/src/features/paywall/hooks/usePaymentFlow.ts` — Payment state machine

### Backend Wallet (Server-Side)

The **Backend wallet** tab uses Openfort's backend wallet API for headless, server-side signing. No browser wallet interaction is needed — the backend holds the signing key.

How it works:
1. A backend wallet is created via the Openfort API (can be done from the UI)
2. The wallet secret (`OPENFORT_WALLET_SECRET`) authenticates signing requests
3. The server signs EIP-3009 `TransferWithAuthorization` payloads
4. Payments are settled on-chain (gasless) or sent as payment headers for facilitator verification

Key integration points:
- `backend/src/openfort.ts` — Backend wallet client initialization
- `backend/src/routes.ts` — Wallet creation and payment endpoints
- `backend/src/payment.ts` — `createBackendWalletPayment()` and `submitTransferWithAuthorizationGasless()`
- `frontend/src/features/backend-wallet/BackendWalletExperience.tsx` — UI for triggering backend wallet flows

## Gasless Transactions

Both wallet types support gasless transactions. The user (or backend wallet) never pays gas — a third party covers it.

### Via Openfort Policy (Paymaster)

Openfort's fee sponsorship uses a paymaster pattern to cover gas costs.

**For embedded wallets:** Set `VITE_OPENFORT_FEE_SPONSORSHIP_ID` in the frontend env. When the user signs a USDC `transfer()` via wagmi, Openfort's smart account infrastructure routes the transaction through a paymaster that sponsors gas based on the fee sponsorship rules.

**For backend wallets:** The server calls `openfort.accounts.evm.backend.sendTransaction()` (`submitTransferWithAuthorizationGasless()` in `backend/src/payment.ts`). On first use the SDK registers the backend EOA as an EIP-7702 Delegated Account and attaches the signed authorization; it then creates and signs the transaction intent. Set `OPENFORT_FEE_SPONSORSHIP_ID` for a transaction-scoped fee sponsorship, or leave it empty to use a project-scoped one.

### Via Facilitator (Coinbase CDP)

The x402 facilitator is a third-party service (Coinbase CDP) that verifies, settles, and pays gas for `TransferWithAuthorization` payments.

**For both wallet types:** Set `X402_FACILITATOR_URL`, `CDP_API_KEY_ID`, and `CDP_API_KEY_SECRET` in the backend env. The wallet signs an EIP-712 `TransferWithAuthorization` off-chain. The backend sends this to the CDP facilitator, which verifies the signature, submits the on-chain transfer, and pays the gas.

## Project Structure

```
x402/
├─ backend/                      # Express.js API
│  ├─ src/server.ts              # Express server setup, CORS, rate limiting
│  ├─ src/config.ts              # Environment & payment config
│  ├─ src/openfort.ts            # Openfort client + backend wallet helpers
│  ├─ src/routes.ts              # API endpoints (protected content, backend wallet)
│  ├─ src/payment.ts             # Payment validation, signing, settlement
│  └─ src/cdp-auth.ts            # CDP JWT auth for facilitator
├─ frontend/
│  ├─ src/features/paywall/      # Embedded wallet: auth → pay → unlock
│  ├─ src/features/backend-wallet/  # Backend wallet: status → create → pay
│  ├─ src/integrations/openfort/ # Openfort providers (Shield, wagmi, recovery)
│  └─ src/integrations/x402/     # x402 protocol helpers (types, signing, balance)
```

## Key Features

- x402 payment protocol implementation (HTTP 402 Payment Required)
- Two wallet modes: embedded (browser-side) and backend (server-side)
- Gasless transactions via Openfort policy (paymaster) or Coinbase CDP facilitator
- USDC payments on Base and Base Sepolia
- Openfort Shield for embedded wallet key management and recovery
- EIP-7702 Delegated Accounts for backend wallet gas sponsorship
- EIP-3009 TransferWithAuthorization for off-chain payment signing
