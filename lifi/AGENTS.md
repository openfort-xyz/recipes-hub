# AGENTS.md

## Project overview
- Openfort + LiFi integration with a Next.js 15 frontend using App Router.
- Demonstrates cross-chain bridge and swap flows with Shield-managed embedded wallets and LiFi routing engine.

## Setup commands
- `pnpm install`
- Create `.env.local` with the variables listed below (see `.env.example` for a template)
- `pnpm dev` – starts on `http://localhost:3000`

## Environment
- `.env.local` needs `NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY`, `NEXT_PUBLIC_OPENFORT_SHIELD_PUBLISHABLE_KEY`, `NEXT_PUBLIC_OPENFORT_POLICY_ID`, `NEXT_PUBLIC_OPENFORT_DEFAULT_CHAIN_ID`, optional `NEXT_PUBLIC_LIFI_API_KEY`, and `NEXT_PUBLIC_LIFI_INTEGRATOR`.
- All environment variables must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser.
- Populate with real Openfort credentials and policy IDs from the dashboard—placeholder values will fail.
- LiFi API key is optional; omit to use public endpoints with rate limits.
- `NEXT_PUBLIC_LIFI_INTEGRATOR` should be set to "Recipe" or your integrator name.

## Testing instructions
- `pnpm build` – verify production build succeeds.
- Manually validate swap flows across different chain combinations (Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche).
- Test authentication, route discovery, execution tracking, and resume/stop controls.

## Project structure
```
src/
├── app/              # Next.js App Router (layout, page, providers, globals.css)
├── components/       # Shared UI components (header, footer, mode-toggle, ui/)
├── features/
│   ├── lifi/         # LiFi swap feature (components, hooks, services, constants, types)
│   └── openfort/     # Openfort wallet integration (components, config, hooks, providers)
└── lib/              # Shared utilities
```

## Code style
- Next.js 15 with App Router and TypeScript; Tailwind CSS v4 via `@tailwindcss/postcss`.
- A legacy `tailwind.config.js` (v3 format) exists alongside the v4 setup; theme tokens are defined in `globals.css` using `@theme inline`.
- Prefer functional React components and hooks; wagmi hooks for on-chain data, LiFi SDK for routing and execution.
- ESLint with `next/core-web-vitals` and `next/typescript` configs; enforces `import type` syntax.
- Maintain clear separation between UI components, providers, and business logic.

## PR instructions
- Title format: `[lifi] <summary>`.
- Ensure production build passes and test multi-chain swap flows before requesting review.
- Document new env vars, supported chains, or LiFi configuration changes in `lifi/README.md`.
