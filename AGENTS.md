# AGENTS.md

## Project overview
- Collection of Openfort integration samples (`7702`, `aave`, `agent-permissions`, `hyperliquid`, `lifi`, `morpho`, `mpp`, `near-intents`, `usdc`, `vaults-fyi`, `x402`).
- Each subdirectory has its own `AGENTS.md` with detailed setup instructions; start at the sample you are modifying.

## Setup commands
- `node -v` → ensure Node 18+.
- `cd <sample>` and run the install/start commands listed in that sample's `AGENTS.md`.
- Use `rg --files -g 'AGENTS.md'` to locate nested agent guides.

## Testing instructions
- Follow the sample-specific sections for lint or manual checks.
- For web + backend samples, run the frontend lint target and hit backend health routes manually.

## Code style
- Frontend web apps use Vite + TypeScript or Next.js + TypeScript; keep hooks functional and avoid new global state.
- Linting/formatting is standardizing on **Biome** (single quotes, no semicolons, 2-space, 120 col): `7702`, `agent-permissions`, `mpp`, `x402` (frontend), and the Vite samples `aave`, `morpho`, `vaults-fyi`. `lifi` and `near-intents` still use `next lint` (ESLint).
- React Native apps (`usdc`, `hyperliquid`) follow Expo Router conventions, functional components, and pnpm.
- Backend services are Express with Node 18; keep async handlers tidy and leverage existing logging patterns.
- **Shared theme:** web recipes track the [demo-dashboard](https://github.com/openfort-xyz/demo-directory/tree/main/demo-dashboard) look — **Geist** font, **neutral shadcn** palette (light `#171717` / dark `#e5e5e5` primary), `0.625rem` radius, light+dark. Keep new recipes on these tokens; use the brand color as an accent, not the global primary. The shadcn recipes (`7702`, `lifi`, `near-intents`) share the dashboard's exact `:root`/`.dark` token block.

## Dependency constraints (read before bumping anything)
These are non-obvious and will break samples if ignored:
- **Do not bump `wagmi` to 3.x or `@wagmi/connectors` to 8.x.** `@openfort/react` peer-requires `wagmi: 2.x` / `viem: 2.x`; use the latest 2.x (`wagmi@^2.19`, `@wagmi/connectors@^5.11`). Keep `viem` on `^2.x`.
- **`@openfort/react` provider needs a publishable key at render time.** In Next.js samples, the App Router will throw during static prerender without it — every Next sample sets `export const dynamic = 'force-dynamic'` in `app/layout.tsx`. Its `walletConfig` nests `accountType` / `ethereumFeeSponsorshipId` under `ethereum: { … }`. The React Native SDK config key is `feeSponsorshipId` (not `ethereumProviderPolicyId`).
- **Next.js stays on 15 for the wallet samples.** Next 16 forces Turbopack and rejects the webpack walletconnect shims (`pino-pretty` external, `@react-native-async-storage/async-storage: false`). Only `mpp` (no wagmi/walletconnect) runs on Next 16.
- **Biome 2.4 config:** use `files.includes` with `!!` excludes (not the deprecated `experimentalScannerIgnores`) and enable `css.parser.tailwindDirectives: true` so `@apply`/`@theme` parse.
- React Native samples target **Expo SDK 56 / RN 0.85**; always realign the matrix with `pnpm expo install --fix` rather than hand-editing `expo-*` versions.

## PR instructions
- Title format: `[sample-name] <summary>` (for example, `[aave] Update Shield policy ID`).
- Document environment variable changes in the relevant `README.md` and `AGENTS.md`.
- Verify lint/test steps for the touched sample before requesting review.
