# Openfort × Zama — Earn private yield

Shield USDC into Zama's confidential token (**cUSDC**) and earn private yield in the
**Steakhouse Confidential** Morpho vault, from an Openfort embedded wallet. Balances,
deposits and yield stay **encrypted** on-chain. The wallet is an **EOA + passkey**,
EIP-7702-delegated so an Openfort **paymaster** sponsors every transaction.

Runs on **Ethereum Sepolia** by default (works with Openfort test keys); set
`VITE_NETWORK=mainnet` to point at the live mainnet deployment.

This recipe is **frontend-only**: passkey recovery needs no backend, and Zama's
`@zama-fhe/sdk` encrypts amounts and decrypts your own balances client-side through
Zama's public relayer — no Zama account required.

## 1. Setup

```bash
pnpx gitpick openfort-xyz/recipes-hub/tree/main/zama-confidential-yield openfort-zama-yield && cd openfort-zama-yield
pnpm install
```

## 2. Get Openfort credentials

From your [Openfort dashboard](https://dashboard.openfort.io):

1. **Publishable Key**: **Developers → API Keys** → copy your publishable key (`pk_test_…`)
2. **Shield Publishable Key**: **Developers → API Keys** → copy your Shield publishable key
3. Enable **Ethereum Sepolia** and make sure the **Delegated** (EIP-7702) account type is available
4. **Fee Sponsorship ID**: **Policies** → create a gas-sponsorship policy for Sepolia → copy its id (`pol_…`). This is what makes transactions gasless.

This recipe uses **passkey** recovery (client-side WebAuthn), so the Shield publishable
key is all you need — no Shield secret and no backend.

## 3. Configure your environment

Copy `.env.example` to `.env` and fill it in:

```bash
VITE_NETWORK=sepolia
VITE_OPENFORT_PUBLISHABLE_KEY=pk_test_...
VITE_OPENFORT_SHIELD_KEY=...
VITE_OPENFORT_FEE_SPONSORSHIP_ID=pol_...   # Sepolia policy → sponsored (gasless) txs
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
```

## 4. Run it

```bash
pnpm dev
```

Open [http://localhost:5182](http://localhost:5182). Sign in with email, create a passkey
wallet, tap **Get test USDC** to mint, **Shield** it into cUSDC, then **Deposit** into the
vault. Tap the pending batch to watch it settle and **claim** your shares, and hit
**Reveal** to decrypt your balances — shown in cUSDC, growing with yield. **Unshield**
converts cUSDC back to USDC.

## How it works

| Step | What happens | Where |
| ---- | ------------ | ----- |
| Sign in | Email OTP, then a passkey EOA (7702-delegated for gasless) | `@openfort/react` |
| Get USDC | Mint test USDC (the Sepolia `USDCMock` has a public `mint`) | `USDCMock.mint` |
| Shield | Wrap USDC → encrypted cUSDC | `cUSDC.wrap` |
| Earn | Deposit cUSDC into the batch, then `claim` once it settles | `confidentialTransferAndCall` → `claim` |
| Reveal | Decrypt your cUSDC + vault value, shown in cUSDC | `@zama-fhe/sdk` `decryptValues` |
| Unshield | Burn cUSDC, public-decrypt, finalize → USDC | `unwrap` → `finalizeUnwrap` |

Deposits/redeems are **batched**: your encrypted amount joins the current batch, an
operator settles it off-chain (`Open → Dispatched → Finalized`), then you `claim`. The UI
surfaces each batch's status so you can claim when it's ready.

## Project layout

```
src/
  openfort/   Providers.tsx (EOA/passkey + sponsorship), wagmi.ts
  zama/       sdk.ts (ZamaSDK ← Openfort viem clients), confidential.ts (shield/unshield/deposit/redeem/claim/decrypt)
  contracts/  addresses.ts (Sepolia + mainnet), abis.ts
  components/ PhoneFrame.tsx, Dashboard.tsx, BatchStatus.tsx, ui.tsx, styles.ts
  screens/    Auth.tsx (email OTP), Wallets.tsx (create/recover w/ passkey)
```

Addresses and the confidential-vault flow are verified against the Zama vault integration
reference: <https://github.com/enitrat/vault-integration-poc>.
