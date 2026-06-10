# Aave + Openfort

Embedded wallet authentication with Aave lending and borrowing, powered by Openfort Shield.

## 1. Setup

```sh
pnpx gitpick openfort-xyz/recipes-hub/tree/main/aave openfort-aave && cd openfort-aave
```

## 2. Get Openfort Credentials

### Create an Openfort Account

1. Go to [Openfort Dashboard](https://dashboard.openfort.io)
2. Sign up or log in
3. Create a new project

### Get Your API Keys

1. Navigate to **Developers** → **API Keys**
2. Copy your **Publishable Key** (starts with `pk_`)
3. Navigate to **Shield** section
4. Copy your **Shield Publishable Key**

This recipe uses **passkey** wallet recovery (client-side WebAuthn), so the Shield
publishable key is all you need — no Shield secret and no backend server.

### Create a Fee Sponsorship (Optional)

1. Navigate to **Gas Policies**
2. Create a new fee sponsorship to sponsor user transactions
3. Copy the **Fee Sponsorship ID**

## 3. Configure Environment

```sh
cp .env.example .env
```

Add your credentials to `.env`:

```env
VITE_OPENFORT_PUBLISHABLE_KEY=pk_...
VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY=...
VITE_OPENFORT_FEE_SPONSORSHIP_ID=pol_...     # Optional
```

## 4. Install & Run

```sh
pnpm i
pnpm dev  # http://localhost:5173
```

## Resources

- [Openfort Documentation](https://www.openfort.io/docs)
- [Aave Documentation](https://docs.aave.com)
