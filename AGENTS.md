# AGENTS.md

## Project overview
- Collection of Openfort integration samples (`7702`, `aave`, `hyperliquid`, `lifi`, `lighter`, `morpho`, `mpp`, `near-intents`, `private-payments`, `telegram-bot`, `vaults-fyi`, `x402`, `yield-xyz`, `zama-confidential-yield`).
- Each subdirectory has its own `AGENTS.md`; start at the sample you are modifying.
- The recipe code is the source of truth. The docs pages at `openfort.io/docs/recipes/*` are checked against each recipe's `.env.example` and file paths, and they link to each recipe's `AGENTS.md` for the "add it to your app" steps.

## Recipe contract
Every recipe must have:
- **`.env.example`** listing every variable the code reads, each with a one-line comment (where to get it, required or optional). Use the shared names: `*_OPENFORT_PUBLISHABLE_KEY`, `*_OPENFORT_SHIELD_PUBLISHABLE_KEY`, `*_OPENFORT_FEE_SPONSORSHIP_ID`, `OPENFORT_SECRET_KEY`, `OPENFORT_WALLET_SECRET`.
- **A `verify` script** in every `package.json` (lint + typecheck/build, plus tests where they exist). CI runs `pnpm install && pnpm verify` for each package on every PR (`.github/workflows/verify.yml`).
- **`AGENTS.md`** with these sections, in this order:
  1. `## Project overview`: what it does, which chain, testnet or mainnet.
  2. `## Setup commands`, `## Environment`, `## Testing instructions`.
  3. `## Add this to your app`: instructions for a coding agent working in someone else's existing app, not in this repo. List the dashboard setup, the exact packages and versions to install, and the files that carry the integration (path and what each does, usually 3-5). Give the integration steps in order and say how to check it works. Assume the reader copies code, not the whole recipe.
  4. `## Openfort primitives`: table with columns `Primitive | Where in code | Dashboard setup | Docs`. List every Openfort SDK hook, API call and dashboard object the recipe relies on (for example `useEmailOtpAuth`, `openfort.accounts.evm.backend.create`, a fee sponsorship policy, Shield automatic recovery).
  5. `## Failure modes`: table with columns `Error | Cause | Fix`. Quote error messages exactly as they appear, so an agent can match them. Only list failures that have actually been seen.
  6. Recipe-specific notes (upgrade notes, integration notes), then `## Code style` and `## PR instructions`.

## Setup commands
- `node -v` → ensure Node 22+.
- `cd <sample>` and run the install/start commands listed in that sample's `AGENTS.md`.
- Use `rg --files -g 'AGENTS.md'` to locate nested agent guides.

## Testing instructions
- `pnpm verify` in each package you touched (CI runs it for all of them).
- Runtime flows (login, signing, sponsored transactions) need real keys and are verified manually; record the date and what was checked in the recipe's `AGENTS.md`.

## Code style
- Frontend web apps use Vite + TypeScript or Next.js + TypeScript; keep hooks functional and avoid new global state.
- Linting/formatting is standardizing on **Biome** (single quotes, no semicolons, 2-space, 120 col): `7702`, `mpp`, `x402` (frontend), and the Vite samples `aave`, `morpho`, `vaults-fyi`. `lifi` and `near-intents` still use `next lint` (ESLint).
- React Native apps (`hyperliquid`, `lighter`) follow Expo Router conventions, functional components, and pnpm.
- Backend services are Express with Node 18; keep async handlers tidy and leverage existing logging patterns.
- **Shared theme:** web recipes track the [demo-dashboard](https://github.com/openfort-xyz/demo-directory/tree/main/demo-dashboard) look — **Geist** font, **neutral shadcn** palette (light `#171717` / dark `#e5e5e5` primary), `0.625rem` radius, light+dark. Keep new recipes on these tokens; use the brand color as an accent, not the global primary. The shadcn recipes (`7702`, `lifi`, `near-intents`) share the dashboard's exact `:root`/`.dark` token block.

## Dependency constraints (read before bumping anything)
These are non-obvious and will break samples if ignored:
- **Match the `wagmi` major to the `@openfort/react` version.** All web samples that use `@openfort/react` (`7702`, `aave`, `lifi`, `morpho`, `near-intents`, `vaults-fyi`, `x402`) run the latest published `@openfort/react` (pinned exactly, same version in every recipe) + `wagmi@^3`; keep `viem` on `^2.x`.
- **wagmi 3 gotchas (already applied):** (1) `@wagmi/connectors@8` pulls optional connector peers loaded via a guarded `import('accounts').catch()`; webpack (Next.js) hard-fails resolving them at build, so the Next samples stub `accounts` / `porto` / `@base-org/account` / `@metamask/connect-evm` to `false` in `next.config` (`resolve.fallback` or `resolve.alias`). Vite tolerates them without config. (2) `useBalance` is native-only in wagmi 3 (no `token` option) and its `data` has no `.formatted` — fetch ERC-20 balances with `useReadContract`(`balanceOf`) and format with `formatUnits(data, decimals)`; `useBalance` native data is `{ value, decimals, symbol }`.
- **`@openfort/react` provider needs a publishable key at render time.** In Next.js samples, the App Router will throw during static prerender without it — every Next sample sets `export const dynamic = 'force-dynamic'` in `app/layout.tsx`. Its `walletConfig` nests `accountType` / `ethereumFeeSponsorshipId` under `ethereum: { … }`. The React Native SDK config key is `feeSponsorshipId` (not `ethereumProviderPolicyId`).
- **Next.js stays on 15 for the wallet samples.** Next 16 forces Turbopack and rejects the webpack walletconnect shims (`pino-pretty` external, `@react-native-async-storage/async-storage: false`). Only `mpp` (no wagmi/walletconnect) runs on Next 16.
- **Biome 2.4 config:** use `files.includes` with `!!` excludes (not the deprecated `experimentalScannerIgnores`) and enable `css.parser.tailwindDirectives: true` so `@apply`/`@theme` parse.
- React Native samples use the latest published `@openfort/react-native` (pinned exactly, same version in every recipe): Hyperliquid and Lighter target **Expo 57 / RN 0.86**. Realign each matrix with `pnpm expo install --fix` rather than hand-editing `expo-*` versions.

## PR instructions
- Title format: `[sample-name] <summary>` (for example, `[aave] Update Shield policy ID`).
- Document environment variable changes in the relevant `README.md` and `AGENTS.md`.
- Verify lint/test steps for the touched sample before requesting review.
