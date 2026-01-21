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
4. Copy your **Shield Public Key**

### Create a Policy (Optional)

1. Navigate to **Gas Policies**
2. Create a new policy to sponsor user transactions
3. Copy the **Policy ID**

## 3. Setup Backend

This app requires a backend server for Shield authentication sessions.

```sh
git clone https://github.com/openfort-xyz/openfort-backend-quickstart.git
cd openfort-backend-quickstart
cp .env.example .env
```

Add your Openfort **Secret Key** to the backend `.env`:

```env
OPENFORT_SECRET_KEY=sk_...
```

Start the backend:

```sh
pnpm i
pnpm dev  # Runs on http://localhost:3001
```

## 4. Configure Environment

Return to the aave project directory and configure the frontend:

```sh
cp .env.example .env
```

Add your credentials to `.env`:

```env
VITE_OPENFORT_PUBLISHABLE_KEY=pk_...
VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY=...
VITE_OPENFORT_POLICY_ID=pol_...     # Optional
VITE_BACKEND_URL=http://localhost:3001
```

## 5. Install & Run

```sh
pnpm i
pnpm dev  # http://localhost:5173
```

## Resources

- [Openfort Documentation](https://www.openfort.io/docs)
- [Aave Documentation](https://docs.aave.com)
