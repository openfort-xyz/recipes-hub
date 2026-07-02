# WalletConnect Pay + Openfort

Pay a WalletConnect Pay merchant link with an Openfort embedded wallet. The user pastes a
payment link, picks a stablecoin option, and the embedded wallet signs the required actions —
no extension, no seed phrase.

## How it works

WalletConnect Pay returns each payment step as a raw wallet RPC request
(`eth_sendTransaction`, `eth_signTypedData_v4`, or `personal_sign`). The Openfort embedded
wallet exposes a standard EIP-1193 provider through the wagmi connector, so each action is
forwarded straight to the wallet — Openfort signs, WalletConnect Pay broadcasts and settles.

```
paste link
  → pay.getPaymentOptions({ paymentLink, accounts })   // accounts = CAIP-10 per chain
  → (optional) merchant data-collection iframe
  → pay.getRequiredPaymentActions({ paymentId, optionId })
  → provider.request(action.walletRpc) for each action  // Openfort signs
  → pay.confirmPayment({ paymentId, optionId, signatures })  // poll until isFinal
```

## 1. Setup

```sh
pnpx gitpick openfort-xyz/recipes-hub/tree/main/walletconnect-pay openfort-walletconnect-pay && cd openfort-walletconnect-pay
```

## 2. Get Openfort Credentials

1. Go to [Openfort Dashboard](https://dashboard.openfort.io) and create a project.
2. **Developers → API Keys**: copy your **Publishable Key** (`pk_...`).
3. **Shield**: copy your **Shield Publishable Key**.
4. (Optional) **Gas Policies**: create a fee sponsorship and copy the **Fee Sponsorship ID** to
   sponsor the on-chain payment transactions (see [Gasless payments](#gasless-payments)).

## 3. Get WalletConnect Pay Credentials

1. Go to the [WalletConnect Dashboard](https://dashboard.walletconnect.com) (Reown).
2. Copy your **Project ID**.
3. In the **Pay** section, copy your **Pay API key**.

## 4. Configure Environment

```sh
cp .env.example .env
```

```env
VITE_OPENFORT_PUBLISHABLE_KEY=pk_...
VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY=...
VITE_OPENFORT_FEE_SPONSORSHIP_ID=pol_...     # optional
VITE_WALLET_CONNECT_PROJECT_ID=...
VITE_WALLETCONNECT_PAY_API_KEY=...
```

This demo uses **passkey** wallet recovery, so no backend is required. (Passkey and password
recovery encrypt the Shield share on the client; only Openfort's *automatic* recovery needs a
backend encryption-session endpoint.)

## 5. Install & Run

```sh
pnpm i
pnpm dev   # http://localhost:5173
```

Sign in with the embedded wallet, paste a WalletConnect Pay link, and complete the payment.

## Supported chains

Base, Ethereum, Polygon, Arbitrum, and Optimism. WalletConnect Pay settles in stablecoins
(USDC, USDT, EURC, PYUSD, USDG) and picks the source chain based on the wallet's balances.

## Gasless payments

Out of the box the embedded wallet is an EOA, so the user pays gas for each
`eth_sendTransaction`. To make payments fully gasless:

- **EVM** — delegate the EOA to a smart account with [EIP-7702](https://www.openfort.io/blog/openfort-delegator-account-7702)
  and attach a gas policy. Create a **Fee Sponsorship** in the dashboard, set
  `VITE_OPENFORT_FEE_SPONSORSHIP_ID`, and the sponsor pays gas — users only need
  stablecoins, never ETH. See the [7702 recipe](../7702) for a full walkthrough.
- **Solana** — use Openfort's [Kora integration](https://www.openfort.io/blog/solana-gasless-transactions).
  Kora (the Solana Foundation's fee relayer) is set as the transaction `feePayer`; Openfort
  validates your gas policy (`sponsorSolTransaction`) and co-signs, so no SOL is deducted
  from the user. No paymaster contract needed — Solana supports fee payers natively.

## Resources

- [WalletConnect Pay docs](https://docs.walletconnect.com/payments/wallets/overview)
- [Openfort Documentation](https://www.openfort.io/docs)
