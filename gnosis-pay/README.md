# Openfort × Gnosis Pay

An Expo React Native app that issues a **Gnosis Pay Visa card to an Openfort embedded wallet**. The wallet signs in to Gnosis Pay with SIWE, the user onboards (email, terms, KYC, source of funds), Gnosis Pay deploys a self-custodial Safe the wallet owns and issues a virtual card, and the wallet funds the Safe with EURe on Gnosis Chain.

It uses the [Gnosis Pay User API](https://docs.gnosispay.com/guides/configuring-environment) directly from the app; there is no backend.

## 1. Setup

```sh
pnpx gitpick openfort-xyz/recipes-hub/tree/main/gnosis-pay openfort-gnosis-pay && cd openfort-gnosis-pay
```

## 2. Prerequisites

- macOS with Xcode (iOS Simulator) or Android Studio (Android Emulator).
- An [Openfort](https://dashboard.openfort.io) account.
- **Gnosis Pay sandbox access**: ask the Gnosis Pay team for an invite to the [Partner Dashboard](https://partners.gnosispay.com) and have them whitelist your SIWE domain. Production needs a partnership agreement.
- **EURe** on Gnosis Chain to load the card, and a little **xDAI** for gas unless you set up gas sponsorship.

## 3. Get credentials

1. In the [Openfort Dashboard](https://dashboard.openfort.io), create a project.
2. **Developers → API keys**: copy the **Publishable key** (`pk_...`) and the **Shield publishable key**.
3. *(Optional)* **Gas sponsorship**: create one on Gnosis Chain and copy its ID (`pol_...`).
4. From Gnosis Pay: the whitelisted SIWE domain.

## 4. Configure environment

```sh
cp .env.example .env
```

```env
OPENFORT_PROJECT_PUBLISHABLE_KEY=pk_test_...
OPENFORT_SHIELD_PUBLISHABLE_KEY=...
GNOSIS_PAY_ENV=sandbox
GNOSIS_PAY_SIWE_DOMAIN=myapp.xyz
```

`.env.example` documents the optional variables.

| Environment | User API base URL | Access |
| --- | --- | --- |
| `sandbox` | `https://core.sandbox.gnosispay.in/user-api` | Invite from Gnosis Pay; Sumsub test documents; simulated card network |
| `production` | `https://core.prod.gnosispay.com/user-api` | Partnership agreement |

## 5. Install and run

```sh
pnpm install
pnpm run ios       # or: pnpm run android
```

## 6. The flow

| Step | Gnosis Pay User API |
| --- | --- |
| Sign in with the wallet (SIWE) | `GET /auth/siwe/{address}`, `POST /auth/siwe`, `POST /auth/refresh` |
| Verify email and register | `POST /email-verification`, `POST /user` |
| Follow the onboarding status | `GET /user/onboarding` |
| Accept terms | `POST /user/terms` |
| KYC (Sumsub) | `webSdkUrl` from the onboarding status |
| Source of funds | `POST /source-of-funds` |
| Create the account (Gnosis Pay deploys the Safe) | `POST /user/account`, `GET /user/account` |
| Issue a virtual card | `POST /cards/virtual`, `GET /cards` |
| Fund the Safe | ERC-20 `transfer` of EURe to `safeAddress` from the embedded wallet |
| Balances | `GET /user/balances/v2` |

The embedded wallet is an **EOA**. Its address becomes the only owner of the Safe and the only address that can sign in to this Gnosis Pay account, and it cannot be changed later.

In sandbox, test spending with the [card transaction simulator](https://docs.gnosispay.com/guides/cards/card-simulator); it takes a partner password, so call it from a terminal, not the app.

## Project structure

```
gnosis-pay/
├── app/_layout.tsx              # OpenfortProvider (EOA, password recovery, Gnosis Chain)
├── components/
│   ├── LoginScreen.tsx          # Guest login
│   ├── CardApp.tsx              # Creates or restores the embedded wallet
│   └── CardDashboard.tsx        # Onboarding steps, card, funding
├── hooks/useGnosisPay.ts        # Onboarding status, account, balances, cards
└── lib/
    ├── session.ts               # SIWE + rotating access/refresh tokens
    ├── gnosisPay.ts             # User API calls, fundSafe
    ├── eip1193.ts               # personal_sign, eth_sendTransaction
    ├── constants.ts             # Gnosis Chain, tokens by currency
    └── config.ts                # Env-driven config
```

See [`AGENTS.md`](./AGENTS.md) for adding this to your own app, the Openfort primitives used, and failure modes.
