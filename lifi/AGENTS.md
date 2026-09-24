# AGENTS.md

## Project overview
- Openfort + LI.FI integration with a Next.js 15 (App Router) frontend.
- Users sign in with Openfort (email OTP, Google or an external wallet), get an Openfort embedded wallet with passkey recovery, and bridge/swap tokens across chains with LI.FI routing. Transactions are signed by the embedded wallet through wagmi.
- Chains: testnets by default (Sepolia, Polygon Amoy, Arbitrum Sepolia, Optimism Sepolia, Base Sepolia). Setting a mainnet default chain ID switches to Ethereum, Polygon, Arbitrum, Optimism, Base and Avalanche. LI.FI route coverage on testnets is limited; real routes need mainnet.

## Setup commands
- `pnpm install`
- `cp .env.example .env.local` and fill in the values
- `pnpm dev` starts on `http://localhost:3000`

## Environment
Every variable is listed in `.env.example` with a comment. All are `NEXT_PUBLIC_` because they are read in the browser.

| Variable | Required | Read in |
| --- | --- | --- |
| `NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY` | yes | `src/features/openfort/providers/openfort-provider-boundary.tsx` |
| `NEXT_PUBLIC_OPENFORT_SHIELD_PUBLISHABLE_KEY` | yes | `src/features/openfort/providers/openfort-provider-boundary.tsx` |
| `NEXT_PUBLIC_OPENFORT_FEE_SPONSORSHIP_ID` | no | `src/features/openfort/providers/openfort-provider-boundary.tsx` (applied to the default chain only) |
| `NEXT_PUBLIC_OPENFORT_DEFAULT_CHAIN_ID` | no, default `11155111` | provider boundary and `src/features/openfort/config/wagmi-config.ts` |
| `NEXT_PUBLIC_LIFI_API_KEY` | no | `src/features/lifi/services/lifi-config.ts` |
| `NEXT_PUBLIC_LIFI_INTEGRATOR` | no, default `OpenfortRecipe` | `src/features/lifi/services/lifi-config.ts` |

## Testing instructions
- `pnpm verify` runs `eslint src` and `next build` (type check included). It must finish with no errors and no warnings.
- Not covered by `verify`, test manually with real keys: sign-in, wallet creation and passkey recovery, route discovery, swap execution, execution tracking, and resume/stop.
- Last runtime check: none since the move to `@openfort/react` 2.1.3 (2026-09-23); only `verify` was run.

## Add this to your app
For a coding agent adding Openfort embedded wallets + LI.FI swaps to an existing React/Next.js app that already uses (or can add) wagmi.

**Dashboard setup** ([dashboard.openfort.io](https://dashboard.openfort.io))
1. Create a project and copy the publishable key and the Shield publishable key from **API keys**.
2. Enable the auth providers you want (this recipe uses email OTP, Google and external wallet).
3. Optional: create a fee sponsorship policy for the chain users transact on and copy its ID (`pol_...`).

**Install** (exact versions this recipe runs)
```sh
pnpm add @openfort/react@2.1.3 @solana/kit@6.10.0 @solana/kora@0.2.1 @solana-program/token@0.12.0 @solana-program/compute-budget@0.13.0 wagmi@^3.6.20 viem@^2.52.2 @tanstack/react-query@^5.101.1 @lifi/sdk@^4.0.0 @lifi/sdk-provider-ethereum@^4.0.0
```

**Files that carry the integration**
| File | Role |
| --- | --- |
| `src/features/openfort/config/wagmi-config.ts` | wagmi config with `embeddedWalletConnector()` from `@openfort/react/wagmi` and the chain list |
| `src/features/openfort/providers/openfort-provider-boundary.tsx` | `OpenfortProvider` with `walletConfig` (Shield key, `ethereum.ethereumFeeSponsorshipId`) and `uiConfig` (auth providers, passkey recovery) |
| `src/app/providers.tsx` | provider order: `QueryClientProvider` > `WagmiProvider` > `OpenfortWagmiBridge` > `OpenfortProvider` > `LiFiProvider` |
| `src/features/lifi/services/lifi-config.ts` | LI.FI v4 `createClient` with an `EthereumProvider` whose `getWalletClient`/`switchChain` use wagmi actions, so LI.FI signs with the Openfort wallet |
| `src/features/lifi/services/routes.ts` | `getRoutes` / `executeRoute` / `resumeRoute` wrappers |

**Steps**
1. Add `embeddedWalletConnector()` to your wagmi `createConfig` connectors.
2. Wrap the app as in `src/app/providers.tsx`. In Next.js, mark the providers file `"use client"` and set `export const dynamic = "force-dynamic"` in `app/layout.tsx` (the provider needs the publishable key at render time).
3. Pass `walletConfig={{ shieldPublishableKey, ethereum: { ethereumFeeSponsorshipId: { [chainId]: "pol_..." } } }}` to `OpenfortProvider`.
4. Render `<OpenfortButton />` for sign-in and the wallet panel (address, copy, send, deposit, sign out).
5. Create the LI.FI client once after wagmi is ready (`initializeLiFiConfig(wagmiConfig)`), then call `getRoutes(client, { fromAddress, toAddress, ... })` with the connected wagmi address and `executeRoute(client, route, { updateRouteHook })`.
6. Next.js + wagmi 3: alias the optional connector peers to `false` in `next.config` webpack (see `next.config.ts`). Stay on Next 15 (see root `AGENTS.md`).

**Check it works**: sign in through `OpenfortButton`, confirm `useAccount()` returns the embedded wallet address, fetch routes, execute one, and see the transaction hash in `ExecutionDisplay`.

## Openfort primitives
| Primitive | Where in code | Dashboard setup | Docs |
| --- | --- | --- | --- |
| `OpenfortProvider` (`publishableKey`, `walletConfig`, `uiConfig`) | `src/features/openfort/providers/openfort-provider-boundary.tsx` | Publishable key | [React wallet configuration](https://www.openfort.io/docs/products/embedded-wallet/react/wallet) |
| `walletConfig.shieldPublishableKey` | same | Shield publishable key | [API keys](https://www.openfort.io/docs/configuration/api-keys) |
| `walletConfig.ethereum.ethereumFeeSponsorshipId` | same | Fee sponsorship policy | [Ethereum wallet configuration](https://www.openfort.io/docs/products/embedded-wallet/react/wallet/ethereum), [Gas sponsorship](https://www.openfort.io/docs/configuration/gas-sponsorship) |
| `uiConfig.authProviders` (`EMAIL_OTP`, `GOOGLE`, `WALLET`) | same | Enable providers; Google needs social login setup | [UI configuration](https://www.openfort.io/docs/products/embedded-wallet/react/ui/configuration), [Social login](https://www.openfort.io/docs/configuration/social-login), [Wallet auth](https://www.openfort.io/docs/configuration/wallet-auth) |
| `uiConfig.walletRecovery.defaultMethod: RecoveryMethod.PASSKEY` | same | none | [Recovery methods](https://www.openfort.io/docs/configuration/recovery-methods) |
| `OpenfortButton` | `src/components/header.tsx` | none | [Openfort UI](https://www.openfort.io/docs/products/embedded-wallet/react/ui) |
| `embeddedWalletConnector`, `OpenfortWagmiBridge` (`@openfort/react/wagmi`) | `src/features/openfort/config/wagmi-config.ts`, `src/app/providers.tsx` | none | [Ethereum wallet configuration](https://www.openfort.io/docs/products/embedded-wallet/react/wallet/ethereum) |
| `useUser` | `src/features/openfort/hooks/use-openfort-wallet.ts`, `src/features/lifi/components/ActionButtons.tsx` | none | [useUser](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useUser) |
| `useEthereumEmbeddedWallet` | `src/features/openfort/hooks/use-openfort-wallet.ts`, `src/features/lifi/providers/lifi-provider.tsx`, `src/features/lifi/components/ActionButtons.tsx` | none | [useEthereumEmbeddedWallet](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useEthereumEmbeddedWallet) |

## Failure modes
| Error | Cause | Fix |
| --- | --- | --- |
| `Module not found: Can't resolve '@solana/kora'` (`next build` error, import trace through `@openfort/react/build/components/Pages/SendConfirmation/SolanaSendConfirmation.js`) | The Solana optional peers of `@openfort/react` are not installed; `OpenfortProvider` imports the Solana pages statically | Install `@solana/kit`, `@solana/kora`, `@solana-program/token` and `@solana-program/compute-budget` (versions in `package.json`) even in an EVM-only app |
| `Module not found: Can't resolve '@coinbase/wallet-sdk'` (also `'@safe-global/safe-apps-sdk'`, `'@safe-global/safe-apps-provider'`, `'@walletconnect/ethereum-provider'`) as `next build` warnings | `import { injected } from "wagmi/connectors"` pulls the `@wagmi/connectors@8` barrel, which references optional connector peers that are not installed | Alias each to `false` in `next.config.ts` webpack `resolve.alias` (already done) |

## Upgrade notes (@lifi/sdk v4)
- This sample uses the **v4 (headless) LI.FI SDK**. There is no `createConfig` and no bundled `EVM()` provider.
- The client is created with `createClient({ integrator, apiKey, providers: [EthereumProvider({ getWalletClient, switchChain })] })` from `@lifi/sdk` + the modular `@lifi/sdk-provider-ethereum`. It is created once in `features/lifi/services/lifi-config.ts` and shared via `getLiFiClient()`.
- **Every action takes the client first**: `getRoutes(client, …)`, `getChains(client)`, `getTokens(client, …)`, `executeRoute(client, route, opts)`, `resumeRoute(client, route)`. `getActiveRoutes()`, `stopRouteExecution(route)`, `updateRouteExecution(route, opts)` take no client.
- Execution progress moved from `step.execution.process[]` to `step.execution.actions[]` (`ExecutionAction`: `.type`/`.status`/`.txHash`/`.txLink`).
- `ExecutionOptions` dropped `switchChainHook` and `disableMessageSigning` (chain switching is now the provider's `switchChain`).
- `@lifi/wallet-management` is not used (it pulled `@mysten/dapp-kit`, which needed a Sui stub to build); the provider initializes the client and wagmi chains come from the static config.

## Upgrade notes (@openfort/react 2.1.3)
- 2.0.1 to 2.1.3 has no breaking API changes for this recipe. The provider key stays `walletConfig.ethereum.ethereumFeeSponsorshipId`.
- The Solana packages (`@solana/kit`, `@solana/kora`, `@solana-program/token`, `@solana-program/compute-budget`) stay installed even though this recipe is EVM-only: they are optional peers of `@openfort/react`, but `OpenfortProvider` statically imports the Solana send-confirmation page, so webpack fails without them.
- The header renders the SDK's `OpenfortButton` for both signed-out and signed-in states; the recipe no longer has its own connected-wallet UI.

## Project structure
```
src/
├── app/              # Next.js App Router (layout, page, providers, globals.css)
├── components/       # Shared UI components (header, footer, mode-toggle, ui/)
├── features/
│   ├── lifi/         # LI.FI swap feature (components, hooks, services, constants, types)
│   └── openfort/     # Openfort wallet integration (config, hooks, providers, logo)
└── lib/              # Shared utilities
```

## Code style
- Next.js 15 with App Router and TypeScript; Tailwind CSS v4 via `@tailwindcss/postcss`.
- A legacy `tailwind.config.js` (v3 format) exists alongside the v4 setup; theme tokens are defined in `globals.css` using `@theme inline`.
- Prefer functional React components and hooks; wagmi hooks for on-chain data, LI.FI SDK for routing and execution.
- ESLint with `next/core-web-vitals` and `next/typescript` configs; enforces `import type` syntax.
- Maintain clear separation between UI components, providers, and business logic.

## PR instructions
- Title format: `[lifi] <summary>`.
- `pnpm verify` must pass; test multi-chain swap flows before requesting review.
- Document new env vars, supported chains, or LI.FI configuration changes in `lifi/README.md` and here.
