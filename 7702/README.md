# Openfort + EIP-7702

Next.js app demonstrating EIP-7702 authorization with Openfort embedded wallets for gasless user operations on Base Sepolia.

## 1. Setup

```sh
pnpx gitpick openfort-xyz/recipes-hub/tree/main/7702 openfort-7702 && cd openfort-7702
```

## 2. Get Credentials

### Openfort

1. Create an account at [dashboard.openfort.io](https://dashboard.openfort.io)
2. Create a new project
3. Navigate to **API Keys** and copy your publishable key and secret key
4. Navigate to **Shield** settings and copy your Shield publishable key, secret key, and encryption share
5. Create a **Fee Sponsorship** and copy the policy ID

## 3. Configure Environment

```sh
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Openfort Project Keys
NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY=pk_test_...
OPENFORT_SECRET_KEY=sk_test_...
NEXT_PUBLIC_OPENFORT_FEE_SPONSORSHIP_ID=pol_...

# Openfort Shield Keys
NEXT_PUBLIC_OPENFORT_SHIELD_PUBLISHABLE_KEY=shpk_test_...
OPENFORT_SHIELD_SECRET_KEY=shsk_test_...
OPENFORT_SHIELD_ENCRYPTION_SHARE=...

# Encrypted session endpoint (optional, for automatic wallet recovery)
NEXT_PUBLIC_CREATE_ENCRYPTED_SESSION_ENDPOINT=http://localhost:3000/api/shield-session
```

## 4. Install & Start

```sh
pnpm i
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

1. **Authenticate** — Sign in with email OTP, Google, or guest mode via Openfort
2. **Embedded wallet** — Openfort creates an EOA with Shield for key management
3. **EIP-7702 authorization** — The EOA signs an authorization delegating to a [Simple7702Account](https://github.com/eth-infinitism/account-abstraction) (`0xe6Cae83BdE06E4c305530e199D7217f42808555B`)
4. **Gasless user operation** — A bundler client sends the user operation through Openfort's bundler and paymaster, covering all gas costs via fee sponsorship
5. **On-chain result** — View the transaction on [Base Sepolia Basescan](https://sepolia.basescan.org)

## Key Features

- **EIP-7702 authorization** — Delegate an EOA to a smart account implementation without deploying a new contract
- **Openfort embedded wallets** — Email, Google, and guest authentication with Shield key management
- **Gasless transactions** — Openfort's paymaster sponsors gas via fee sponsorship policies
- **Automatic wallet recovery** — Optional encrypted session endpoint for seamless wallet recovery
- **Wagmi + viem integration** — Uses `toSimple7702SmartAccount` from viem for account abstraction

## Project Structure

```
7702/
├── src/
│   ├── app/
│   │   ├── api/shield-session/route.ts  # Encrypted session API for wallet recovery
│   │   ├── layout.tsx                   # Root layout with metadata
│   │   └── page.tsx                     # Main page
│   ├── components/
│   │   ├── ui/                          # Button, Card UI components
│   │   ├── Providers.tsx                # Openfort, Wagmi, and React Query providers
│   │   └── UserOperation.tsx            # EIP-7702 authorization and UserOp flow
│   └── lib/
│       └── utils.ts                     # Tailwind merge utility
├── .env.example                         # Environment variable template
├── next.config.js                       # Next.js + webpack polyfills
└── package.json                         # Dependencies and scripts
```

## Resources

- [Openfort Documentation](https://openfort.io/docs)
- [EIP-7702 Specification](https://eips.ethereum.org/EIPS/eip-7702)
- [viem Account Abstraction](https://viem.sh/account-abstraction)
