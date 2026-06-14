# Openfort × Gnosis Pay

An Expo React Native app where an **Openfort embedded wallet is the self-custodial owner of a Gnosis Pay account**. Log in, deploy the account (a Safe) on Gnosis Chain, configure its spending allowance, fund it, and spend within the limit — entirely on-chain, no backend.

A Gnosis Pay card is a Visa debit card attached to a [Safe](https://safe.global/) with two Zodiac modules (**Roles** + **Delay**). Gnosis' own advice to builders: *don't treat it like Stripe — treat it like a DeFi wallet with a card attached.* This recipe builds exactly that account using [`@gnosispay/account-kit`](https://github.com/gnosispay/account-kit), with Openfort providing the embedded wallet that owns and signs for it.

> **What this recipe does and doesn't do.** It builds and runs the **on-chain account** a Gnosis Pay card spends from: create → set up (Roles + Delay + allowance) → fund → spend → inspect. It does **not** issue the physical/virtual Visa card — that requires KYC (Sumsub) and a Gnosis Pay partnership, which can't happen inside an open sample. See [Gnosis Pay onboarding](https://docs.gnosispay.com/onboarding-flow).

## 1. Setup

```sh
pnpx gitpick openfort-xyz/recipes-hub/tree/main/gnosis-pay openfort-gnosis-pay && cd openfort-gnosis-pay
```

## 2. Prerequisites

- macOS with Xcode (iOS Simulator) or Android Studio (Android Emulator) — or the **Expo Go** app on a physical device.
- An [Openfort](https://dashboard.openfort.io) account.
- A small amount of **xDAI** (gas) and **EURe** (to load the card) on Gnosis Chain — see step 5.

No backend server is required: this recipe uses Openfort's **password-based** wallet recovery, so the key is encrypted client-side.

## 3. Get Openfort credentials

1. Open the [Openfort Dashboard](https://dashboard.openfort.io) and create a project.
2. **Developers → API keys** → copy the **Publishable key** (`pk_...`).
3. **Configuration → Shield** → copy the **Shield publishable key**.
4. *(Optional)* **Configuration → Gas policies** → create a policy on Gnosis Chain and copy its id if you want to sponsor gas.

## 4. Configure environment

```sh
cp .env.example .env
```

```env
OPENFORT_PROJECT_PUBLISHABLE_KEY=pk_test_...
OPENFORT_SHIELD_PUBLISHABLE_KEY=pk_...
# Optional — a Pimlico API key makes every on-chain action gasless (no xDAI needed):
PIMLICO_API_KEY=
# Optional — leave blank to pay gas in xDAI from the wallet:
OPENFORT_FEE_SPONSORSHIP_ID=
# Optional — override the default Gnosis RPC:
GNOSIS_RPC_URL=https://rpc.gnosischain.com
```

## 5. Fund the embedded wallet

Everything happens on **Gnosis Chain (id 100)** — the network Gnosis Pay runs on. After you create the wallet in-app, copy its address and send it:

- **xDAI** for gas — a few cents covers the account creation + setup transactions. (Bridge via the [Gnosis Chain bridge](https://bridge.gnosischain.com/) or any exchange that supports xDAI withdrawals.)
- **EURe** to load the card — [Monerium](https://monerium.com/) mints EURe directly on Gnosis Chain, or bridge/swap into it. EURe is the card's settlement currency in this recipe; GBPe and USDCe are also defined in `lib/constants.ts`.

> The account address is deterministic, so you can fund it before or after creating it.

## 6. Install & run

```sh
pnpm install
pnpm run ios       # iOS Simulator
pnpm run android   # Android Emulator
pnpm start         # Expo Go on a device (scan the QR)
```

## How it works

The embedded wallet is created as an **EOA** (`accountType: EOA`) so it produces plain ECDSA signatures — exactly what `account-kit` expects from an account owner. It both **signs** the account's transactions (`eth_signTypedData_v4`) and **relays** them (`eth_sendTransaction`).

| Step | What happens | account-kit |
| ---- | ------------ | ----------- |
| Predict | Derive the account's deterministic Safe address from the owner | `predictAccountAddress` |
| Create | Deploy the bare 1/1 Safe | `populateAccountCreation` |
| Set up | Attach Roles + Delay modules and a spending allowance | `populateAccountSetup` |
| Fund | Transfer EURe into the account Safe (a plain ERC-20 transfer) | — |
| Spend | Owner calls the Roles module to draw EURe out, capped by the allowance | `execTransactionWithRole` |
| Inspect | Read integrity status + accrued allowance | `accountQuery` |

`lib/eip1193.ts` adapts Openfort's EIP-1193 provider into account-kit's library-agnostic signing callback (re-adding the `EIP712Domain` type that `eth_signTypedData_v4` requires). `lib/gnosisPay.ts` is the small high-level wrapper the UI calls.

A `scripts/verify-accountkit.cjs` sanity check validates address prediction, the EIP-712 signing path, and a live `accountQuery` against Gnosis mainnet:

```sh
node scripts/verify-accountkit.cjs
```

## Gas: pay xDAI or sponsor with Pimlico

- **No paymaster (default):** the embedded EOA relays its own transactions and pays gas in **xDAI** (cents on Gnosis). The app shows a "Fund your wallet for gas" prompt until it has a little xDAI.
- **With Pimlico (`PIMLICO_API_KEY` set):** on-chain actions are **gasless**. Because a standard ERC-4337 paymaster sponsors *UserOperations* (not a plain EOA's `eth_sendTransaction`), the recipe relays the account-kit transactions through a **Pimlico smart account owned by the embedded EOA** — that smart account becomes the sender, the spend role-member, and where you hold EURe. The EOA still signs everything; the "fund for gas" prompt disappears. See `lib/pimlico.ts`.

You still need **EURe** to load and spend the card (send it to the fund address shown under *Manage*) — the paymaster only removes the gas cost.

## Notes

- **Delay cooldown:** setup configures a 180s cooldown (matching Gnosis Pay) so allowance/owner changes queue before they execute — the security model is visible in `lib/constants.ts`.
- **Spending without a second Safe:** `setup` assigns the owner the `SPENDING_ROLE`, so the owner spends by calling the account's Roles module directly (`execTransactionWithRole`) — no Spender Safe or delegate needed. account-kit's `populateSpend` models Gnosis Pay's production design (a separate Spender Safe + delegate) instead; both draw against the same allowance. The spend's recipient is fixed at setup to the configured `receiver` (the owner here; Gnosis Pay's Settlement Safe in production).
- **Delegated spending:** to let a backend or session key spend on the user's behalf without a second Safe, assign the role to that address in `buildSetupConfig` (`spender`) instead of the owner.
- **Demo recovery password:** `DEMO_RECOVERY_PASSWORD` in `lib/constants.ts` is hardcoded so the sample runs with no input. In production, collect this password from the user (it encrypts their key share client-side) or switch to automatic / passkey recovery — never ship a shared constant.

## From sandbox to a real card

This recipe deploys a self-custodial account with the **same on-chain structure** Gnosis Pay uses, but it is **not** a registered card — it can't be tapped at a terminal. Issuing a real card adds a regulated layer on top:

1. **KYC onboarding.** Users verify identity at [gnosispay.com](https://gnosispay.com) (via Sumsub). Gnosis Pay is the licensed issuer and a Visa principal member — the only party that can issue the card.
2. **Monerium e-money + IBAN.** EURe is [Monerium](https://monerium.com)'s regulated e-money; minting/redeeming it and provisioning the SEPA IBAN behind the card require a (KYC'd) Monerium account. Here EURe is just an ERC-20 you transfer in.
3. **Issuance + settlement.** After KYC, Gnosis Pay deploys the user's Safe (the same account-kit structure) and issues a Visa card linked to it. At point of sale, Gnosis Pay's Spender / Settlement Safes are the role-member that pulls EURe from the Safe within the allowance — the exact path this recipe replicates with your own relayer as the `spender`.

The account model, the Roles + Delay modules, the allowance, and the spend mechanics are identical between this sandbox and production. To go live you swap the self-deployed account for a Gnosis-Pay-onboarded one and point `spender` / `receiver` at Gnosis Pay's Safes. Start with the [Gnosis Pay onboarding flow](https://docs.gnosispay.com/onboarding-flow).

## Resources

- [Openfort Documentation](https://www.openfort.io/docs)
- [Openfort React Native SDK](https://www.openfort.io/docs/products/embedded-wallet/react-native)
- [Gnosis Pay Documentation](https://docs.gnosispay.com)
- [@gnosispay/account-kit](https://github.com/gnosispay/account-kit)
- [A Hacker's Guide to Gnosis Pay](https://www.gnosis.io/blog/a-hackers-guide-to-gnosis-pay)
