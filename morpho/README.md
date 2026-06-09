# Openfort × Morpho

Interact with a Morpho Blue USDC vault on Base using Openfort embedded wallets and Shield authentication.

## 1. Setup

```bash
pnpx gitpick openfort-xyz/recipes-hub/tree/main/morpho openfort-morpho && cd openfort-morpho
```

## 2. Get Openfort Credentials

From your [Openfort dashboard](https://dashboard.openfort.io):

1. **Publishable Key**: Go to **Developers** → **API Keys** → copy your publishable key
2. **Shield Publishable Key**: Go to **Developers** → **API Keys** → copy your Shield publishable key
3. **Fee Sponsorship ID** (optional): Go to **Policies** → select or create a fee sponsorship → copy the fee sponsorship ID

This recipe uses **passkey** wallet recovery (client-side WebAuthn), so the Shield
publishable key is all you need — no Shield secret and no backend server.

## 3. Get WalletConnect Project ID

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Create a new project or use an existing one
3. Copy the Project ID

## 4. Configure Environment

```bash
cp .env.example .env
```

Update `.env` with your credentials:

```env
VITE_OPENFORT_PUBLISHABLE_KEY=pk_your_publishable_key
VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY=pk_your_shield_publishable_key
VITE_OPENFORT_FEE_SPONSORSHIP_ID=pol_optional_fee_sponsorship
VITE_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id
```

## 5. Install & Start

```bash
pnpm i
pnpm dev
```

Visit `http://localhost:5173` to use the application.

## Resources

- [Openfort Documentation](https://www.openfort.io/docs)
- [Morpho Blue Docs](https://docs.morpho.org/)
