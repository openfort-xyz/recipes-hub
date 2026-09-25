# AGENTS.md

## Project overview
- Openfort × Zama: shield USDC into Zama's confidential token (cUSDC) and earn private yield in
  the Steakhouse Confidential Morpho vault. Balances, deposits and yield stay encrypted on-chain.
- Frontend-only Vite + React app. `@zama-fhe/sdk` encrypts amounts and decrypts the user's own
  balances in the browser through Zama's public relayer; no Zama account, no backend.
- Ethereum **Sepolia** by default (testnet, Openfort test keys). `VITE_NETWORK=mainnet` points at
  the live mainnet deployment (live keys, plus `VITE_CALIBUR_IMPLEMENTATION`).
- Headless `@openfort/react`: the app's own phone UI drives email OTP and a passkey-recovered
  embedded wallet; the Openfort modal never opens.
- The wallet key is an EOA (Zama's decryption permit is checked with `ecrecover`), EIP-7702
  delegated to Calibur. Every write is a UserOperation sent to Openfort's bundler
  (`https://api.openfort.io/rpc/<chainId>`) and sponsored by a fee sponsorship policy.

## Setup commands
- `pnpm install`
- `cp .env.example .env` and fill it in (see Environment)
- `pnpm dev` (serves on `http://localhost:5182`, `strictPort`)

## Environment
All variables are listed in `.env.example`.
- `VITE_OPENFORT_PUBLISHABLE_KEY` (required): dashboard → Developers → API Keys.
- `VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY` (required): dashboard → Developers → API Keys, Shield
  publishable key. Passkey recovery needs no Shield secret and no backend.
- `VITE_OPENFORT_FEE_SPONSORSHIP_ID` (required): `pol_…` gas sponsorship policy for the chosen
  network. Every write is sponsored by it; without it the app shows the configuration notice.
- `VITE_NETWORK` (optional): `sepolia` (default) or `mainnet`.
- `VITE_RPC_URL` (optional): one RPC for wagmi, the Openfort embedded provider
  (`walletConfig.ethereum.rpcUrls`) and the Zama SDK. Defaults to the chain's public RPC; the
  Zama relayer is flaky behind public nodes.
- `VITE_CALIBUR_IMPLEMENTATION` (optional): Calibur implementation address. Built in for Sepolia
  (`0x0909bABe99b0A5f8C1fbfcD5E2510E6c15082c53`); set it for any other chain, otherwise writes
  throw `No Calibur implementation known for chain <id>`.

## Testing instructions
- `pnpm verify` runs Biome lint and `tsc -b && vite build`. CI runs it on every PR. It catches
  type drift against `@openfort/react`, `wagmi`, `viem` and `@zama-fhe/sdk`; it does not exercise
  any runtime flow.
- Manual runtime testing (needs real keys and a Sepolia policy): email OTP sign-in, passkey
  wallet create and unlock, Get test USDC (mint), Shield (first time batches approve + wrap),
  Deposit, batch status polling and Claim, Reveal (decryption permit), Unshield → finalize.
- Last runtime-verified: #58 (on `@openfort/react` 2.1.0). The bump to 2.1.3 is verified by
  `pnpm verify` only.
- 2026-09-25: `pnpm install` (pnpm 10.30.3, Node 22), `pnpm audit --audit-level=moderate` clean
  after bumping `viem` to 2.55.5 and overriding `axios@<1.18.0` and `ws@<8.21.1` in
  `pnpm-workspace.yaml` (1 low, CVE-2025-14505 in `elliptic`, ignored there; no patched
  release); `pnpm verify` passes; no test script. Runtime flows not re-checked.

## Add this to your app
For a coding agent adding Openfort-sponsored Zama confidential flows to an existing React app.

**Dashboard setup** ([dashboard.openfort.io](https://dashboard.openfort.io))
1. Copy the publishable key and the Shield publishable key (Developers → API Keys).
2. Enable Ethereum Sepolia and the Delegated (EIP-7702) account type.
3. Create a gas sponsorship policy for Sepolia and copy its `pol_…` id.
4. Add your app's origin to allowed domains; passkeys (WebAuthn) need a secure origin
   (`localhost` or HTTPS).

**Install** (exact versions this recipe builds with)
```bash
pnpm add @openfort/react@2.1.3 wagmi@3.6.16 viem@2.55.5 @tanstack/react-query@5.101.0 @zama-fhe/sdk@3.2.0
```

**Files that carry the integration** (copy these, adapt the UI)
- `src/openfort/Providers.tsx`: `QueryClientProvider` → `WagmiProvider` → `OpenfortWagmiBridge` →
  headless `OpenfortProvider` (`connectOnLogin: false`, `accountType: DELEGATED_ACCOUNT`,
  `ethereumFeeSponsorshipId`, `rpcUrls`). `src/openfort/wagmi.ts` builds the wagmi config with
  `getDefaultConfig`.
- `src/openfort/calibur.ts`: viem `SmartAccount` for Calibur (EntryPoint v0.9) plus
  `createSponsoredSender`, which sends batched calls through Openfort's bundler/paymaster with
  `paymasterContext: { policyId }` and retries on the bundler's gas floor.
- `src/openfort/useSponsoredSender.ts`: returns `send(calls)`. Signs the userOpHash raw with the
  embedded wallet, and attaches a `use7702Authorization` authorization while the account has no
  code yet.
- `src/openfort/useEmbeddedWalletClient.ts`: viem wallet client on the active wallet's own
  provider, used for the Zama decryption permit.
- `src/zama/sdk.ts` + `src/zama/confidential.ts`: `ZamaSDK` wired to those viem clients; shield,
  deposit, claim, redeem, unshield, decrypt. Addresses live in `src/contracts/addresses.ts`.

**Steps**
1. Wrap the app in the providers from `Providers.tsx`; keep the wagmi chain, `rpcUrls` and the
   Zama FHE chain on the same RPC.
2. Sign the user in with `useEmailOtpAuth` (`requestEmailOtp` then `signInEmailOtp`), and
   call `useAuthCallback` on the landing screen.
3. With `useEthereumEmbeddedWallet`, `create({ accountType: DELEGATED_ACCOUNT, recoveryMethod:
   RecoveryMethod.PASSKEY })` for a new user or `setActive({ address, recoveryMethod: PASSKEY })`
   for a returning one. Both resolve `{ error }` instead of throwing.
4. Build the runtime: `makeRuntime(usePublicClient(), useEmbeddedWalletClient(),
   useSponsoredSender(publicClient))`, then call the functions in `zama/confidential.ts`.
5. Check it works: the first write (Get test USDC or Shield) lands a UserOperation and installs the
   delegation (`getCode(address)` is no longer `0x`); Reveal prompts one signature and shows
   decrypted balances; the wallet's ETH balance stays 0.

## Openfort primitives
| Primitive | Where in code | Dashboard setup | Docs |
| --- | --- | --- | --- |
| `OpenfortProvider` (headless `walletConfig`, `connectOnLogin: false`, `ethereum.accountType`, `ethereum.ethereumFeeSponsorshipId`, `ethereum.rpcUrls`) | `src/openfort/Providers.tsx` | Publishable key, Shield publishable key | [React SDK](https://www.openfort.io/docs/products/embedded-wallet/react) |
| `OpenfortWagmiBridge`, `getDefaultConfig` (`@openfort/react/wagmi`) | `src/openfort/Providers.tsx`, `src/openfort/wagmi.ts` | None | [Ethereum wallets](https://www.openfort.io/docs/products/embedded-wallet/react/wallet/ethereum) |
| `useEmailOtpAuth` | `src/screens/Auth.tsx` | Email OTP enabled | [useEmailOtpAuth](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useEmailOtpAuth) |
| `useAuthCallback` | `src/screens/Auth.tsx` | None | [useAuthCallback](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useAuthCallback) |
| `useEthereumEmbeddedWallet` (`create`, `setActive`, `activeWallet.getProvider`) | `src/screens/Wallets.tsx`, `src/openfort/useEmbeddedWalletClient.ts`, `src/openfort/useSponsoredSender.ts` | Delegated (EIP-7702) account type on Sepolia | [useEthereumEmbeddedWallet](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useEthereumEmbeddedWallet) |
| Passkey recovery (`RecoveryMethod.PASSKEY`) | `src/screens/Wallets.tsx` | Shield publishable key; secure origin | [Recovery methods](https://www.openfort.io/docs/configuration/recovery-methods) |
| `use7702Authorization` (`signAuthorization`) | `src/openfort/useSponsoredSender.ts` | Delegated account type | [EIP-7702 authorization](https://www.openfort.io/docs/products/embedded-wallet/react/wallet/actions/eip-7702-authorization) |
| `useOpenfort` (`client.embeddedWallet.signMessage` with `hashMessage: false`) | `src/openfort/useSponsoredSender.ts`, `src/App.tsx` | None | [useOpenfort](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useOpenfort) |
| `useUser`, `useSignOut` | `src/App.tsx`, `src/screens/Wallets.tsx`, `src/components/Dashboard.tsx` | None | [useUser](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useUser), [useSignOut](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useSignOut) |
| Bundler + paymaster RPC `https://api.openfort.io/rpc/<chainId>` (`paymasterContext.policyId`) | `src/openfort/calibur.ts` | Publishable key as bearer token | [Bundler](https://www.openfort.io/docs/products/infrastructure/bundler), [Paymaster](https://www.openfort.io/docs/products/infrastructure/paymaster/ethereum) |
| Gas sponsorship policy (`pol_…`) | `VITE_OPENFORT_FEE_SPONSORSHIP_ID` | Policies → gas sponsorship for Sepolia | [Gas sponsorship](https://www.openfort.io/docs/configuration/gas-sponsorship) |
| Calibur implementation (Openfort "CaliburV9", EntryPoint v0.9) | `src/openfort/calibur.ts` | None | [Contract addresses](https://www.openfort.io/docs/configuration/addresses) |

## Failure modes
| Error | Cause | Fix |
| --- | --- | --- |
| `Transaction creation failed … Details: Network Error` | A delegated account's first write through the SDK's server-side path (`POST /v1/transaction_intents`) needs a 7702 authorization that takes ~30s to build; the edge cuts the request at 15s, so the account never delegates. | Send writes as client-built UserOperations with the authorization attached (`useSponsoredSender` + `calibur.ts`); built client-side it takes ~1.4s. |
| `SliceOutOfBounds()` | Openfort's Calibur build rejects a bare 65-byte signature on the UserOperation. | Wrap it as `abi.encode(ROOT_KEY_HASH, signature, hookData)` (`wrapSignature` in `calibur.ts`). |
| `AA24 signature error` | The cached smart account kept the previous wallet's address as `sender` after a wallet switch, while the embedded signer signed with the new key. | Take the sender address from `useEthereumEmbeddedWallet`, rebuild the sender when it changes, and recover each signature against it before submitting. |
| `The active wallet changed before the operation could run` | wagmi's connector provider is pinned to the address it was built for and rejects requests once the active wallet moves on (surfaced inside a decryption as `Credential signing failed …`). | Build the viem wallet client from `activeWallet.getProvider()` (`useEmbeddedWalletClient`). |
| `maxPriorityFeePerGas must be at least 20501760 (current 20000000)` | The bundler enforces a gas floor above the chain's suggestion and moves it with the base fee. | Parse the figure from the error and retry with 30% headroom (`createSponsoredSender.send`). |
| `chainId 1 is not available in test mode` | `VITE_NETWORK=mainnet` with Openfort test keys. | Use Sepolia with test keys, or live keys for mainnet. |

## Recipe notes
- Calibur details (none documented elsewhere): EntryPoint v0.9 (not v0.8), callData is
  `executeUserOp` selector `0x8dd7712f` ++ `abi.encode(BatchedCall)`, signature over the raw
  userOpHash (no EIP-191 prefix), and a structurally valid stub signature for gas estimation.
- After the first sponsored operation installs the delegation, the SDK's own delegation check
  passes, so its native send path works for that account too.
- The first Shield batches approve + wrap into one UserOperation (atomic).
- Vault deposits and redeems are batched by an off-chain operator. The batcher returns state 3
  for most settled batches on Sepolia; anything ≥ 2 is claimable. The pending list polls every
  30s and the batch page every 15s.
- `getDefaultConfig` sets wagmi `ssr: true`, so the first render reports `reconnecting`; `App`
  shows a spinner for it instead of the unlock screen.
- The Vite build needs no `@vite-ignore` patch on `@openfort/react` 2.1.3 (no dynamic-import
  warnings in `vite build` or on dev start).
- `viem` stays on 2.55.5: `@wagmi/core` 3.5.0 (wagmi 3.6.16) imports Tempo zone actions that
  viem 2.55.8 removed and `viem/tempo/zones` that 2.56.0 removed, so `vite build` warns
  `IMPORT_IS_UNDEFINED` or fails on newer viem until wagmi moves.
- Addresses and the vault flow follow the Zama vault integration reference:
  https://github.com/enitrat/vault-integration-poc

## Code style
- Vite + TypeScript, Biome (`pnpm lint`, `pnpm check`): single quotes, no semicolons, 2-space,
  100 col.
- Functional components and hooks; styles are inline objects from `src/components/styles.ts`.

## PR instructions
- Title format: `[zama-confidential-yield] <summary>`.
- Run `pnpm verify` before requesting review; document env changes in `README.md`, `.env.example`
  and this file.
