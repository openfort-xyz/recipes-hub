# AGENTS.md

## Project overview
- Openfort + NEAR Intents integration with a Next.js 15 (App Router) frontend.
- Cross-chain swaps where an Openfort embedded wallet (or an external wallet signed in through Openfort) deposits to a 1Click deposit address and solvers settle the swap on the destination chain.
- No NEAR account or NEAR-native signature is required: the only on-chain action is a standard EVM transfer (native send or ERC-20 `transfer`).
- **Mainnet only.** NEAR Intents has no testnet. Origin chains: Base, Arbitrum, Optimism, Polygon, Ethereum, Avalanche.

## Setup commands
- `pnpm install`
- `cp .env.example .env.local` and fill in the values
- `pnpm dev` starts on `http://localhost:3000`

## Environment
Every variable is listed in `.env.example` with a comment.

| Variable | Required | Read in |
| --- | --- | --- |
| `NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY` | yes | `src/features/openfort/providers/openfort-provider-boundary.tsx` |
| `NEXT_PUBLIC_OPENFORT_SHIELD_PUBLISHABLE_KEY` | yes | `src/features/openfort/providers/openfort-provider-boundary.tsx` |
| `NEXT_PUBLIC_OPENFORT_FEE_SPONSORSHIP_ID` | no | `src/features/openfort/providers/openfort-provider-boundary.tsx` (applied to the default chain only) |
| `NEXT_PUBLIC_OPENFORT_DEFAULT_CHAIN_ID` | no, default `8453` | `src/features/openfort/providers/openfort-provider-boundary.tsx` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | no | `src/features/openfort/config/wagmi-config.ts` |
| `ONECLICK_JWT` | no (yes for confidential swaps) | `src/features/near-intents/services/oneclick-server.ts` (server only) |
| `ONECLICK_BASE_URL` | no | `src/features/near-intents/services/oneclick-server.ts` (server only) |
| `NEXT_PUBLIC_CONFIDENTIAL_ENABLED` | no | `src/features/near-intents/constants/index.ts` |

- Auth is email + external wallet (`authProviders: [EMAIL_OTP, WALLET]`). The WALLET provider only renders when `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set; otherwise Openfort drops it and shows email only.
- `ONECLICK_JWT` must never reach the browser; it is used only inside the `/api` route handlers. Without it the public 1Click endpoints still work but apply a 0.2% fee and lower rate limits.

## Testing instructions
- `pnpm verify` runs `eslint src` and `next build` (type check included). It must finish with no errors and no warnings.
- Not covered by `verify`: everything at runtime. NEAR Intents has no testnet, so manual validation uses small mainnet amounts (a few USDC). Test sign-in (email and external wallet), the "Fund your wallet" link opening the Openfort Deposit hub, quote fetch, deposit signing, chain switching, and status polling through to `SUCCESS`/`REFUNDED`.
- Last runtime check: none since the move to `@openfort/react` 2.1.3 (2026-09-23); only `verify` was run.
- 2026-09-25: `pnpm install` (pnpm 10.30.3, Node 22), `pnpm audit --audit-level=moderate` clean (1 low, the ignored elliptic CVE-2025-14505), `pnpm verify` passed with no warnings. No `test` script exists. No runtime check.

## Add this to your app
For a coding agent adding Openfort wallets + NEAR Intents swaps to an existing Next.js app.

**Dashboard setup** ([dashboard.openfort.io](https://dashboard.openfort.io))
1. Create a project and copy the publishable key and the Shield publishable key from **API keys**.
2. Enable email OTP and external wallet auth.
3. Optional: create a fee sponsorship policy on the chain users deposit from and copy its ID (`pol_...`).

Outside Openfort: optionally a WalletConnect project ID (cloud.reown.com) for external-wallet sign-in, and a 1Click JWT (partners.near-intents.org).

**Install** (exact versions this recipe runs)
```sh
pnpm add @openfort/react@2.1.3 @solana/kit@6.10.0 @solana/kora@0.2.1 @solana-program/token@0.12.0 @solana-program/compute-budget@0.13.0 wagmi@^3.6.20 viem@^2.52.2 @tanstack/react-query@^5.101.1 @walletconnect/ethereum-provider@2.23.10
```
The Solana packages are needed even though the swap is EVM-only (see Failure modes).

**Files that carry the integration**
| File | Role |
| --- | --- |
| `src/features/openfort/config/wagmi-config.ts` | wagmi config: `embeddedWalletConnector()`, `injected()`, optional `walletConnect()`, mainnet chains |
| `src/features/openfort/providers/openfort-provider-boundary.tsx` | `OpenfortProvider` with Shield key, `ethereum.ethereumFeeSponsorshipId`, auth providers and passkey recovery |
| `src/features/near-intents/services/oneclick-server.ts` | server-only 1Click client (tokens, quote, status, deposit submit) that injects the JWT |
| `src/app/api/{tokens,quote,status,deposit}/route.ts` | route handlers the browser calls instead of 1Click |
| `src/features/near-intents/hooks/use-swap-controller.ts` | quote, switch chain, send the deposit with wagmi `sendTransaction`/`writeContract`, poll status |

**Steps**
1. Add `embeddedWalletConnector()` to your wagmi connectors and wrap the app in `QueryClientProvider` > `WagmiProvider` > `OpenfortWagmiBridge` > `OpenfortProvider` (see `src/app/providers.tsx`). Set `export const dynamic = "force-dynamic"` in `app/layout.tsx`.
2. Copy `oneclick-server.ts` and the four `/api` route handlers; set `ONECLICK_JWT` server-side.
3. Request a quote with `swapType: EXACT_INPUT`, `depositType: ORIGIN_CHAIN`, `recipientType: DESTINATION_CHAIN`, `refundTo` = the connected wallet address. The response has `quote.depositAddress`.
4. Switch to the origin chain and transfer `quote.amountIn` of the origin asset to the deposit address from the connected wagmi account.
5. POST the tx hash to `/api/deposit` (optional, speeds detection) and poll `/api/status` until `SUCCESS`, `REFUNDED` or `FAILED`.
6. Render `<OpenfortButton />` for sign-in and the wallet panel; call `useUI().openFunding()` to let users top up.
7. Next.js + wagmi 3: alias the optional connector peers to `false` in `next.config` webpack (see `next.config.ts`). Stay on Next 15 (see root `AGENTS.md`).

**Check it works**: sign in, get a quote for a small amount (for example 1 USDC on Base to another chain), confirm the deposit, and watch the status reach `SUCCESS`.

## Openfort primitives
| Primitive | Where in code | Dashboard setup | Docs |
| --- | --- | --- | --- |
| `OpenfortProvider` (`publishableKey`, `walletConfig`, `uiConfig`) | `src/features/openfort/providers/openfort-provider-boundary.tsx` | Publishable key | [React wallet configuration](https://www.openfort.io/docs/products/embedded-wallet/react/wallet) |
| `walletConfig.shieldPublishableKey` | same | Shield publishable key | [API keys](https://www.openfort.io/docs/configuration/api-keys) |
| `walletConfig.ethereum.ethereumFeeSponsorshipId` | same | Fee sponsorship policy | [Ethereum wallet configuration](https://www.openfort.io/docs/products/embedded-wallet/react/wallet/ethereum), [Gas sponsorship](https://www.openfort.io/docs/configuration/gas-sponsorship) |
| `uiConfig.authProviders` (`EMAIL_OTP`, `WALLET`) | same | Enable providers | [UI configuration](https://www.openfort.io/docs/products/embedded-wallet/react/ui/configuration), [Wallet auth](https://www.openfort.io/docs/configuration/wallet-auth) |
| `uiConfig.walletRecovery.defaultMethod: RecoveryMethod.PASSKEY` | same | none | [Recovery methods](https://www.openfort.io/docs/configuration/recovery-methods) |
| `OpenfortButton` | `src/components/header.tsx`, `src/features/near-intents/components/SwapFlow.tsx` | none | [Openfort UI](https://www.openfort.io/docs/products/embedded-wallet/react/ui) |
| `useUI().openFunding` (Deposit hub) | `src/features/near-intents/components/SwapForm.tsx` | see Funding docs (not runtime-verified here) | [useUI](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useUI), [Funding](https://www.openfort.io/docs/configuration/funding) |
| `embeddedWalletConnector`, `OpenfortWagmiBridge` (`@openfort/react/wagmi`) | `src/features/openfort/config/wagmi-config.ts`, `src/app/providers.tsx` | none | [Ethereum wallet configuration](https://www.openfort.io/docs/products/embedded-wallet/react/wallet/ethereum) |
| `useUser` | `src/features/openfort/hooks/use-openfort-wallet.ts` | none | [useUser](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useUser) |
| `useEthereumEmbeddedWallet` | `src/features/openfort/hooks/use-openfort-wallet.ts` | none | [useEthereumEmbeddedWallet](https://www.openfort.io/docs/products/embedded-wallet/react/hooks/useEthereumEmbeddedWallet) |

## Failure modes
| Error | Cause | Fix |
| --- | --- | --- |
| `1Click 401: User authentication is required for confidential intent quotes` | Private (confidential) quote requested without `ONECLICK_JWT`. The UI maps it to "Confidential swaps aren't enabled for this 1Click key yet…" | Set a confidential-enabled `ONECLICK_JWT`, or leave `NEXT_PUBLIC_CONFIDENTIAL_ENABLED` unset |
| `property <name> should not exist` (from `/v0/quote`) | 1Click validates quote bodies against a strict field whitelist | Send only documented quote fields |
| `Module not found: Can't resolve '@solana/kora'` (`next build` error, import trace through `@openfort/react/build/components/Pages/SendConfirmation/SolanaSendConfirmation.js`) | The Solana optional peers of `@openfort/react` are not installed; `OpenfortProvider` imports the Solana pages statically | Install `@solana/kit`, `@solana/kora`, `@solana-program/token` and `@solana-program/compute-budget` (versions in `package.json`) |
| `Module not found: Can't resolve '@coinbase/wallet-sdk'` (also `'@safe-global/safe-apps-sdk'`, `'@safe-global/safe-apps-provider'`) as `next build` warnings | `wagmi/connectors` barrel references optional connector peers that are not installed | Alias each to `false` in `next.config.ts` webpack `resolve.alias` (already done) |

## Project structure
```
src/
├── app/
│   ├── api/          # Route handlers proxying 1Click (tokens, quote, status, deposit)
│   └── ...           # App Router (layout, page, providers, globals.css)
├── components/       # Shared UI components (header, footer, mode-toggle, ui/)
├── features/
│   ├── near-intents/ # Swap feature (components, hooks, services, constants, types, utils)
│   └── openfort/     # Openfort wallet integration (config, hooks, providers, logo)
└── lib/              # Shared utilities
```

## Architecture notes
- The 1Click API is only reached from server-side route handlers in `src/app/api/*`. The JWT lives in `services/oneclick-server.ts`.
- The browser talks only to those `/api` routes via `services/oneclick-client.ts`.
- `utils/asset-helpers.ts` filters the 1Click token list down to the supported EVM chains and maps `blockchain` → chain id.
- Quote requests are `EXACT_INPUT` with `depositType: ORIGIN_CHAIN` and `recipientType: DESTINATION_CHAIN`.
- Connection state comes from the wagmi account (`useAccount().status`), not the embedded-wallet status, because external wallets signed in through Openfort never report as an embedded wallet.
- Confidential swaps add `confidentiality: "basic"` to the quote; the deposit flow is unchanged.

## Upgrade notes (@openfort/react 2.1.3)
- 2.0.1 to 2.1.3 has no breaking API changes for this recipe. The provider key stays `walletConfig.ethereum.ethereumFeeSponsorshipId`.
- The recipe's own wallet UI is gone: the header and sign-in card render the SDK's `OpenfortButton` (address, copy, send, deposit, sign out), and "Fund your wallet" opens the SDK's Deposit hub with `useUI().openFunding()` instead of a hand-rolled dialog of third-party links.
- The fee sponsorship fallback chain is Base (`8453`), matching `.env.example`; it was Sepolia, which this mainnet-only recipe never uses.

## Code style
- Next.js 15 with App Router and TypeScript; Tailwind CSS v4 via `@tailwindcss/postcss`.
- A legacy `tailwind.config.js` (v3 format) exists alongside the v4 setup; theme tokens are defined in `globals.css` using `@theme inline`.
- Prefer functional React components and hooks; wagmi hooks for on-chain actions, plain `fetch` for the 1Click proxy.
- ESLint with `next/core-web-vitals` and `next/typescript` configs; enforces `import type` syntax.

## PR instructions
- Title format: `[near-intents] <summary>`.
- `pnpm verify` must pass; test a real small-amount swap before requesting review.
- Document new env vars or supported chains in `near-intents/README.md` and here.
