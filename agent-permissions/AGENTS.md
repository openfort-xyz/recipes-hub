# Agent Permissions Sample - Agent Guide

## Project overview
Next.js 15 app demonstrating Dollar-Cost Averaging (DCA) via delegated transaction execution with time-limited permissions on **Base Sepolia (testnet)**. The user signs in with email OTP and gets an Openfort embedded wallet (Calibur smart account, EIP-7702 + ERC-4337). When DCA is enabled, the server creates an Openfort backend wallet as the agent, the user registers that agent as a non-admin Calibur key with a 5-minute expiration, and a Vercel cron submits gas-sponsored UserOperations signed by the agent key every minute (USDC out, mock WETH minted back as a simulated swap).

## Setup commands
- Node 22+, pnpm (version pinned by `packageManager`).
- `pnpm install`
- `cp .env.example .env.local` and fill in the values (see Environment).
- `pnpm dev` (http://localhost:3000), `pnpm build`, `pnpm verify`.
- Biome: `pnpm check` (format + lint + organize imports, writes), `pnpm lint`, `pnpm format`.

## Environment
Every variable is listed with a one-line comment in `.env.example`.

| Variable | Side | Required | Used in |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY` | client + server | yes | `Providers.tsx`; `lib/auth.ts`; Bearer token for the Openfort bundler/paymaster RPC in `api/dca/execute` |
| `NEXT_PUBLIC_OPENFORT_SHIELD_PUBLISHABLE_KEY` | client | yes | `Providers.tsx` |
| `NEXT_PUBLIC_OPENFORT_FEE_SPONSORSHIP_ID` | client + server | yes | `Providers.tsx` (`ethereumFeeSponsorshipId`); `paymasterContext.policyId` in `api/dca/execute` |
| `OPENFORT_SECRET_KEY` | server | yes | every API route |
| `OPENFORT_WALLET_SECRET` | server | yes | backend wallet create/sign in `api/dca`, `api/dca/execute`, `api/airdrop` |
| `OPENFORT_BACKEND_WALLET_ID` | server | for airdrop | `api/airdrop` (funded Base Sepolia USDC wallet) |
| `CRON_SECRET` | server | on Vercel | `api/dca/execute` GET; unset means the cron endpoint is unauthenticated |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | server | yes | `lib/dcaStore.ts` |

## Testing instructions
- `pnpm verify` runs `biome lint` and `next build` (which also type-checks). CI runs it on every PR. There are no unit tests.
- `pnpm verify` does not exercise any runtime flow. These need real keys and are checked manually:
  1. `pnpm dev`, open http://localhost:3000, sign in with email OTP.
  2. Create a wallet (passkey, or password when passkeys are unavailable) or recover an existing one.
  3. Airdrop testnet USDC (needs a funded `OPENFORT_BACKEND_WALLET_ID`) or use the Circle faucet.
  4. Enable DCA: the app sends one sponsored transaction that registers the agent key, then calls `POST /api/dca/execute` once. A purchase should appear in the history and the WETH balance should increase.
  5. Locally the cron does not run; call `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/dca/execute` to trigger a round. After 5 minutes the key expires and the next round removes the agent.
- Last runtime check: none recorded for `@openfort/react` 2.1.3 / `@openfort/openfort-node` 0.12.2 (only `pnpm verify` was run on 2026-09-23).

## Add this to your app
For a coding agent adding "a backend agent acts on the user's smart account under a time-limited key" to an existing Next.js (App Router) app with Openfort embedded wallets.

**Dashboard setup** (https://dashboard.openfort.io)
1. API keys: copy the publishable key, secret key and Shield publishable key; generate a wallet secret.
2. Gas sponsorship (https://dashboard.openfort.io/policies): create a fee sponsorship on Base Sepolia that sponsors the user's account. The same ID is sent in `paymasterContext.policyId` for the agent's UserOperations, which run from the user's account address.
3. Optional: create a backend wallet and fund it with Base Sepolia USDC if you want the airdrop route.

**Packages** (versions pinned in this recipe)
```bash
pnpm add @openfort/react@2.1.3 @openfort/openfort-node@0.12.2 wagmi@^3.6.20 viem@^2.52.2 @tanstack/react-query@^5.101.1
pnpm add @upstash/redis@^1.38.0   # or any store for agent configs
```
Also install the Solana peers, even in an EVM-only app: `OpenfortProvider` imports its Solana module statically, and `next build` fails without them.
```bash
pnpm add @solana/kit@6.10.0 @solana/kora@0.2.1 @solana-program/token@0.12.0 @solana-program/compute-budget@0.13.0
```
With webpack (Next 15), set the optional wagmi connector peers to `false` in `resolve.fallback` and externalize `pino-pretty`; copy `next.config.js`.

**Files that carry the integration**
| File | Role |
| --- | --- |
| `src/components/Providers.tsx` + `src/lib/wagmiConfig.ts` | `QueryClientProvider` > `WagmiProvider` (`embeddedWalletConnector`) > `OpenfortWagmiBridge` > `OpenfortProvider` with `walletConfig.shieldPublishableKey` and `walletConfig.ethereum.ethereumFeeSponsorshipId` |
| `src/lib/calibur/index.ts` | Self-contained Calibur helpers: key hashing, settings packing, `register`/`update`/`revoke` call encoding, onchain key reads, and `createCaliburSessionAccount` (a viem `SmartAccount` that signs UserOps with a registered non-admin key). Copy as is. |
| `src/components/cards/balance.tsx` (`handleDcaToggle`) | Client: asks the server for an agent address, then sends one transaction to the user's own address that batches `register(key)` + `update(keyHash, { isAdmin: false, expiration })` via `encodeExecute` |
| `src/app/api/dca/route.ts` | Server: verifies the caller owns the address, creates the agent with `openfort.accounts.evm.backend.create()`, stores `agentId`/`agentAddress` |
| `src/app/api/dca/execute/route.ts` + `src/lib/auth.ts` | Server: loads the agent with `openfort.accounts.evm.backend.get`, wraps it with viem `toAccount`, builds the Calibur session account and sends a sponsored UserOperation through `https://api.openfort.io/rpc/84532` (bundler + paymaster). `auth.ts` verifies the user's access token with `openfort.iam.getSession` and ownership with `openfort.accounts.list({ user })`. |

**Steps**
1. Add the provider tree from `Providers.tsx` and the wagmi config; set the three `NEXT_PUBLIC_OPENFORT_*` variables.
2. Create the user's wallet with `useEthereumEmbeddedWallet().create({ accountType: AccountTypeEnum.SMART_ACCOUNT, recoveryMethod })` (see `wallets.tsx`), so the account is a Calibur account that accepts `execute` self-calls.
3. Copy `src/lib/calibur/index.ts` and `src/lib/auth.ts`.
4. Add a server route that creates the agent backend wallet and returns its address (`api/dca/route.ts`). Send the user's Openfort access token (`useUser().getAccessToken()`) as `Authorization: Bearer`.
5. On the client, encode the agent address as a Secp256k1 key (`padHex(address, { size: 32 })`) and send `encodeExecute([encodeRegisterKey(key), encodeUpdateKeySettings(hashKey(key), { isAdmin: false, expiration, hook: zeroAddress })])` to the user's own address with wagmi `useSendTransaction`.
6. Add the executor route (`api/dca/execute/route.ts`): check the key is still active onchain (`getRegisteredKeys` + `getCaliburKeySettings`), then `createBundlerClient(...).sendUserOperation({ calls })`. Replace the demo calls (USDC transfer to a burn address + mock WETH mint) with your own.
7. Schedule the executor (`vercel.json` cron, protected by `CRON_SECRET`).

**Check it works**: after step 5, `GET /api/dca?address=<user>` returns `enabled: true` with the agent address and `expiresAt`; a call to the executor returns a `userOpHash` and the transaction shows on https://sepolia.basescan.org from the user's address. After the expiration the executor refuses with `Agent key not active onchain`.

## Openfort primitives
| Primitive | Where in code | Dashboard setup | Docs |
| --- | --- | --- | --- |
| `OpenfortProvider` (`walletConfig.shieldPublishableKey`, `walletConfig.ethereum.ethereumFeeSponsorshipId`, `accountType`) | `src/components/Providers.tsx` | Publishable key, Shield publishable key, fee sponsorship | https://www.openfort.io/docs/products/embedded-wallet/react/wallet/ethereum |
| `OpenfortWagmiBridge`, `embeddedWalletConnector` | `src/components/Providers.tsx`, `src/lib/wagmiConfig.ts` | none | https://www.openfort.io/docs/products/embedded-wallet/react/wallet/ethereum |
| `useEmailOtpAuth` | `src/components/cards/auth.tsx` | Email login enabled | https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useEmailOtpAuth |
| `useAuthCallback` | `src/components/cards/auth.tsx` | none | https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useAuthCallback |
| `useOpenfort` | `src/components/cards/main.tsx` | none | https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useOpenfort |
| `useUser` (`isAuthenticated`, `getAccessToken`) | `main.tsx`, `wallets.tsx`, `balance.tsx` | none | https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useUser |
| `useEthereumEmbeddedWallet` (`create`, `setActive`, `wallets`, `activeWallet`) | `main.tsx`, `wallets.tsx` | Shield (passkey / password recovery) | https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useEthereumEmbeddedWallet |
| `AccountTypeEnum.SMART_ACCOUNT` (Calibur) | `wallets.tsx` | none | https://www.openfort.io/docs/products/embedded-wallet/account-types |
| `RecoveryMethod.PASSKEY` / `PASSWORD` | `wallets.tsx` | Shield keys | https://www.openfort.io/docs/configuration/recovery-methods |
| `useSignOut` | `balance.tsx` | none | https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useSignOut |
| Sponsored transaction through wagmi `useSendTransaction` | `balance.tsx` (key registration) | Fee sponsorship on Base Sepolia | https://www.openfort.io/docs/products/embedded-wallet/react/wallet/actions/send-transaction/ethereum |
| `openfort.iam.getSession({ accessToken })` | `src/lib/auth.ts` | Secret key | https://www.openfort.io/docs/products/embedded-wallet/server/access-token |
| `openfort.accounts.list({ user })` | `src/lib/auth.ts` | Secret key | https://www.openfort.io/docs/products/server/accounts |
| `openfort.accounts.evm.backend.create()` | `src/app/api/dca/route.ts` | Secret key + wallet secret | https://www.openfort.io/docs/products/server/accounts |
| `openfort.accounts.evm.backend.get({ id })` + `sign`/`signMessage`/`signTransaction`/`signTypedData` via viem `toAccount` | `api/dca/execute/route.ts`, `api/airdrop/route.ts` | Wallet secret; funded backend wallet for airdrop | https://www.openfort.io/docs/products/server/evm/viem-integration |
| Openfort bundler + paymaster RPC `https://api.openfort.io/rpc/{chainId}` (`paymasterContext.policyId`) | `api/dca/execute/route.ts` | Fee sponsorship | https://www.openfort.io/docs/products/infrastructure/bundler |
| Fee sponsorship | `.env.example` `NEXT_PUBLIC_OPENFORT_FEE_SPONSORSHIP_ID` | https://dashboard.openfort.io/policies | https://www.openfort.io/docs/configuration/gas-sponsorship |
| Wallet secret | `.env.example` `OPENFORT_WALLET_SECRET` | Generate in API keys | https://www.openfort.io/docs/products/server/setup |

## Failure modes
| Error | Cause | Fix |
| --- | --- | --- |
| `UnknownError: Something went wrong. Please contact support at support@openfort.xyz (cause: _MissingWalletSecretError: Wallet secret not configured. Required for: POST /v2/accounts/backend)` | `OPENFORT_WALLET_SECRET` is empty, so `accounts.evm.backend.create()` in `/api/dca` fails (from the Openfort triage book). | Set `OPENFORT_WALLET_SECRET` to the project's existing wallet secret. Do not rotate it to get a new one: rotation invalidates the old secret for every running client. |
| `Module not found: Can't resolve '@solana/kit'` (also `@solana-program/token`, `@solana/kora`) | `next build` with `@openfort/react` 2.1.3 but without its Solana peers. The provider imports its Solana confirmation module statically, so EVM-only apps still need them. | Install `@solana/kit`, `@solana/kora`, `@solana-program/token` and `@solana-program/compute-budget` (versions in `package.json`). |
| `OPENFORT_SECRET_KEY is not configured` | Server env missing the secret key. | Set `OPENFORT_SECRET_KEY` in `.env.local` or the Vercel project. |
| `Invalid or expired session` (401) | The Bearer token failed `openfort.iam.getSession` (the route logs the underlying error as `[auth] iam.getSession failed:`). | Send a fresh `useUser().getAccessToken()` value; check the server log for the cause. |
| `Address not owned by authenticated user` (403) | The `address` in the request is not one of the signed-in user's Openfort accounts. | Send the active embedded wallet address from wagmi `useAccount`. |
| `Agent key not active onchain` (400) | The agent key was never registered, or its 5-minute expiration passed. | Enable DCA again; it registers a fresh key. |
| `No DCA agent configured` (400) | `POST /api/dca/execute` ran before `POST /api/dca` stored an agent. | Call `POST /api/dca` with `enabled: true` first. |

## Calibur key model
- Keys are identified by `keccak256(abi.encode(keyType, keccak256(publicKey)))`.
- Settings are a bit-packed `uint256`: `isAdmin` (bit 200), `expiration` (bits 160-199, 0 = never), `hook` (bits 0-159).
- The DCA agent uses a `Secp256k1` key whose public key is the agent address left-padded to 32 bytes, `isAdmin: false`, 5-minute expiration. Revoking or expiring the key stops the cron; the store entry is removed on the next round.

### Contracts (Base Sepolia)
- **Calibur**: `0x000000009b1d0af20d8c6d0a44e162d11f9b8f00`
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Mock WETH**: `0xbabe0001489722187FbaF0689C47B2f5E97545C5`

## Upgrade notes
- **September 2026** (`@openfort/react` 2.0.1 to 2.1.3, `@openfort/openfort-node` 0.11.0 to 0.12.2): env vars renamed to the shared names (`NEXT_PUBLIC_SHIELD_PUBLISHABLE_KEY` to `NEXT_PUBLIC_OPENFORT_SHIELD_PUBLISHABLE_KEY`, `NEXT_PUBLIC_FEE_SPONSORSHIP_ID` to `NEXT_PUBLIC_OPENFORT_FEE_SPONSORSHIP_ID`, `OPENFORT_WALLET_SECRET_KEY` to `OPENFORT_WALLET_SECRET`). The agent wallet is created with `openfort.accounts.evm.backend.create()` instead of the standalone `createBackendWallet`. The `@solana/*` packages stay: removing them fails `next build` with `Module not found: Can't resolve '@solana/kit'`.
- **June 2026**: `walletConfig` nests `accountType` / `ethereumFeeSponsorshipId` under `ethereum: { ... }`. Stays on Next.js 15 (the webpack walletconnect shim is incompatible with Next 16 Turbopack); `app/layout.tsx` keeps `force-dynamic`.

## Code style
- Next.js 15, TypeScript (target `es5`: use `BigInt(0)`, not `0n`), Tailwind CSS v4 with `@theme inline`.
- Biome: single quotes, no semicolons, 2-space indent, 120 columns.
- All API routes authenticate per route (`authenticateRequest` / `authorizeAddress` from `src/lib/auth.ts`); there is no middleware. Construct the Openfort Node client inside handlers so the build does not need secrets.
- Path alias `@/*` maps to `./src/*`.

## PR instructions
- Title format: `[agent-permissions] <summary>`.
- Run `pnpm verify` before committing.
- Document environment variable changes in `README.md`, `.env.example` and this file.
