# AGENTS.md

## Project overview
- Openfort + NEAR Intents integration with a Next.js 15 frontend using App Router.
- Demonstrates cross-chain swaps where a Shield-managed embedded wallet deposits to a 1Click deposit address and solvers settle the swap on the destination chain.
- No NEAR account or NEAR-native signature is required — the only on-chain action is a standard EVM transfer.

## Setup commands
- `pnpm install`
- Create `.env.local` with the variables listed below (see `.env.example` for a template)
- `pnpm dev` – starts on `http://localhost:3000`

## Environment
- Public (browser) vars are prefixed with `NEXT_PUBLIC_`: `NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY`, `NEXT_PUBLIC_OPENFORT_SHIELD_PUBLISHABLE_KEY`, `NEXT_PUBLIC_OPENFORT_FEE_SPONSORSHIP_ID` (optional), `NEXT_PUBLIC_OPENFORT_DEFAULT_CHAIN_ID`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (optional).
- Auth is limited to email + external wallet (`authProviders: [EMAIL_OTP, WALLET]`). The WALLET provider only renders when `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set; otherwise Openfort drops it and shows email-only.
- Server-only vars (no `NEXT_PUBLIC_` prefix): `ONECLICK_JWT` (optional 1Click JWT) and `ONECLICK_BASE_URL` (optional override). The JWT must never reach the browser — it is used only inside the `/api` route handlers.
- Populate Openfort values with real credentials from the dashboard — placeholders will fail.
- Without `ONECLICK_JWT` the public 1Click endpoints still work but apply a 0.2% fee and lower rate limits.

## Testing instructions
- `pnpm build` – verify production build succeeds.
- `pnpm lint` – ESLint must pass.
- NEAR Intents has **no testnet**. Manual validation uses small mainnet amounts (e.g. a few USDC). Test: authentication, quote fetch, deposit signing, chain switching, and status polling through to `SUCCESS`/`REFUNDED`.

## Project structure
```
src/
├── app/
│   ├── api/          # Route handlers proxying 1Click (tokens, quote, status, deposit)
│   └── ...           # App Router (layout, page, providers, globals.css)
├── components/       # Shared UI components (header, footer, mode-toggle, ui/)
├── features/
│   ├── near-intents/ # Swap feature (components, hooks, services, constants, types, utils)
│   └── openfort/     # Openfort wallet integration (components, config, hooks, providers)
└── lib/              # Shared utilities
```

## Architecture notes
- The 1Click API is only reached from server-side route handlers in `src/app/api/*`. The JWT lives in `services/oneclick-server.ts`.
- The browser talks only to those `/api` routes via `services/oneclick-client.ts`.
- `utils/asset-helpers.ts` filters the 1Click token list down to the supported EVM chains and maps `blockchain` → chain id.
- Quote requests are `EXACT_INPUT` with `depositType: ORIGIN_CHAIN` and `recipientType: DESTINATION_CHAIN`.

## Code style
- Next.js 15 with App Router and TypeScript; Tailwind CSS v4 via `@tailwindcss/postcss`.
- A legacy `tailwind.config.js` (v3 format) exists alongside the v4 setup; theme tokens are defined in `globals.css` using `@theme inline`.
- Prefer functional React components and hooks; wagmi hooks for on-chain actions, plain `fetch` for the 1Click proxy.
- ESLint with `next/core-web-vitals` and `next/typescript` configs; enforces `import type` syntax.

## PR instructions
- Title format: `[near-intents] <summary>`.
- Ensure production build and lint pass, and test a real small-amount swap before requesting review.
- Document new env vars or supported chains in `near-intents/README.md` and here.
