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
3. Navigate to **API Keys** and copy your publishable key
4. Navigate to **Shield** settings and copy your Shield publishable key
5. Create a **Fee Sponsorship** and copy the policy ID

This recipe uses **passkey** wallet recovery (client-side WebAuthn), so the Shield
publishable key is all you need — no Shield secret, encryption share, or backend.

## 3. Configure Environment

```sh
cp .env.example .env
```

Edit `.env` with your credentials:

```env
NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_OPENFORT_FEE_SPONSORSHIP_ID=pol_...
NEXT_PUBLIC_OPENFORT_SHIELD_PUBLISHABLE_KEY=shpk_test_...
```

## 4. Install & Start

```sh
pnpm i
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

1. **Authenticate** — Sign in with email OTP, Google, or guest mode via Openfort
2. **Embedded wallet** — Openfort creates an EOA secured by a passkey via Shield
3. **EIP-7702 authorization** — The EOA signs an authorization delegating to a [Simple7702Account](https://github.com/eth-infinitism/account-abstraction) (`0xe6Cae83BdE06E4c305530e199D7217f42808555B`)
4. **Gasless user operation** — A bundler client sends the user operation through Openfort's bundler and paymaster, covering all gas costs via fee sponsorship
5. **On-chain result** — View the transaction on [Base Sepolia Basescan](https://sepolia.basescan.org)

## Key Features

- **EIP-7702 authorization** — Delegate an EOA to a smart account implementation without deploying a new contract
- **Openfort embedded wallets** — Email, Google, and guest authentication with Shield key management
- **Gasless transactions** — Openfort's paymaster sponsors gas via fee sponsorship policies
- **Passkey wallet recovery** — Client-side WebAuthn; no encryption-session backend required
- **Wagmi + viem integration** — Uses `toSimple7702SmartAccount` from viem (Openfort's bundler/paymaster as the ERC-4337 transport)

## Project Structure

```
7702/
├── src/
│   ├── app/
│   │   ├── api/shield-session/route.ts  # Optional: encryption session for automatic recovery
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

> The `api/shield-session` route is only used if you switch from passkey to
> AUTOMATIC wallet recovery. See `.env.example` for the optional variables it needs.

## Resources

- [Openfort Documentation](https://openfort.io/docs)
- [EIP-7702 Specification](https://eips.ethereum.org/EIPS/eip-7702)
- [viem Account Abstraction](https://viem.sh/account-abstraction)
