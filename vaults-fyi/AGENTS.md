# AGENTS.md

## Project overview
- Openfort + vaults.fyi integration with a Vite React frontend.
- Lets a Shield-managed embedded wallet discover and deposit into yield vaults via the `@vaultsfyi/sdk`.

## Setup commands
- `pnpm i`
- `cp .env.example .env`
- `pnpm dev` (serves UI on `http://localhost:5173`)

## Environment
- `.env` defines `VITE_OPENFORT_PUBLISHABLE_KEY`, `VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY`, the vaults.fyi API key, and `VITE_BACKEND_URL`. Populate with real dashboard credentials — placeholders fail.

## Testing instructions
- `pnpm lint` / `pnpm check` (Biome)
- `pnpm build` (TypeScript + Vite build)
- Verify the app starts and vault data loads after setting env values.

## Code style
- Vite + TypeScript, **Biome** for lint/format (`pnpm lint` / `pnpm check`) — single quotes, no semicolons, 2-space, 120 col.
- Prefer functional React components and hooks; wallet state via wagmi + `@openfort/react`.
- Vault data comes from `@vaultsfyi/sdk`.

## Upgrade notes (June 2026)
- Migrated from ESLint to **Biome** (`biome.json` with `files.includes` + `css.parser.tailwindDirectives`) and runs on **Vite 8**.
- Keep `wagmi` on `^2` / `@wagmi/connectors` on `^5` — `@openfort/react` peer-caps wagmi at 2.x. Tailwind stays on v3.

## PR instructions
- Title format: `[vaults-fyi] <summary>`.
- Run `pnpm lint` and `pnpm build` before requesting review.
- Reflect new env requirements or vault constants in `vaults-fyi/README.md`.
