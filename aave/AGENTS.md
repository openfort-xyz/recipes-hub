# AGENTS.md

## Project overview
- Openfort + Aave integration with a Vite React frontend.
- Uses Shield to manage embedded wallets and sponsored lending transactions.
- Requires external backend (openfort-backend-quickstart) for Shield authentication sessions.

## Setup commands
- `pnpm i`
- `cp .env.example .env`
- `pnpm dev` (serves UI on `http://localhost:5173`)
- Backend: Clone and run [openfort-backend-quickstart](https://github.com/openfort-xyz/openfort-backend-quickstart) on `http://localhost:3001`

## Environment
- Frontend `.env` must define `VITE_OPENFORT_PUBLISHABLE_KEY`, `VITE_OPENFORT_SHIELD_PUBLIC_KEY`, `VITE_OPENFORT_POLICY_ID` (optional), and `VITE_BACKEND_URL`.
- Backend (external) `.env` must define `OPENFORT_SECRET_KEY` from Openfort dashboard.
- Populate both files with real Openfort credentials from the dashboard—placeholder values will fail.

## Testing instructions
- `pnpm lint` (TypeScript + ESLint checks)
- `pnpm build` (TypeScript compilation + Vite build)
- Verify frontend starts without runtime errors after updating environment values.

## Code style
- Follows Vite + TypeScript defaults with ESLint (`pnpm lint`).
- Prefer functional React components and hooks; keep wallet state in React Query where possible.
- Uses `@aave/react` SDK for Aave protocol interactions.

## PR instructions
- Title format: `[aave] <summary>`.
- Run `pnpm lint` and `pnpm build` before requesting review.
- Document new env vars or contract addresses in `aave/README.md` when they change.
