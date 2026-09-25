# 7702 Sample - Agent Guide

## Project overview
Next.js 15 + TypeScript app. A user signs in with Openfort (email OTP, Google or guest), gets an embedded EOA secured by a passkey, signs an EIP-7702 authorization that delegates the EOA to the eth-infinitism `Simple7702Account` (`0xe6Cae83BdE06E4c305530e199D7217f42808555B`), and sends a gasless ERC-4337 UserOperation through Openfort's bundler and paymaster. The authorization rides in the same UserOperation, so delegation and the first call land in one transaction. Chain: **Base Sepolia (84532), testnet**.

This is the "delegate to a different implementation" path from the Openfort docs: the embedded wallet stays `AccountTypeEnum.EOA` and the UserOperation is built client-side with viem. The SDK's native path (`AccountTypeEnum.DELEGATED_ACCOUNT`, delegation to Calibur, sends through transaction intents) is not used here.

## Setup commands
- Node.js 22+ (`node -v`), pnpm 10 (pinned via `packageManager`).
- `cd 7702 && pnpm install`
- `cp .env.example .env.local` and fill in the values (see Environment).
- `pnpm dev` → http://localhost:3000
- `pnpm build`, `pnpm lint`, `pnpm check` (Biome format + lint + organize imports, writes fixes).

## Environment
All three are read in the browser (`NEXT_PUBLIC_*`) and all are required. See `.env.example`.

| Variable | Where to get it | Read in |
| --- | --- | --- |
| `NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY` | Dashboard > API keys (`pk_test_...`) | `src/components/Providers.tsx`, `src/components/UserOperation.tsx` (Bearer token for the bundler/paymaster RPC) |
| `NEXT_PUBLIC_OPENFORT_SHIELD_PUBLISHABLE_KEY` | Dashboard > API keys, Shield section | `src/components/Providers.tsx` |
| `NEXT_PUBLIC_OPENFORT_FEE_SPONSORSHIP_ID` | Dashboard > Gas sponsorships (`pol_...`), must cover Base Sepolia | `src/components/Providers.tsx`, `src/components/UserOperation.tsx` (`paymasterContext.policyId`) |

## Testing instructions
- `pnpm verify` = `biome lint .` + `next build` (build includes the TypeScript check). It covers types against `@openfort/react` 2.1.3 / viem / wagmi and that the webpack build resolves. It must finish with no warnings.
- Not covered by `verify`, test manually with real keys:
  1. `pnpm dev`, open http://localhost:3000, sign in (email OTP, Google or guest) and create the passkey.
  2. Click **Send 7702 UserOp**. Expect a transaction hash card; open it on Basescan.
  3. On Basescan the EOA should show code `0xef0100e6cae83bde06e4c305530e199d7217f42808555b` (the 7702 delegation designator) and an ETH balance of 0: the paymaster paid.
- Last runtime check: not run in the 2026-09-23 SDK upgrade (2.0.1 → 2.1.3); only `verify` was run.
- 2026-09-25: `pnpm install`, `pnpm audit --audit-level=moderate` (clean after overriding `axios@<1.18.0` to `>=1.18.0` in `pnpm-workspace.yaml`; `@openfort/shield-js` pins 1.15.0) and `pnpm verify` run; no test script exists; runtime flow not run.

## Add this to your app
For a coding agent adding EIP-7702 gasless UserOperations to an existing React app that uses (or will use) Openfort embedded wallets.

**Dashboard setup**
1. Project on https://dashboard.openfort.io. Copy the publishable key and the Shield publishable key (API keys page).
2. Gas sponsorships > Add gas sponsorship, sponsoring the target chain (here Base Sepolia). Copy the `pol_...` ID. Add balance credit if it is a live-mode project.
3. Nothing else: passkey recovery needs no Shield secret or backend endpoint.

**Packages** (pin exactly; wagmi major must match `@openfort/react`):
```sh
pnpm add @openfort/react@2.1.3 wagmi@3 viem@2 @tanstack/react-query@5
pnpm add @solana/kit@6 @solana/kora@0.2 @solana-program/token@0.12 @solana-program/compute-budget@0.13
```
The Solana packages are peer dependencies of `@openfort/react`; install them even for an EVM-only app.

**Files that carry the integration**
| File | Role |
| --- | --- |
| `src/components/Providers.tsx` | `QueryClientProvider` > `WagmiProvider` (config with `embeddedWalletConnector()`) > `OpenfortWagmiBridge` > `OpenfortProvider` (`accountType: EOA`, passkey recovery). |
| `src/components/UserOperation.tsx` | Activates the embedded wallet, signs the 7702 authorization, builds the `Simple7702Account` and sends the sponsored UserOperation. |
| `next.config.js` | Next.js only: webpack fallbacks for optional wagmi connector peers. Vite needs none of it. |
| `src/app/layout.tsx` | Next.js only: `export const dynamic = 'force-dynamic'` so the provider never prerenders without a key. |

**Steps**
1. Wrap the app as in `Providers.tsx`. Keep `accountType: AccountTypeEnum.EOA`: a 7702-delegated account keeps the EOA address, and the UserOperation below does the delegation.
2. Render `<OpenfortButton />` for sign-in. After sign-in, make sure an embedded wallet is active (`useEthereumEmbeddedWallet().setActive`), then use `useWalletClient()` from wagmi.
3. Build the account: `toSimple7702SmartAccount({ client: publicClient, owner })` from `viem/account-abstraction`, where `owner` is `{ address, signMessage, signTypedData }` forwarding to the wagmi wallet client (viem types `owner` as a local account; cast with `as never`).
4. Create `createPaymasterClient` and `createBundlerClient` against `https://api.openfort.io/rpc/<chainId>` with header `Authorization: Bearer <publishable key>`.
5. Sign the authorization: `use7702Authorization().signAuthorization({ contractAddress: '0xe6Cae83BdE06E4c305530e199D7217f42808555B', chainId, nonce })`, with `nonce = publicClient.getTransactionCount({ address: eoa })`. It resolves `{ status: 'success', authorization } | { status: 'error', error }`; it does not throw.
6. `bundlerClient.sendUserOperation({ calls, authorization, paymasterContext: { policyId: '<pol_...>' } })`, then `waitForUserOperationReceipt`.

**Check it works**: the receipt's `transactionHash` resolves on the explorer, the EOA's code starts with `0xef0100`, and its native balance is unchanged (0 on a fresh wallet).

## Openfort primitives
| Primitive | Where in code | Dashboard setup | Docs |
| --- | --- | --- | --- |
| `OpenfortProvider` (`walletConfig.shieldPublishableKey`, `walletConfig.ethereum.accountType: EOA`, `walletConfig.ethereum.ethereumFeeSponsorshipId`) | `src/components/Providers.tsx` | Publishable key, Shield publishable key, gas sponsorship | [Wallet configuration](https://www.openfort.io/docs/products/embedded-wallet/react/wallet), [Ethereum](https://www.openfort.io/docs/products/embedded-wallet/react/wallet/ethereum) |
| `embeddedWalletConnector`, `OpenfortWagmiBridge` (`@openfort/react/wagmi`) | `src/components/Providers.tsx` | None | [Quickstart React](https://www.openfort.io/docs/products/embedded-wallet/react) |
| `uiConfig.authProviders` (`EMAIL_OTP`, `GUEST`, `GOOGLE`), `uiConfig.walletRecovery.defaultMethod: PASSKEY` | `src/components/Providers.tsx` | Enable email, guest and Google auth on the project | [Openfort UI](https://www.openfort.io/docs/products/embedded-wallet/react/ui), [Recovery methods](https://www.openfort.io/docs/configuration/recovery-methods) |
| `OpenfortButton` | `src/components/UserOperation.tsx` | None | [Openfort UI](https://www.openfort.io/docs/products/embedded-wallet/react/ui) |
| `useUser`, `useSignOut`, `useOpenfort` | `src/components/UserOperation.tsx` | None | [useUser](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useUser), [useSignOut](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useSignOut), [useOpenfort](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useOpenfort) |
| `useEthereumEmbeddedWallet` (`wallets`, `activeWallet`, `setActive`) | `src/components/UserOperation.tsx` | None | [useEthereumEmbeddedWallet](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useEthereumEmbeddedWallet) |
| `use7702Authorization().signAuthorization` | `src/components/UserOperation.tsx` | None | [use7702Authorization](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/use7702Authorization), [Sign EIP-7702 authorization](https://www.openfort.io/docs/products/embedded-wallet/react/wallet/actions/eip-7702-authorization) |
| Bundler + paymaster RPC `https://api.openfort.io/rpc/84532` (Bearer publishable key) | `src/components/UserOperation.tsx` | None | [Sign EIP-7702 authorization](https://www.openfort.io/docs/products/embedded-wallet/react/wallet/actions/eip-7702-authorization#use-the-authorization-in-a-transaction), [Authentication](https://www.openfort.io/docs/api-reference/authentication) |
| Gas sponsorship (`pol_...`, sent as `paymasterContext.policyId`) | `src/components/UserOperation.tsx`, `src/components/Providers.tsx` | Gas sponsorships > Add gas sponsorship for Base Sepolia | [Gas sponsorship](https://www.openfort.io/docs/configuration/gas-sponsorship) |
| `Simple7702Account` implementation `0xe6Cae83BdE06E4c305530e199D7217f42808555B` | `src/components/UserOperation.tsx` | None | [Entity addresses](https://www.openfort.io/docs/configuration/addresses), [Account types](https://www.openfort.io/docs/products/embedded-wallet/account-types) |

## Failure modes
| Error | Cause | Fix |
| --- | --- | --- |
| `Cannot read properties of undefined (reading 'address')` on first load (page 500s) | The `setActive` effect read `wallets[0].address` before any embedded wallet existed. | Fixed in c039320: `wallets[0]?.address` in the dependency array. Keep the optional chaining if you copy the effect. |
| `Module not found: Can't resolve '@walletconnect/ethereum-provider'` (also `@coinbase/wallet-sdk`, `@safe-global/safe-apps-provider`, `@safe-global/safe-apps-sdk`) during `next build` | `@openfort/react/wagmi` pulls in `@wagmi/connectors`, which imports optional connector peers this app does not install. | Set each to `false` in webpack `resolve.fallback` (`next.config.js`). Vite does not need this. |
| `Insufficient funds: the wallet doesn't have enough native token` | Sending through the SDK or wagmi (`useSendTransaction`) with `accountType: EOA`: a plain EOA sends a normal transaction, which a paymaster cannot sponsor. Seen in the Megapot demo (`@openfort/react` 2.1.0, Base Sepolia), not reproduced in this recipe. | Send through the bundler as in `UserOperation.tsx`. The gas sponsorship is not the problem. |
| `Transaction creation failed. ... Details: Network Error` (viem `TransactionRejectedRpcError`, code `-32003`) on a new wallet's first send | Native `DELEGATED_ACCOUNT` path: the server-side transaction intent build for a not-yet-delegated account takes about 30s and the edge returns 504 without CORS headers. Seen in the Zama confidential-yield recipe (ETH Sepolia), not reproduced in this recipe. | Build the UserOperation client-side against `https://api.openfort.io/rpc/<chainId>`, as this recipe does (about 1.5s). |

## Upgrade notes
- **2026-09-23**: `@openfort/react` 2.0.1 → 2.1.3. No API used here changed between these versions (2.1.x adds onramp funding, Solana sponsorship fixes and a single owner for passkey recovery, so a login no longer prompts for the passkey twice). The owner passed to `toSimple7702SmartAccount` is now a plain `{ address, signMessage, signTypedData }` object instead of `toAccount(...)` with two `as any` casts; viem only reads those three members. `next.config.js` now also stubs `@walletconnect/ethereum-provider`, `@coinbase/wallet-sdk` and the two `@safe-global` packages, which `next build` warned about. `biome.json` drops `"recommended": true` (the default; Biome 2.5 deprecates the field).
- Next.js stays on **15** (wagmi/walletconnect needs the webpack shim in `next.config.js`, which Next 16's Turbopack rejects). `app/layout.tsx` sets `export const dynamic = 'force-dynamic'` because `@openfort/react` throws if it renders without a publishable key at static prerender.
- Keep `wagmi` on `^3` and `viem` on `^2` (`@openfort/react` 2.x needs viem `>=2.52.2`).
- The old node polyfill deps (`crypto-browserify`, `stream-browserify`, etc.) plus `dotenv` and `valtio` were removed as unused; `next.config.js` only keeps `fs/net/tls: false`, the optional-peer stubs and the `pino-pretty` external.
- Biome 2.4+: config uses `files.includes` (not `experimentalScannerIgnores`) and `css.parser.tailwindDirectives`.

## Code style
- Next.js 15, React 19, TypeScript, Tailwind 4 with the shared shadcn token block.
- Biome: single quotes, no semicolons, 2-space indent, 120 columns, trailing commas (ES5). Run `pnpm check` to auto-fix.
- Functional components with hooks; wagmi for wallet state, viem for the ERC-4337 clients.

## PR instructions
- Title format: `[7702] <summary>`
- Document environment variable changes in `README.md`, `.env.example` and this file.
- `pnpm verify` must pass with no warnings; run the manual flow above before requesting review when runtime code changes.
