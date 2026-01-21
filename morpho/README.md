# Openfort × Morpho

Interact with a Morpho Blue USDC vault on Base using Openfort embedded wallets and Shield authentication.

## 1. Setup

```bash
pnpx gitpick openfort-xyz/recipes-hub/tree/main/morpho openfort-morpho && cd openfort-morpho
```

## 2. Setup Backend

This sample requires a backend server for Openfort Shield authentication. Set up the Openfort Backend Quickstart:

```bash
git clone https://github.com/openfort-xyz/openfort-backend-quickstart.git
cd openfort-backend-quickstart
cp .env.example .env
```

Add your Openfort credentials to `.env`:

```env
OPENFORT_API_KEY=sk_your_secret_key
OPENFORT_SHIELD_SECRET_KEY=your_shield_secret_key
```

Then start the backend:

```bash
pnpm install
pnpm dev
```

The backend will run on `http://localhost:3000`. For more details, see the [Openfort Backend Quickstart repository](https://github.com/openfort-xyz/openfort-backend-quickstart).

## 3. Get Openfort Credentials

From your [Openfort dashboard](https://dashboard.openfort.io):

1. **Publishable Key**: Go to **Developers** → **API Keys** → copy your publishable key
2. **Shield Public Key**: Go to **Developers** → **API Keys** → copy your Shield public key
3. **Policy ID** (optional): Go to **Policies** → select or create a policy → copy the policy ID

## 4. Get WalletConnect Project ID

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Create a new project or use an existing one
3. Copy the Project ID

## 5. Configure Environment

```bash
cp .env.example .env
```

Update `.env` with your credentials:

```env
VITE_OPENFORT_PUBLISHABLE_KEY=pk_your_publishable_key
VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY=pk_your_shield_publishable_key
VITE_OPENFORT_POLICY_ID=pol_optional_policy
VITE_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id
VITE_BACKEND_URL=http://localhost:3000
```

## 6. Install & Start

```bash
pnpm i
pnpm dev
```

Visit `http://localhost:5173` to use the application.

## Resources

- [Openfort Documentation](https://www.openfort.io/docs)
- [Morpho Blue Docs](https://docs.morpho.org/)
