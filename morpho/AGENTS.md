# AGENTS.md

## Project overview
- Openfort + Morpho integration using Vite React frontend.
- Demonstrates Morpho Blue vault supply and withdrawal flows with Shield-managed embedded wallets and WalletConnect support.
- Uses external backend (openfort-backend-quickstart) for Shield authentication.

## Setup commands
- `pnpm i`
- `cp .env.example .env`
- `pnpm dev`

## Environment
- `.env` needs `VITE_OPENFORT_PUBLISHABLE_KEY`, `VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY`, `VITE_BACKEND_URL`, and optionally `VITE_OPENFORT_POLICY_ID` and `VITE_WALLET_CONNECT_PROJECT_ID`.
- Backend uses external [openfort-backend-quickstart](https://github.com/openfort-xyz/openfort-backend-quickstart) which requires `OPENFORT_API_KEY` and `OPENFORT_SHIELD_SECRET_KEY`.
- Update env files when rotating Shield credentials or changing Morpho vault addresses.

## Testing instructions
- `pnpm lint`
- Manually validate supply, withdraw, balance display, and vault APY flows after changing API or fee sponsorship settings.
- Ensure the external backend is running with populated Shield credentials prior to UI testing.

## Code style
- Vite + TypeScript, **Biome** for lint/format (`pnpm lint` / `pnpm check`); follow existing Tailwind + hooks patterns.
- Keep components focused and hooks reusable.

## Upgrade notes (June 2026)
- Migrated from ESLint to **Biome** (config in `biome.json`, `files.includes` + `css.parser.tailwindDirectives`) and runs on **Vite 8**.
- Keep `wagmi` on `^2` / `@wagmi/connectors` on `^5` — `@openfort/react` peer-caps wagmi at 2.x. Tailwind stays on v3.

## PR instructions
- Title format: `[morpho] <summary>`.
- Ensure lint passes before requesting review.
- Reflect any new env requirements or vault constants in `morpho/README.md`.
