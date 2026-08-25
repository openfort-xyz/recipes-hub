# Openfort × Zama — Earn private yield

Shield USDC into Zama's confidential token (**cUSDC**) and earn private yield in the
**Steakhouse Confidential** Morpho vault, from an Openfort embedded wallet. Balances,
deposits and yield stay **encrypted** on-chain.

The wallet is an **EOA + passkey**. It has to be an EOA: Zama's relayer `ecrecover`s the
decryption permit against your address, so a 4337 smart account would decrypt nothing.
Set `VITE_OPENFORT_FEE_SPONSORSHIP_ID` and that same EOA is EIP-7702-delegated so an
Openfort **paymaster** sponsors every transaction; leave it empty and the EOA pays its
own gas from a Sepolia faucet.

Writes are submitted as **sponsored UserOperations** through Openfort's bundler and
paymaster (`api.openfort.io/rpc/<chainId>`) rather than through `POST /v1/transaction_intents`.
The delegated account's first write has to carry an EIP-7702 authorization, and building
that server-side takes ~30s while the edge cuts the request at 15s — so the account never
delegates and every sponsored write fails as `Transaction creation failed … Network Error`.
Built client-side it takes ~1.4s, and the delegation rides along in the same operation.

It delegates to **Calibur**, the implementation Openfort uses natively, so once the first
operation lands the SDK's own delegation check passes and its normal send path works too.
See [`src/openfort/calibur.ts`](src/openfort/calibur.ts) — EntryPoint v0.9, callData is
`executeUserOp` ++ `abi.encode(BatchedCall)`, and the signature is wrapped as
`abi.encode(ROOT_KEY_HASH, signature, hookData)`.

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
VITE_OPENFORT_FEE_SPONSORSHIP_ID=          # empty → self-paid EOA; pol_… → gasless 7702
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

### Headless Openfort

The phone UI is this app's own — Openfort's modal never opens. `OpenfortProvider` takes a
`walletConfig` and no `uiConfig`, and every step is a hook, following the
[headless quickstart](https://github.com/openfort-xyz/openfort-react/tree/main/examples/quickstarts/headless):

| Step | Hook | File |
| ---- | ---- | ---- |
| Sign in | `useEmailOtpAuth` | `screens/Auth.tsx` |
| Create / unlock a wallet | `useEthereumEmbeddedWallet` → `create` / `setActive` | `screens/Wallets.tsx` |
| Read the chain | `usePublicClient` (wagmi) | `components/Dashboard.tsx` |
| Write the chain, sponsored | `use7702Authorization` + viem `bundlerClient` | `openfort/calibur.ts` |

`connectOnLogin: false` keeps the SDK from picking a wallet behind the login, so the
passkey prompt only ever fires from the button that asks for it. Wallet actions resolve
with `{ error }` rather than rejecting — branch on the result, don't wrap them in `try`.

`OpenfortWagmiBridge` connects the embedded wallet as a wagmi connector, so the Zama SDK
gets ordinary viem clients (`makeRuntime` in `zama/sdk.ts`) and nothing in the app handles
an EIP-1193 provider directly.

## Project layout

```
src/
  openfort/   Providers.tsx (headless config: delegated account + sponsorship), wagmi.ts
  zama/       sdk.ts (ZamaSDK ← wagmi's viem clients), confidential.ts (shield/unshield/deposit/redeem/claim/decrypt)
  contracts/  addresses.ts (Sepolia + mainnet, RPC), abis.ts
  components/ PhoneFrame.tsx, Dashboard.tsx, BatchStatus.tsx, ui.tsx, styles.ts
  screens/    Auth.tsx (email OTP), Wallets.tsx (create/recover w/ passkey)
```

Addresses and the confidential-vault flow are verified against the Zama vault integration
reference: <https://github.com/enitrat/vault-integration-poc>.
