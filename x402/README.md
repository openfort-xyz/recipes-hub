# Openfort x402 Modular Demo

A structured, end-to-end reference that showcases how Openfort smart accounts power an x402 paywall.

## 1. Setup

```bash
cd x402
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
4. Create a Policy and get the **Policy ID** (`pol_...`)

### Configure Environment

Create `frontend/.env.local`:

```env
VITE_OPENFORT_PUBLISHABLE_KEY=pk_test_...
VITE_SHIELD_PUBLISHABLE_KEY=shpk_test_...
VITE_WALLET_CONNECT_PROJECT_ID=your-wallet-connect-project-id
VITE_POLICY_ID=pol_...
VITE_CREATE_ENCRYPTED_SESSION_ENDPOINT=http://localhost:3007/api/protected-create-encryption-session
VITE_X402_RESOURCE_URL=http://localhost:3007/api/protected-content
VITE_X402_DEFAULT_AMOUNT=0.1
```

Create `backend/.env.local`:

```env
PORT=3007
OPENFORT_SECRET_KEY=sk_test_...
OPENFORT_SHIELD_PUBLISHABLE_KEY=shpk_test_...
OPENFORT_SHIELD_SECRET_KEY=shsk_test_...
OPENFORT_SHIELD_ENCRYPTION_SHARE=shield_encryption_share
PAY_TO_ADDRESS=0x...
X402_NETWORK=base-sepolia
X402_RESOURCE=http://localhost:3007/api/protected-content
X402_DESCRIPTION=Access to premium content
X402_MIME_TYPE=application/json
X402_MAX_AMOUNT=100000
X402_TIMEOUT=300
X402_ASSET_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
X402_ASSET_NAME=USDC
X402_ASSET_VERSION=1
CORS_ORIGINS=http://localhost:5173,http://localhost:3007
```

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

## Project Structure

```
x402/
├─ backend/                      # Express.js API
│  ├─ src/config.ts              # Environment & payment config
│  ├─ src/routes.ts              # API endpoints
│  └─ src/payment.ts             # Payment validation
├─ frontend/
│  ├─ src/features/paywall/      # Paywall UI & logic
│  ├─ src/integrations/openfort/ # Openfort providers
│  └─ src/integrations/x402/     # x402 protocol helpers
```

## Key Features

- x402 payment protocol implementation
- Openfort smart account integration
- USDC payments on Base/Base Sepolia
- Shield embedded wallets for easy onboarding
